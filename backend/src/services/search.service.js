const Board = require('../models/Board');
const Card = require('../models/Card');
const List = require('../models/List');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const ApiError = require('../utils/ApiError');

/**
 * Escapes regex special characters to prevent ReDoS and regex syntax injection
 * @param {string} str - Raw user search string
 * @returns {string} Escaped string safe for RegExp construction
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Executes full-text and partial-match search across workspace entities
 * Strictly isolated to the authorized workspace and its associated boards.
 *
 * @param {string|mongoose.Types.ObjectId} workspaceId - Target workspace ID
 * @param {object} options - Search options
 * @param {string} options.q - Clean search query string
 * @param {'all'|'cards'|'boards'|'lists'} [options.type='all'] - Entity type filter
 * @param {number} [options.limit=20] - Maximum items per page
 * @param {number} [options.page=1] - 1-based page index
 * @param {string} [options.boardId] - Optional board ID to scope search
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
 * @returns {Promise<object>} Standardized search result object
 */
const searchWorkspace = async (
  workspaceId,
  { q, type = 'all', limit = 20, page = 1, boardId = null },
  userId
) => {
  // 1. Verify workspace existence
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw ApiError.notFound('Workspace not found');
  }

  // 2. Verify authenticated user's workspace membership
  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  });
  if (!membership) {
    throw ApiError.forbidden('Access denied. You are not a member of this workspace.');
  }

  // 3. Resolve all boards belonging to this workspace
  const workspaceBoards = await Board.find({ workspace: workspaceId })
    .select('_id name description createdAt')
    .lean();

  if (!workspaceBoards || workspaceBoards.length === 0) {
    return {
      query: q,
      total: 0,
      page,
      limit,
      totalPages: 1,
      counts: { cards: 0, boards: 0, lists: 0 },
      results: [],
    };
  }

  // If specific boardId filter is requested, verify it belongs to this workspace
  let targetBoards = workspaceBoards;
  if (boardId) {
    const matched = workspaceBoards.find(
      (b) => b._id.toString() === boardId.toString()
    );
    if (!matched) {
      throw ApiError.badRequest('Board does not belong to this workspace or does not exist');
    }
    targetBoards = [matched];
  }

  const targetBoardIds = targetBoards.map((b) => b._id);
  const boardMap = new Map(workspaceBoards.map((b) => [b._id.toString(), b.name]));

  // 4. Resolve lists belonging to the target boards for card context
  const targetLists = await List.find({ board: { $in: targetBoardIds } })
    .select('_id name board')
    .lean();
  const listMap = new Map(
    targetLists.map((l) => [l._id.toString(), { name: l.name, boardId: l.board.toString() }])
  );

  const cleanQuery = q.trim();
  const escapedQ = escapeRegex(cleanQuery);
  const regex = new RegExp(escapedQ, 'i');

  const shouldSearchBoards = (type === 'all' || type === 'boards') && !boardId;
  const shouldSearchLists = type === 'all' || type === 'lists';
  const shouldSearchCards = type === 'all' || type === 'cards';

  // Containers for deduplicated results per entity type
  const boardResultsMap = new Map();
  const listResultsMap = new Map();
  const cardResultsMap = new Map();

  // ---------------------------------------------------------
  // A. Search Boards
  // ---------------------------------------------------------
  if (shouldSearchBoards) {
    // 1. Native MongoDB text search (if indexed and available)
    try {
      const textMatches = await Board.find(
        {
          workspace: workspaceId,
          $text: { $search: cleanQuery },
        },
        { score: { $meta: 'textScore' } }
      )
        .select('_id name description createdAt')
        .lean();

      for (const b of textMatches) {
        boardResultsMap.set(b._id.toString(), {
          type: 'board',
          id: b._id.toString(),
          name: b.name,
          description: b.description || '',
          createdAt: b.createdAt,
          score: (b.score || 1) * 2, // Boost text search matches
        });
      }
    } catch {
      // Gracefully fall back to regex if text index is missing or query invalid
    }

    // 2. Safe regex partial-match fallback
    try {
      const regexMatches = await Board.find({
        workspace: workspaceId,
        $or: [{ name: regex }, { description: regex }],
      })
        .select('_id name description createdAt')
        .lean();

      for (const b of regexMatches) {
        const id = b._id.toString();
        let fallbackScore = 2.0;
        if (b.name && b.name.toLowerCase().includes(cleanQuery.toLowerCase())) {
          fallbackScore = b.name.toLowerCase().startsWith(cleanQuery.toLowerCase()) ? 6.0 : 4.0;
        }

        if (boardResultsMap.has(id)) {
          const existing = boardResultsMap.get(id);
          existing.score = Math.max(existing.score, fallbackScore);
        } else {
          boardResultsMap.set(id, {
            type: 'board',
            id,
            name: b.name,
            description: b.description || '',
            createdAt: b.createdAt,
            score: fallbackScore,
          });
        }
      }
    } catch {
      // Continue
    }
  }

  // ---------------------------------------------------------
  // B. Search Lists
  // ---------------------------------------------------------
  if (shouldSearchLists) {
    // 1. Native MongoDB text search
    try {
      const textMatches = await List.find(
        {
          board: { $in: targetBoardIds },
          $text: { $search: cleanQuery },
        },
        { score: { $meta: 'textScore' } }
      )
        .select('_id name board')
        .lean();

      for (const l of textMatches) {
        listResultsMap.set(l._id.toString(), {
          type: 'list',
          id: l._id.toString(),
          name: l.name,
          board: {
            id: l.board.toString(),
            name: boardMap.get(l.board.toString()) || 'Unknown Board',
          },
          score: (l.score || 1) * 2,
        });
      }
    } catch {
      // Gracefully fall back
    }

    // 2. Safe regex partial-match fallback
    try {
      const regexMatches = await List.find({
        board: { $in: targetBoardIds },
        name: regex,
      })
        .select('_id name board')
        .lean();

      for (const l of regexMatches) {
        const id = l._id.toString();
        const fallbackScore = l.name.toLowerCase().startsWith(cleanQuery.toLowerCase())
          ? 5.0
          : 3.0;

        if (listResultsMap.has(id)) {
          const existing = listResultsMap.get(id);
          existing.score = Math.max(existing.score, fallbackScore);
        } else {
          listResultsMap.set(id, {
            type: 'list',
            id,
            name: l.name,
            board: {
              id: l.board.toString(),
              name: boardMap.get(l.board.toString()) || 'Unknown Board',
            },
            score: fallbackScore,
          });
        }
      }
    } catch {
      // Continue
    }
  }

  // ---------------------------------------------------------
  // C. Search Cards
  // ---------------------------------------------------------
  if (shouldSearchCards) {
    // 1. Native MongoDB text search
    try {
      const textMatches = await Card.find(
        {
          board: { $in: targetBoardIds },
          $text: { $search: cleanQuery },
        },
        { score: { $meta: 'textScore' } }
      )
        .select('_id title description priority dueDate labels board list assignees')
        .populate('assignees', 'name email avatar')
        .lean();

      for (const c of textMatches) {
        const listMeta = c.list ? listMap.get(c.list.toString()) : null;
        cardResultsMap.set(c._id.toString(), {
          type: 'card',
          id: c._id.toString(),
          title: c.title,
          description: c.description || '',
          priority: c.priority || 'medium',
          dueDate: c.dueDate || null,
          labels: Array.isArray(c.labels) ? c.labels : [],
          board: {
            id: c.board.toString(),
            name: boardMap.get(c.board.toString()) || 'Unknown Board',
          },
          list: {
            id: c.list ? c.list.toString() : null,
            name: listMeta ? listMeta.name : 'Unknown List',
          },
          assignees: Array.isArray(c.assignees)
            ? c.assignees.map((a) => ({
                id: a._id ? a._id.toString() : a.toString(),
                name: a.name || 'Unknown',
                email: a.email || '',
                avatar: a.avatar || null,
              }))
            : [],
          score: (c.score || 1) * 3, // Highest boost for card text matches
        });
      }
    } catch {
      // Gracefully fall back
    }

    // 2. Safe regex partial-match fallback
    try {
      const regexMatches = await Card.find({
        board: { $in: targetBoardIds },
        $or: [{ title: regex }, { description: regex }, { labels: regex }],
      })
        .select('_id title description priority dueDate labels board list assignees')
        .populate('assignees', 'name email avatar')
        .lean();

      for (const c of regexMatches) {
        const id = c._id.toString();
        const lowerQ = cleanQuery.toLowerCase();
        let fallbackScore = 2.0;

        if (c.title && c.title.toLowerCase().includes(lowerQ)) {
          fallbackScore = c.title.toLowerCase().startsWith(lowerQ) ? 10.0 : 8.0;
        } else if (
          Array.isArray(c.labels) &&
          c.labels.some((l) => l.toLowerCase().includes(lowerQ))
        ) {
          fallbackScore = 6.0;
        } else if (c.description && c.description.toLowerCase().includes(lowerQ)) {
          fallbackScore = 3.0;
        }

        if (cardResultsMap.has(id)) {
          const existing = cardResultsMap.get(id);
          existing.score = Math.max(existing.score, fallbackScore);
        } else {
          const listMeta = c.list ? listMap.get(c.list.toString()) : null;
          cardResultsMap.set(id, {
            type: 'card',
            id,
            title: c.title,
            description: c.description || '',
            priority: c.priority || 'medium',
            dueDate: c.dueDate || null,
            labels: Array.isArray(c.labels) ? c.labels : [],
            board: {
              id: c.board.toString(),
              name: boardMap.get(c.board.toString()) || 'Unknown Board',
            },
            list: {
              id: c.list ? c.list.toString() : null,
              name: listMeta ? listMeta.name : 'Unknown List',
            },
            assignees: Array.isArray(c.assignees)
              ? c.assignees.map((a) => ({
                  id: a._id ? a._id.toString() : a.toString(),
                  name: a.name || 'Unknown',
                  email: a.email || '',
                  avatar: a.avatar || null,
                }))
              : [],
            score: fallbackScore,
          });
        }
      }
    } catch {
      // Continue
    }
  }

  // ---------------------------------------------------------
  // D. Merge, Sort & Paginate Results
  // ---------------------------------------------------------
  const allCards = Array.from(cardResultsMap.values());
  const allBoards = Array.from(boardResultsMap.values());
  const allLists = Array.from(listResultsMap.values());

  const counts = {
    cards: allCards.length,
    boards: allBoards.length,
    lists: allLists.length,
  };

  const combined = [...allCards, ...allBoards, ...allLists];

  // Sort by relevance score (descending), then alphabetically by title/name
  combined.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const nameA = (a.title || a.name || '').toLowerCase();
    const nameB = (b.title || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const total = combined.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const skip = (page - 1) * limit;
  const paginatedResults = combined.slice(skip, skip + limit);

  return {
    query: cleanQuery,
    total,
    page,
    limit,
    totalPages,
    counts,
    results: paginatedResults,
  };
};

module.exports = {
  searchWorkspace,
  escapeRegex,
};
