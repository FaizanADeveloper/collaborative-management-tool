const mongoose = require('mongoose');
const { getIO } = require('./index');
const { getBoardRoom } = require('./rooms');

const SOCKET_EVENTS = Object.freeze({
  CARD_CREATED: 'card:created',
  CARD_UPDATED: 'card:updated',
  CARD_DELETED: 'card:deleted',
  CARD_MOVED: 'card:moved',
  LIST_CREATED: 'list:created',
  LIST_UPDATED: 'list:updated',
  LIST_DELETED: 'list:deleted',
});

const ALLOWED_BOARD_EVENTS = new Set(Object.values(SOCKET_EVENTS));

/**
 * Normalizes a Mongoose ObjectId, string, or populated subdocument into a string ID.
 *
 * @param {*} value
 * @returns {string|null}
 */
const toIdString = (value) => {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'object') {
    if (value._id != null) return String(value._id);
    if (value.id != null) return String(value.id);
    if (typeof value.toHexString === 'function') return value.toHexString();
    if (typeof value.toString === 'function') {
      const str = value.toString();
      return str && str !== '[object Object]' ? str : null;
    }
  }
  return String(value);
};

const isValidObjectId = (value) =>
  typeof value === 'string' && mongoose.isObjectIdOrHexString(value);

const sanitizeAssignee = (assignee) => {
  if (!assignee) return null;
  if (typeof assignee === 'string') return assignee;
  if (typeof assignee === 'object' && (assignee._id || assignee.id)) {
    const id = toIdString(assignee);
    if (assignee.name !== undefined || assignee.email !== undefined) {
      return {
        id,
        name: assignee.name || '',
        email: assignee.email || '',
        avatar: assignee.avatar || '',
      };
    }
    return id;
  }
  return toIdString(assignee);
};

/**
 * Strips any internal Mongoose metadata or sensitive fields from card objects.
 *
 * @param {object} card
 * @returns {object|null}
 */
const sanitizeCardPayload = (card) => {
  if (!card || typeof card !== 'object') return null;
  const serialized = typeof card.toJSON === 'function' ? card.toJSON() : card;
  const id = toIdString(serialized.id || serialized._id);
  const list = toIdString(serialized.list);
  const board = toIdString(serialized.board);

  if (!id || !list || !board) return null;

  return {
    id,
    title: serialized.title || '',
    description: serialized.description || '',
    list,
    board,
    position: Number(serialized.position) || 0,
    priority: serialized.priority || 'medium',
    assignees: Array.isArray(serialized.assignees)
      ? serialized.assignees.map(sanitizeAssignee).filter(Boolean)
      : [],
    dueDate: serialized.dueDate || null,
    labels: Array.isArray(serialized.labels) ? [...serialized.labels] : [],
    attachments: Array.isArray(serialized.attachments)
      ? serialized.attachments.map((item) => ({
          name: item?.name || '',
          url: item?.url || '',
          size: Number(item?.size) || 0,
          uploadedAt: item?.uploadedAt || null,
        }))
      : [],
    createdAt: serialized.createdAt || null,
    updatedAt: serialized.updatedAt || null,
  };
};

/**
 * Strips internal Mongoose metadata from list objects.
 *
 * @param {object} list
 * @returns {object|null}
 */
const sanitizeListPayload = (list) => {
  if (!list || typeof list !== 'object') return null;
  const serialized = typeof list.toJSON === 'function' ? list.toJSON() : list;
  const id = toIdString(serialized.id || serialized._id);
  const board = toIdString(serialized.board);

  if (!id || !board) return null;

  return {
    id,
    name: serialized.name || '',
    board,
    position: Number(serialized.position) || 0,
    createdAt: serialized.createdAt || null,
    updatedAt: serialized.updatedAt || null,
  };
};

/**
 * Broadcasts an event exclusively to the authorized Socket.IO room for the target board.
 *
 * @param {string|mongoose.Types.ObjectId} boardId
 * @param {string} eventName
 * @param {object} payload
 * @returns {boolean}
 */
const emitBoardEvent = (boardId, eventName, payload) => {
  const io = getIO();
  if (!io) return false;

  const resolvedBoardId = toIdString(boardId);
  if (
    !isValidObjectId(resolvedBoardId) ||
    !ALLOWED_BOARD_EVENTS.has(eventName) ||
    !payload ||
    typeof payload !== 'object'
  ) {
    return false;
  }

  try {
    io.to(getBoardRoom(resolvedBoardId)).emit(eventName, {
      ...payload,
      boardId: resolvedBoardId,
      timestamp: payload.timestamp || new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
};

const emitCardCreated = ({ card, actorId }) => {
  const sanitizedCard = sanitizeCardPayload(card);
  const resolvedActorId = toIdString(actorId);
  if (!sanitizedCard || (resolvedActorId && !isValidObjectId(resolvedActorId))) {
    return false;
  }

  return emitBoardEvent(sanitizedCard.board, SOCKET_EVENTS.CARD_CREATED, {
    listId: sanitizedCard.list,
    card: sanitizedCard,
    actorId: resolvedActorId,
  });
};

const emitCardUpdated = ({ card, actorId }) => {
  const sanitizedCard = sanitizeCardPayload(card);
  const resolvedActorId = toIdString(actorId);
  if (!sanitizedCard || (resolvedActorId && !isValidObjectId(resolvedActorId))) {
    return false;
  }

  return emitBoardEvent(sanitizedCard.board, SOCKET_EVENTS.CARD_UPDATED, {
    listId: sanitizedCard.list,
    card: sanitizedCard,
    actorId: resolvedActorId,
  });
};

const emitCardMoved = ({ card, fromListId, toListId, actorId }) => {
  const sanitizedCard = sanitizeCardPayload(card);
  const resolvedFromListId = toIdString(fromListId);
  const resolvedToListId = toIdString(toListId) || sanitizedCard?.list;
  const resolvedActorId = toIdString(actorId);

  if (
    !sanitizedCard ||
    !isValidObjectId(resolvedToListId) ||
    (resolvedFromListId && !isValidObjectId(resolvedFromListId)) ||
    (resolvedActorId && !isValidObjectId(resolvedActorId))
  ) {
    return false;
  }

  return emitBoardEvent(sanitizedCard.board, SOCKET_EVENTS.CARD_MOVED, {
    fromListId: resolvedFromListId,
    toListId: resolvedToListId,
    card: sanitizedCard,
    actorId: resolvedActorId,
  });
};

const emitCardDeleted = ({ cardId, listId, boardId, actorId }) => {
  const resolvedCardId = toIdString(cardId);
  const resolvedListId = toIdString(listId);
  const resolvedBoardId = toIdString(boardId);
  const resolvedActorId = toIdString(actorId);

  if (
    !isValidObjectId(resolvedCardId) ||
    !isValidObjectId(resolvedListId) ||
    !isValidObjectId(resolvedBoardId) ||
    (resolvedActorId && !isValidObjectId(resolvedActorId))
  ) {
    return false;
  }

  return emitBoardEvent(resolvedBoardId, SOCKET_EVENTS.CARD_DELETED, {
    listId: resolvedListId,
    cardId: resolvedCardId,
    actorId: resolvedActorId,
  });
};

const emitListCreated = ({ list, actorId }) => {
  const sanitizedList = sanitizeListPayload(list);
  const resolvedActorId = toIdString(actorId);
  if (!sanitizedList || (resolvedActorId && !isValidObjectId(resolvedActorId))) {
    return false;
  }

  return emitBoardEvent(sanitizedList.board, SOCKET_EVENTS.LIST_CREATED, {
    list: sanitizedList,
    actorId: resolvedActorId,
  });
};

const emitListUpdated = ({ list, actorId }) => {
  const sanitizedList = sanitizeListPayload(list);
  const resolvedActorId = toIdString(actorId);
  if (!sanitizedList || (resolvedActorId && !isValidObjectId(resolvedActorId))) {
    return false;
  }

  return emitBoardEvent(sanitizedList.board, SOCKET_EVENTS.LIST_UPDATED, {
    list: sanitizedList,
    actorId: resolvedActorId,
  });
};

const emitListDeleted = ({ listId, boardId, actorId }) => {
  const resolvedListId = toIdString(listId);
  const resolvedBoardId = toIdString(boardId);
  const resolvedActorId = toIdString(actorId);

  if (
    !isValidObjectId(resolvedListId) ||
    !isValidObjectId(resolvedBoardId) ||
    (resolvedActorId && !isValidObjectId(resolvedActorId))
  ) {
    return false;
  }

  return emitBoardEvent(resolvedBoardId, SOCKET_EVENTS.LIST_DELETED, {
    listId: resolvedListId,
    actorId: resolvedActorId,
  });
};

module.exports = {
  SOCKET_EVENTS,
  sanitizeCardPayload,
  sanitizeListPayload,
  emitBoardEvent,
  emitCardCreated,
  emitCardUpdated,
  emitCardMoved,
  emitCardDeleted,
  emitListCreated,
  emitListUpdated,
  emitListDeleted,
};
