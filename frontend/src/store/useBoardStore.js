import { create } from 'zustand';
import { boardService } from '../services/boardService';
import { listService } from '../services/listService';
import { cardService } from '../services/cardService';
import { commentService } from '../services/commentService';
import { useAuthStore, registerLogoutCleanup } from './useAuthStore';
import { useWorkspaceStore } from './useWorkspaceStore';
import {
  sortByPosition,
  calculateInsertPosition,
  buildRebalancedPositions,
} from '../utils/positioning';

const ACTIVE_BOARD_KEY = 'syncflow_active_board_id';

const readSavedBoardId = () => {
  try {
    return window.localStorage?.getItem(ACTIVE_BOARD_KEY) || null;
  } catch {
    return null;
  }
};

const writeSavedBoardId = (id) => {
  try {
    if (id) {
      window.localStorage?.setItem(ACTIVE_BOARD_KEY, id);
    } else {
      window.localStorage?.removeItem(ACTIVE_BOARD_KEY);
    }
  } catch {
    // Ignore storage write errors
  }
};

let boardsRequestCounter = 0;
let detailsRequestCounter = 0;
let commentsRequestCounter = 0;

const defaultFilters = {
  search: '',
  priority: 'all',
  assigneeId: 'all',
  label: 'all',
  sortBy: 'position',
};

const normalizeCardAssignees = (card) => {
  if (!card || !Array.isArray(card.assignees)) return card;
  const members = useWorkspaceStore.getState().members || [];
  const memberById = new Map(members.map((m) => [m.id, m]));
  const normalized = card.assignees.map((assignee) => {
    if (assignee && typeof assignee === 'object' && assignee.id) {
      return assignee;
    }
    const id = typeof assignee === 'string' ? assignee : assignee?.id;
    return memberById.get(id) || (id ? { id, name: 'Member', email: '' } : null);
  }).filter(Boolean);

  return { ...card, assignees: normalized };
};

const locateCardListId = (cardsByList, cardId) => {
  for (const [listId, cards] of Object.entries(cardsByList)) {
    if (Array.isArray(cards) && cards.some((c) => c.id === cardId)) {
      return listId;
    }
  }
  return null;
};

const pendingMoveCardIds = new Set();
const recentlyDeletedCardIds = new Set();

const markCardDeletedLocally = (cardId) => {
  if (!cardId) return;
  recentlyDeletedCardIds.add(cardId);
  if (recentlyDeletedCardIds.size > 200) {
    const oldest = recentlyDeletedCardIds.values().next().value;
    if (oldest) recentlyDeletedCardIds.delete(oldest);
  }
};

const getTimestampMs = (doc) => {
  if (!doc?.updatedAt) return 0;
  const ts = new Date(doc.updatedAt).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

const isStaleOrDuplicateVersion = (existingDoc, incomingDoc) => {
  if (!existingDoc || !incomingDoc) return false;
  const existingMs = getTimestampMs(existingDoc);
  const incomingMs = getTimestampMs(incomingDoc);
  return existingMs > 0 && incomingMs > 0 && incomingMs <= existingMs;
};

const upsertSortedById = (items = [], nextItem) => {
  const exists = items.some((item) => item.id === nextItem.id);
  const merged = exists
    ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [...items, nextItem];
  return sortByPosition(merged);
};

export const useBoardStore = create((set, get) => ({
  boards: [],
  boardsWorkspaceId: null,
  activeBoardId: readSavedBoardId(),
  activeBoard: null,
  lists: [],
  cardsByList: {},
  isLoadingBoards: false,
  isLoadingBoardDetails: false,
  hasLoadedBoards: false,
  boardError: null,
  activeCollaborators: [],
  filters: { ...defaultFilters },

  comments: [],
  activeCommentCardId: null,
  isLoadingComments: false,
  commentsError: null,
  typingByCard: {},

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  clearForWorkspaceChange: () => {
    boardsRequestCounter += 1;
    detailsRequestCounter += 1;
    commentsRequestCounter += 1;
    set({
      boards: [],
      boardsWorkspaceId: null,
      activeBoardId: null,
      activeBoard: null,
      lists: [],
      cardsByList: {},
      activeCollaborators: [],
      comments: [],
      activeCommentCardId: null,
      isLoadingComments: false,
      commentsError: null,
      typingByCard: {},
      hasLoadedBoards: false,
      boardError: null,
    });
  },

  fetchBoards: async (workspaceId) => {
    if (!workspaceId) {
      get().clearForWorkspaceChange();
      return [];
    }

    const requestId = ++boardsRequestCounter;
    set({
      isLoadingBoards: true,
      boardError: null,
      boardsWorkspaceId: workspaceId,
    });

    try {
      const boards = await boardService.listBoards(workspaceId);
      if (requestId !== boardsRequestCounter) {
        return [];
      }

      const currentActiveId = get().activeBoardId;
      const matched = boards.find((b) => b.id === currentActiveId);
      const nextBoardId = matched ? matched.id : boards[0]?.id || null;

      writeSavedBoardId(nextBoardId);
      set({
        boards,
        activeBoardId: nextBoardId,
        isLoadingBoards: false,
        hasLoadedBoards: true,
        boardError: null,
      });

      if (nextBoardId) {
        await get().fetchBoardDetails(nextBoardId);
      } else {
        set({
          activeBoard: null,
          lists: [],
          cardsByList: {},
          isLoadingBoardDetails: false,
        });
      }

      return boards;
    } catch (err) {
      if (requestId !== boardsRequestCounter) {
        return [];
      }
      set({
        isLoadingBoards: false,
        hasLoadedBoards: true,
        boardError: err.message || 'Failed to load workspace boards',
      });
      return [];
    }
  },

  fetchBoardDetails: async (boardId) => {
    if (!boardId) {
      set({
        activeBoard: null,
        lists: [],
        cardsByList: {},
        isLoadingBoardDetails: false,
      });
      return null;
    }

    const requestId = ++detailsRequestCounter;
    set({ isLoadingBoardDetails: true, boardError: null });

    try {
      const [board, rawLists] = await Promise.all([
        boardService.getBoard(boardId),
        listService.listLists(boardId),
      ]);

      if (requestId !== detailsRequestCounter) {
        return null;
      }

      const lists = sortByPosition(rawLists);
      const cardResults = await Promise.all(
        lists.map((list) => cardService.listCards(list.id))
      );

      if (requestId !== detailsRequestCounter) {
        return null;
      }

      const cardsByList = {};
      lists.forEach((list, idx) => {
        cardsByList[list.id] = sortByPosition(cardResults[idx] || []);
      });

      set({
        activeBoard: board,
        lists,
        cardsByList,
        isLoadingBoardDetails: false,
        boardError: null,
      });

      return { board, lists, cardsByList };
    } catch (err) {
      if (requestId !== detailsRequestCounter) {
        return null;
      }
      set({
        isLoadingBoardDetails: false,
        boardError: err.message || 'Failed to load board details',
      });
      return null;
    }
  },

  setActiveBoardId: async (boardId) => {
    commentsRequestCounter += 1;
    if (!boardId) {
      writeSavedBoardId(null);
      set({
        activeBoardId: null,
        activeBoard: null,
        lists: [],
        cardsByList: {},
        activeCollaborators: [],
        comments: [],
        activeCommentCardId: null,
        isLoadingComments: false,
        commentsError: null,
      });
      return;
    }

    writeSavedBoardId(boardId);
    set({
      activeBoardId: boardId,
      activeCollaborators: [],
      comments: [],
      activeCommentCardId: null,
      isLoadingComments: false,
      commentsError: null,
    });
    await get().fetchBoardDetails(boardId);
  },

  createBoard: async (workspaceId, { name, description }) => {
    try {
      const board = await boardService.createBoard(workspaceId, { name, description });
      if (!board) {
        return { success: false, error: 'Failed to create board', fieldErrors: {} };
      }

      writeSavedBoardId(board.id);
      set((state) => ({
        boards: [board, ...state.boards.filter((b) => b.id !== board.id)],
        activeBoardId: board.id,
        activeBoard: board,
        lists: [],
        cardsByList: {},
        boardError: null,
      }));

      await get().fetchBoardDetails(board.id);
      return { success: true, board };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to create board',
        fieldErrors: err.fieldErrors || {},
      };
    }
  },

  updateBoard: async (boardId, { name, description }) => {
    try {
      const updated = await boardService.updateBoard(boardId, { name, description });
      if (!updated) {
        return { success: false, error: 'Failed to update board', fieldErrors: {} };
      }

      set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? { ...b, ...updated } : b)),
        activeBoard:
          state.activeBoard?.id === boardId
            ? { ...state.activeBoard, ...updated }
            : state.activeBoard,
      }));

      return { success: true, board: updated };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to update board',
        fieldErrors: err.fieldErrors || {},
      };
    }
  },

  deleteBoard: async (boardId) => {
    try {
      await boardService.deleteBoard(boardId);
      const remaining = get().boards.filter((b) => b.id !== boardId);
      const wasActive = get().activeBoardId === boardId;
      const nextBoardId = wasActive ? remaining[0]?.id || null : get().activeBoardId;

      writeSavedBoardId(nextBoardId);
      set({
        boards: remaining,
        activeBoardId: nextBoardId,
        activeBoard: wasActive ? null : get().activeBoard,
        lists: wasActive ? [] : get().lists,
        cardsByList: wasActive ? {} : get().cardsByList,
      });

      if (wasActive && nextBoardId) {
        await get().fetchBoardDetails(nextBoardId);
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to delete board',
      };
    }
  },

  createList: async (boardId, { name, position }) => {
    try {
      const list = await listService.createList(boardId, { name, position });
      if (!list) {
        return { success: false, error: 'Failed to create list', fieldErrors: {} };
      }

      set((state) => ({
        lists: upsertSortedById(state.lists, list),
        cardsByList: {
          ...state.cardsByList,
          [list.id]: state.cardsByList[list.id] || [],
        },
      }));

      return { success: true, list };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to create list',
        fieldErrors: err.fieldErrors || {},
      };
    }
  },

  renameList: async (listId, name) => {
    const previousLists = get().lists;
    set({
      lists: previousLists.map((l) => (l.id === listId ? { ...l, name } : l)),
    });

    try {
      const updated = await listService.updateList(listId, { name });
      if (updated) {
        set((state) => ({
          lists: sortByPosition(state.lists.map((l) => (l.id === listId ? updated : l))),
        }));
      }
      return { success: true, list: updated };
    } catch (err) {
      set({ lists: previousLists });
      return {
        success: false,
        error: err.message || 'Failed to rename list',
        fieldErrors: err.fieldErrors || {},
      };
    }
  },

  reorderList: async (listId, destinationIndex) => {
    const previousLists = get().lists;
    const movingList = previousLists.find((l) => l.id === listId);
    if (!movingList) return { success: false, error: 'List not found' };

    const { position, needsRebalance } = calculateInsertPosition(
      previousLists,
      destinationIndex,
      listId
    );

    const remaining = sortByPosition(previousLists.filter((l) => l.id !== listId));
    const clampedIndex = Math.max(0, Math.min(destinationIndex, remaining.length));
    const reordered = [...remaining];
    reordered.splice(clampedIndex, 0, { ...movingList, position });

    set({ lists: reordered });

    try {
      if (needsRebalance) {
        const balanced = buildRebalancedPositions(reordered);
        await Promise.all(
          balanced.map((entry) => listService.updateList(entry.id, { position: entry.position }))
        );
        const balancedMap = new Map(balanced.map((b) => [b.id, b.position]));
        set({
          lists: reordered.map((l) => ({
            ...l,
            position: balancedMap.get(l.id) ?? l.position,
          })),
        });
      } else {
        const updated = await listService.updateList(listId, { position });
        if (updated) {
          set((state) => ({
            lists: sortByPosition(state.lists.map((l) => (l.id === listId ? updated : l))),
          }));
        }
      }
      return { success: true };
    } catch (err) {
      set({ lists: previousLists });
      return {
        success: false,
        error: err.message || 'Failed to reorder list',
      };
    }
  },

  deleteList: async (listId) => {
    try {
      await listService.deleteList(listId);
      set((state) => {
        const nextCardsByList = { ...state.cardsByList };
        delete nextCardsByList[listId];
        return {
          lists: state.lists.filter((l) => l.id !== listId),
          cardsByList: nextCardsByList,
        };
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to delete list',
      };
    }
  },

  createCard: async (listId, payload) => {
    try {
      const created = await cardService.createCard(listId, payload);
      if (!created) {
        return { success: false, error: 'Failed to create card', fieldErrors: {} };
      }

      const card = normalizeCardAssignees(created);
      recentlyDeletedCardIds.delete(card.id);
      set((state) => {
        const existing = state.cardsByList[listId] || [];
        return {
          cardsByList: {
            ...state.cardsByList,
            [listId]: upsertSortedById(existing, card),
          },
        };
      });

      return { success: true, card };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to create card',
        fieldErrors: err.fieldErrors || {},
      };
    }
  },

  updateCard: async (cardId, payload) => {
    try {
      const updatedRaw = await cardService.updateCard(cardId, payload);
      if (!updatedRaw) {
        return { success: false, error: 'Failed to update card', fieldErrors: {} };
      }

      const updated = normalizeCardAssignees(updatedRaw);
      set((state) => {
        const currentListId =
          locateCardListId(state.cardsByList, cardId) || updated.list;
        if (!currentListId) return {};
        const currentListCards = state.cardsByList[currentListId] || [];
        return {
          cardsByList: {
            ...state.cardsByList,
            [currentListId]: sortByPosition(
              currentListCards.map((c) => (c.id === cardId ? updated : c))
            ),
          },
        };
      });

      return { success: true, card: updated };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to update card',
        fieldErrors: err.fieldErrors || {},
      };
    }
  },

  deleteCard: async (cardId) => {
    try {
      await cardService.deleteCard(cardId);
      markCardDeletedLocally(cardId);
      set((state) => {
        const ownerListId = locateCardListId(state.cardsByList, cardId);
        if (!ownerListId) return {};
        return {
          cardsByList: {
            ...state.cardsByList,
            [ownerListId]: (state.cardsByList[ownerListId] || []).filter(
              (c) => c.id !== cardId
            ),
          },
        };
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to delete card',
      };
    }
  },

  moveCard: async (cardId, sourceListId, destinationListId, destinationIndex) => {
    const previousCardsByList = get().cardsByList;
    const resolvedSourceId = sourceListId || locateCardListId(previousCardsByList, cardId);
    if (!resolvedSourceId || !destinationListId) {
      return { success: false, error: 'Invalid source or destination list' };
    }

    const sourceCards = previousCardsByList[resolvedSourceId] || [];
    const movingCard = sourceCards.find((c) => c.id === cardId);
    if (!movingCard) {
      return { success: false, error: 'Card not found' };
    }

    const rawDestCards = previousCardsByList[destinationListId] || [];
    const { position, needsRebalance } = calculateInsertPosition(
      rawDestCards,
      destinationIndex,
      cardId
    );

    const nextSourceCards = sourceCards.filter((c) => c.id !== cardId);
    const baseDestCards =
      resolvedSourceId === destinationListId
        ? nextSourceCards
        : sortByPosition(rawDestCards.filter((c) => c.id !== cardId));
    const clampedIndex = Math.max(0, Math.min(destinationIndex, baseDestCards.length));
    const optimisticCard = {
      ...movingCard,
      list: destinationListId,
      position,
    };
    const nextDestCards = [...baseDestCards];
    nextDestCards.splice(clampedIndex, 0, optimisticCard);

    const optimisticMap = {
      ...previousCardsByList,
      [resolvedSourceId]: nextSourceCards,
      [destinationListId]: nextDestCards,
    };
    set({ cardsByList: optimisticMap });
    pendingMoveCardIds.add(cardId);

    try {
      const serverCard = await cardService.moveCard(cardId, {
        destinationListId,
        position,
      });

      if (needsRebalance) {
        const balanced = buildRebalancedPositions(nextDestCards);
        await Promise.all(
          balanced.map((entry) => cardService.updateCard(entry.id, { position: entry.position }))
        );
        const balancedMap = new Map(balanced.map((b) => [b.id, b.position]));
        set((state) => ({
          cardsByList: {
            ...state.cardsByList,
            [destinationListId]: sortByPosition(
              (state.cardsByList[destinationListId] || []).map((c) => ({
                ...c,
                position: balancedMap.get(c.id) ?? c.position,
              }))
            ),
          },
        }));
      } else if (serverCard) {
        const normalized = normalizeCardAssignees(serverCard);
        set((state) => ({
          cardsByList: {
            ...state.cardsByList,
            [destinationListId]: sortByPosition(
              (state.cardsByList[destinationListId] || []).map((c) =>
                c.id === cardId ? normalized : c
              )
            ),
          },
        }));
      }

      return { success: true, card: serverCard };
    } catch (err) {
      // Revert optimistic move when backend persistence fails
      set({ cardsByList: previousCardsByList });
      return {
        success: false,
        error: err.message || 'Failed to move card',
      };
    } finally {
      pendingMoveCardIds.delete(cardId);
    }
  },

  applySocketCardCreated: (payload) => {
    const incoming = payload?.card;
    const boardId = payload?.boardId || incoming?.board;
    const listId = payload?.listId || incoming?.list;
    if (!incoming?.id || !listId) return;

    set((state) => {
      if (!state.activeBoardId || boardId !== state.activeBoardId) return {};
      if (pendingMoveCardIds.has(incoming.id) || recentlyDeletedCardIds.has(incoming.id)) {
        return {};
      }

      const existingListId = locateCardListId(state.cardsByList, incoming.id);
      if (existingListId) {
        const existingCard = (state.cardsByList[existingListId] || []).find(
          (c) => c.id === incoming.id
        );
        if (isStaleOrDuplicateVersion(existingCard, incoming)) {
          return {};
        }
        const normalized = normalizeCardAssignees(incoming);
        return {
          cardsByList: {
            ...state.cardsByList,
            [existingListId]: upsertSortedById(state.cardsByList[existingListId] || [], normalized),
          },
        };
      }

      const normalized = normalizeCardAssignees(incoming);
      return {
        cardsByList: {
          ...state.cardsByList,
          [listId]: upsertSortedById(state.cardsByList[listId] || [], normalized),
        },
      };
    });
  },

  applySocketCardUpdated: (payload) => {
    const incoming = payload?.card;
    const boardId = payload?.boardId || incoming?.board;
    if (!incoming?.id) return;

    set((state) => {
      if (!state.activeBoardId || boardId !== state.activeBoardId) return {};
      if (pendingMoveCardIds.has(incoming.id) || recentlyDeletedCardIds.has(incoming.id)) {
        return {};
      }

      const currentListId = locateCardListId(state.cardsByList, incoming.id);
      if (!currentListId) return {};

      const existingCard = (state.cardsByList[currentListId] || []).find(
        (c) => c.id === incoming.id
      );
      if (isStaleOrDuplicateVersion(existingCard, incoming)) {
        return {};
      }

      const targetListId = incoming.list || payload?.listId || currentListId;
      const normalized = normalizeCardAssignees(incoming);

      if (targetListId === currentListId) {
        return {
          cardsByList: {
            ...state.cardsByList,
            [currentListId]: upsertSortedById(state.cardsByList[currentListId] || [], normalized),
          },
        };
      }

      return {
        cardsByList: {
          ...state.cardsByList,
          [currentListId]: (state.cardsByList[currentListId] || []).filter(
            (c) => c.id !== incoming.id
          ),
          [targetListId]: upsertSortedById(state.cardsByList[targetListId] || [], normalized),
        },
      };
    });
  },

  applySocketCardMoved: (payload) => {
    const incoming = payload?.card;
    const boardId = payload?.boardId || incoming?.board;
    const toListId = payload?.toListId || incoming?.list;
    if (!incoming?.id || !toListId) return;

    set((state) => {
      if (!state.activeBoardId || boardId !== state.activeBoardId) return {};
      if (pendingMoveCardIds.has(incoming.id) || recentlyDeletedCardIds.has(incoming.id)) {
        return {};
      }

      const currentListId = locateCardListId(state.cardsByList, incoming.id);
      const existingCard = currentListId
        ? (state.cardsByList[currentListId] || []).find((c) => c.id === incoming.id)
        : null;

      if (existingCard) {
        const existingMs = getTimestampMs(existingCard);
        const incomingMs = getTimestampMs(incoming);
        if (existingMs > 0 && incomingMs > 0 && incomingMs < existingMs) {
          return {};
        }
        if (
          currentListId === toListId &&
          Number(existingCard.position) === Number(incoming.position) &&
          existingMs > 0 &&
          incomingMs === existingMs
        ) {
          return {};
        }
      }

      const normalized = normalizeCardAssignees({
        ...incoming,
        list: toListId,
      });

      const nextCardsByList = {};
      for (const [listId, cards] of Object.entries(state.cardsByList)) {
        nextCardsByList[listId] = (cards || []).filter((c) => c.id !== incoming.id);
      }

      nextCardsByList[toListId] = upsertSortedById(nextCardsByList[toListId] || [], normalized);

      return { cardsByList: nextCardsByList };
    });
  },

  applySocketCardDeleted: (payload) => {
    const cardId = payload?.cardId;
    const boardId = payload?.boardId;
    if (!cardId) return;

    set((state) => {
      if (!state.activeBoardId || boardId !== state.activeBoardId) return {};
      markCardDeletedLocally(cardId);

      let changed = false;
      const nextCardsByList = {};
      for (const [listId, cards] of Object.entries(state.cardsByList)) {
        const filtered = (cards || []).filter((c) => {
          if (c.id === cardId) {
            changed = true;
            return false;
          }
          return true;
        });
        nextCardsByList[listId] = filtered;
      }

      return changed ? { cardsByList: nextCardsByList } : {};
    });
  },

  applySocketListCreated: (payload) => {
    const incoming = payload?.list;
    const boardId = payload?.boardId || incoming?.board;
    if (!incoming?.id) return;

    set((state) => {
      if (!state.activeBoardId || boardId !== state.activeBoardId) return {};
      const existing = state.lists.find((l) => l.id === incoming.id);
      if (existing && isStaleOrDuplicateVersion(existing, incoming)) {
        return {};
      }
      return {
        lists: upsertSortedById(state.lists, incoming),
        cardsByList: {
          ...state.cardsByList,
          [incoming.id]: state.cardsByList[incoming.id] || [],
        },
      };
    });
  },

  applySocketListUpdated: (payload) => {
    const incoming = payload?.list;
    const boardId = payload?.boardId || incoming?.board;
    if (!incoming?.id) return;

    set((state) => {
      if (!state.activeBoardId || boardId !== state.activeBoardId) return {};
      const existing = state.lists.find((l) => l.id === incoming.id);
      if (!existing || isStaleOrDuplicateVersion(existing, incoming)) {
        return {};
      }
      return {
        lists: upsertSortedById(state.lists, incoming),
      };
    });
  },

  applySocketListDeleted: (payload) => {
    const listId = payload?.listId;
    const boardId = payload?.boardId;
    if (!listId) return;

    set((state) => {
      if (!state.activeBoardId || boardId !== state.activeBoardId) return {};
      if (!state.lists.some((l) => l.id === listId)) return {};

      const nextCardsByList = { ...state.cardsByList };
      delete nextCardsByList[listId];
      return {
        lists: state.lists.filter((l) => l.id !== listId),
        cardsByList: nextCardsByList,
      };
    });
  },

  setCollaborators: (boardId, collaborators = []) => {
    const incomingBoardId = boardId ? String(boardId) : null;
    if (!incomingBoardId) return;

    set((state) => {
      if (!state.activeBoardId || state.activeBoardId !== incomingBoardId) {
        return {};
      }

      const deduplicated = [];
      const seenIds = new Set();
      if (Array.isArray(collaborators)) {
        for (const c of collaborators) {
          const id = c?.id || c?._id;
          if (id && !seenIds.has(String(id))) {
            seenIds.add(String(id));
            deduplicated.push({
              id: String(id),
              name: c.name || 'User',
              avatar: c.avatar || '',
              email: c.email || '',
            });
          }
        }
      }

      return { activeCollaborators: deduplicated };
    });
  },

  applySocketUserJoined: (payload) => {
    const boardId = payload?.boardId ? String(payload.boardId) : null;
    const user = payload?.user;
    const id = user?.id || user?._id;
    if (!boardId || !id) return;

    set((state) => {
      if (!state.activeBoardId || state.activeBoardId !== boardId) {
        return {};
      }

      const strId = String(id);
      const exists = state.activeCollaborators.some((c) => c.id === strId);
      const updatedUser = {
        id: strId,
        name: user.name || 'User',
        avatar: user.avatar || '',
        email: user.email || '',
      };

      const next = exists
        ? state.activeCollaborators.map((c) => (c.id === strId ? updatedUser : c))
        : [...state.activeCollaborators, updatedUser];

      return { activeCollaborators: next };
    });
  },

  applySocketUserLeft: (payload) => {
    const boardId = payload?.boardId ? String(payload.boardId) : null;
    const userId = payload?.userId ? String(payload.userId) : null;
    if (!boardId || !userId) return;

    set((state) => {
      if (!state.activeBoardId || state.activeBoardId !== boardId) {
        return {};
      }

      const filtered = state.activeCollaborators.filter((c) => c.id !== userId);
      if (filtered.length === state.activeCollaborators.length) {
        return {};
      }

      return { activeCollaborators: filtered };
    });
  },

  clearCollaborators: () => set({ activeCollaborators: [] }),

  fetchComments: async (cardId) => {
    if (!cardId) {
      set({ comments: [], activeCommentCardId: null, isLoadingComments: false, commentsError: null });
      return [];
    }

    const requestId = ++commentsRequestCounter;
    set({ activeCommentCardId: cardId, isLoadingComments: true, commentsError: null });

    try {
      const comments = await commentService.listComments(cardId);
      if (requestId !== commentsRequestCounter || get().activeCommentCardId !== cardId) {
        return [];
      }
      set({ comments, isLoadingComments: false, commentsError: null });
      return comments;
    } catch (err) {
      if (requestId !== commentsRequestCounter || get().activeCommentCardId !== cardId) {
        return [];
      }
      set({
        isLoadingComments: false,
        commentsError: err?.message || 'Failed to load comments',
      });
      return [];
    }
  },

  createComment: async (cardId, content) => {
    const trimmed = typeof content === 'string' ? content.trim() : '';
    if (!cardId || !trimmed) return { success: false, error: 'Comment content is required' };

    try {
      const comment = await commentService.createComment(cardId, { content: trimmed });
      if (comment) {
        set((state) => {
          if (state.activeCommentCardId !== cardId) return {};
          const exists = state.comments.some((c) => c.id === comment.id);
          if (exists) return {};
          return { comments: [...state.comments, comment] };
        });
      }
      return { success: true, comment };
    } catch (err) {
      return { success: false, error: err?.message || 'Failed to create comment' };
    }
  },

  deleteComment: async (cardId, commentId) => {
    if (!cardId || !commentId) return { success: false, error: 'Card ID and comment ID are required' };

    try {
      await commentService.deleteComment(cardId, commentId);
      set((state) => {
        if (state.activeCommentCardId !== cardId) return {};
        return { comments: state.comments.filter((c) => c.id !== commentId) };
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || 'Failed to delete comment' };
    }
  },

  applySocketCommentCreated: (payload) => {
    const incoming = payload?.comment;
    const cardId = payload?.cardId || incoming?.card;
    const boardId = payload?.boardId || incoming?.board;
    if (!incoming?.id || !cardId) return;

    set((state) => {
      if (!state.activeBoardId || (boardId && boardId !== state.activeBoardId)) return {};
      if (state.activeCommentCardId !== cardId) return {};

      const exists = state.comments.some((c) => c.id === incoming.id);
      if (exists) return {};

      return { comments: [...state.comments, incoming] };
    });
  },

  applySocketCommentDeleted: (payload) => {
    const commentId = payload?.commentId;
    const cardId = payload?.cardId;
    const boardId = payload?.boardId;
    if (!commentId || !cardId) return;

    set((state) => {
      if (!state.activeBoardId || (boardId && boardId !== state.activeBoardId)) return {};
      if (state.activeCommentCardId !== cardId) return {};

      const filtered = state.comments.filter((c) => c.id !== commentId);
      if (filtered.length === state.comments.length) return {};

      return { comments: filtered };
    });
  },

  clearComments: () => {
    commentsRequestCounter += 1;
    set({
      comments: [],
      activeCommentCardId: null,
      isLoadingComments: false,
      commentsError: null,
    });
  },

  applySocketCardTyping: (payload) => {
    const boardId = payload?.boardId;
    const cardId = payload?.cardId;
    const isTyping = Boolean(payload?.isTyping);
    const incomingUser = payload?.user;

    if (!cardId || !incomingUser?.id) return;

    const activeBoardId = get().activeBoardId;
    if (!activeBoardId || (boardId && boardId !== activeBoardId)) return;

    const currentUserId =
      useAuthStore.getState().user?.id || useAuthStore.getState().user?._id;
    if (currentUserId && String(incomingUser.id) === String(currentUserId)) return;

    set((state) => {
      const currentList = state.typingByCard[cardId] || [];
      const userId = String(incomingUser.id);

      if (isTyping) {
        const nextUser = {
          id: userId,
          name:
            typeof incomingUser.name === 'string' && incomingUser.name.trim()
              ? incomingUser.name.trim()
              : 'User',
          avatar:
            typeof incomingUser.avatar === 'string' ? incomingUser.avatar.trim() : '',
          timestamp: Date.now(),
        };

        const existingIndex = currentList.findIndex((u) => u.id === userId);
        const updatedList =
          existingIndex >= 0
            ? currentList.map((u, i) => (i === existingIndex ? nextUser : u))
            : [...currentList, nextUser];

        return {
          typingByCard: {
            ...state.typingByCard,
            [cardId]: updatedList,
          },
        };
      } else {
        const filtered = currentList.filter((u) => u.id !== userId);
        if (filtered.length === currentList.length) return {};

        return {
          typingByCard: {
            ...state.typingByCard,
            [cardId]: filtered,
          },
        };
      }
    });
  },

  clearCardTyping: (cardId) => {
    if (!cardId) return;
    set((state) => {
      if (!state.typingByCard[cardId] || state.typingByCard[cardId].length === 0) return {};
      const next = { ...state.typingByCard };
      delete next[cardId];
      return { typingByCard: next };
    });
  },

  clearAllTyping: () => {
    set({ typingByCard: {} });
  },

  getTypingCollaborators: (cardId) => {
    if (!cardId) return [];
    const list = get().typingByCard[cardId] || [];
    const now = Date.now();
    return list.filter((u) => now - (u.timestamp || 0) < 4000);
  },

  resetBoardState: () => {
    pendingMoveCardIds.clear();
    recentlyDeletedCardIds.clear();
    boardsRequestCounter += 1;
    detailsRequestCounter += 1;
    commentsRequestCounter += 1;
    writeSavedBoardId(null);
    set({
      boards: [],
      boardsWorkspaceId: null,
      activeBoardId: null,
      activeBoard: null,
      lists: [],
      cardsByList: {},
      activeCollaborators: [],
      comments: [],
      activeCommentCardId: null,
      isLoadingComments: false,
      commentsError: null,
      typingByCard: {},
      isLoadingBoards: false,
      isLoadingBoardDetails: false,
      hasLoadedBoards: false,
      boardError: null,
      filters: { ...defaultFilters },
    });
  },
}));

registerLogoutCleanup(() => {
  useBoardStore.getState().resetBoardState();
});
