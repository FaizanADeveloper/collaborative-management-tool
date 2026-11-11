import { create } from 'zustand';
import { boardService } from '../services/boardService';
import { listService } from '../services/listService';
import { cardService } from '../services/cardService';
import { registerLogoutCleanup } from './useAuthStore';
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

const defaultFilters = {
  search: '',
  priority: 'all',
  assigneeId: 'all',
  label: 'all',
  sortBy: 'position',
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
  filters: { ...defaultFilters },

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  clearForWorkspaceChange: () => {
    boardsRequestCounter += 1;
    detailsRequestCounter += 1;
    set({
      boards: [],
      boardsWorkspaceId: null,
      activeBoardId: null,
      activeBoard: null,
      lists: [],
      cardsByList: {},
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
    if (!boardId) {
      writeSavedBoardId(null);
      set({
        activeBoardId: null,
        activeBoard: null,
        lists: [],
        cardsByList: {},
      });
      return;
    }

    writeSavedBoardId(boardId);
    set({ activeBoardId: boardId });
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
        lists: sortByPosition([...state.lists, list]),
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

  resetBoardState: () => {
    boardsRequestCounter += 1;
    detailsRequestCounter += 1;
    writeSavedBoardId(null);
    set({
      boards: [],
      boardsWorkspaceId: null,
      activeBoardId: null,
      activeBoard: null,
      lists: [],
      cardsByList: {},
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
