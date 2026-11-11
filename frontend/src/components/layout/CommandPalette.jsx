import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useBoardStore } from '../../store/useBoardStore';
import {
  Search,
  KanbanSquare,
  FolderKanban,
  Users,
  Plus,
  Moon,
  Sun,
  LayoutDashboard,
  ArrowRight,
  Settings,
  KeyRound,
  X,
} from 'lucide-react';
import { PriorityBadge } from '../common/Badge';

export const CommandPalette = () => {
  const {
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    openCreateCard,
    openCreateBoard,
    openCreateWorkspace,
    openJoinWorkspace,
    openCardDetails,
    theme,
    toggleTheme,
  } = useUIStore();

  const { members, activeWorkspaceId } = useWorkspaceStore();
  const { boards, lists, cardsByList, setActiveBoardId } = useBoardStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const cards = Object.values(cardsByList).flat();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else {
          setQuery('');
          setSelectedIndex(0);
          openCommandPalette();
        }
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        e.preventDefault();
        closeCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, openCommandPalette, closeCommandPalette]);

  if (!isCommandPaletteOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  const navActions = [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      icon: LayoutDashboard,
      category: 'Navigation',
      action: () => {
        navigate('/dashboard');
        closeCommandPalette();
      },
    },
    {
      id: 'nav-board',
      label: 'Go to Active Board',
      icon: KanbanSquare,
      category: 'Navigation',
      action: () => {
        navigate('/board');
        closeCommandPalette();
      },
    },
    {
      id: 'nav-boards',
      label: 'Go to Boards Directory',
      icon: FolderKanban,
      category: 'Navigation',
      action: () => {
        navigate('/boards');
        closeCommandPalette();
      },
    },
    {
      id: 'nav-team',
      label: 'Go to Team & Membership',
      icon: Users,
      category: 'Navigation',
      action: () => {
        navigate('/team');
        closeCommandPalette();
      },
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      icon: Settings,
      category: 'Navigation',
      action: () => {
        navigate('/settings');
        closeCommandPalette();
      },
    },
  ];

  const systemActions = [
    ...(lists.length > 0
      ? [
          {
            id: 'act-new-card',
            label: 'Create New Card',
            icon: Plus,
            category: 'Actions',
            action: () => {
              closeCommandPalette();
              openCreateCard(lists[0].id);
            },
          },
        ]
      : []),
    ...(activeWorkspaceId
      ? [
          {
            id: 'act-new-board',
            label: 'Create New Board',
            icon: Plus,
            category: 'Actions',
            action: () => {
              closeCommandPalette();
              openCreateBoard();
            },
          },
        ]
      : []),
    {
      id: 'act-new-workspace',
      label: 'Create New Workspace',
      icon: Plus,
      category: 'Actions',
      action: () => {
        closeCommandPalette();
        openCreateWorkspace();
      },
    },
    {
      id: 'act-join-workspace',
      label: 'Join Workspace with Invite Code',
      icon: KeyRound,
      category: 'Actions',
      action: () => {
        closeCommandPalette();
        openJoinWorkspace();
      },
    },
    {
      id: 'act-toggle-theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      icon: theme === 'dark' ? Sun : Moon,
      category: 'Actions',
      action: () => {
        toggleTheme();
        closeCommandPalette();
      },
    },
  ];

  const matchedCards = cards
    .filter(
      (c) =>
        (c.title || '').toLowerCase().includes(cleanQuery) ||
        (c.description || '').toLowerCase().includes(cleanQuery) ||
        (Array.isArray(c.labels) && c.labels.some((l) => l.toLowerCase().includes(cleanQuery)))
    )
    .slice(0, 5)
    .map((c) => ({
      id: `card-${c.id}`,
      label: c.title,
      subtitle: c.description,
      card: c,
      category: 'Cards',
      icon: KanbanSquare,
      action: () => {
        closeCommandPalette();
        navigate('/board');
        openCardDetails(c.id);
      },
    }));

  const matchedBoards = boards
    .filter(
      (b) =>
        (b.name || '').toLowerCase().includes(cleanQuery) ||
        (b.description || '').toLowerCase().includes(cleanQuery)
    )
    .slice(0, 4)
    .map((b) => ({
      id: `board-${b.id}`,
      label: b.name,
      subtitle: b.description,
      category: 'Boards',
      icon: FolderKanban,
      action: () => {
        closeCommandPalette();
        setActiveBoardId(b.id);
        navigate(`/boards/${b.id}`);
      },
    }));

  const matchedMembers = members
    .filter(
      (m) =>
        (m.name || '').toLowerCase().includes(cleanQuery) ||
        (m.email || '').toLowerCase().includes(cleanQuery) ||
        (m.role || '').toLowerCase().includes(cleanQuery)
    )
    .slice(0, 4)
    .map((m) => ({
      id: `member-${m.id}`,
      label: m.name,
      subtitle: `${m.role} • ${m.email}`,
      category: 'Members',
      icon: Users,
      action: () => {
        closeCommandPalette();
        navigate('/team');
      },
    }));

  const filteredNav = cleanQuery
    ? navActions.filter((a) => a.label.toLowerCase().includes(cleanQuery))
    : navActions;
  const filteredSys = cleanQuery
    ? systemActions.filter((a) => a.label.toLowerCase().includes(cleanQuery))
    : systemActions;

  const allResults = [
    ...matchedCards,
    ...matchedBoards,
    ...matchedMembers,
    ...filteredSys,
    ...filteredNav,
  ];

  const handleInputKeyDown = (e) => {
    if (allResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allResults.length) % allResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = allResults[selectedIndex] || allResults[0];
      selected?.action();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto pt-20 px-4 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Quick search command palette"
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={closeCommandPalette}
      />

      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl bg-elevated border border-line-strong shadow-2xl">
        <div className="flex items-center px-4 border-b border-line bg-surface">
          <Search className="w-5 h-5 text-brand flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onKeyDown={handleInputKeyDown}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search cards, boards, members, or jump to a command..."
            aria-label="Command palette search"
            className="w-full bg-transparent border-0 px-3 py-4 text-ink placeholder-ink-muted focus:outline-none text-sm sm:text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="p-1 text-ink-muted hover:text-ink rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono text-ink-muted bg-subtle border border-line rounded ml-2">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {allResults.length === 0 ? (
            <div className="py-12 text-center text-ink-muted text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs mt-1">
                Try searching for a card title, board name, teammate, or action.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {allResults.map((item, index) => {
                const IconComponent = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    type="button"
                    key={item.id || index}
                    onClick={item.action}
                    className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group ${
                      isSelected ? 'bg-subtle text-ink' : 'hover:bg-subtle/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded-md bg-surface text-brand border border-line flex-shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink truncate">
                            {item.label}
                          </span>
                          {item.card && (
                            <PriorityBadge priority={item.card.priority || 'medium'} />
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-ink-muted truncate max-w-md">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 text-ink-muted">
                      <span className="text-[11px] uppercase tracking-wider hidden sm:inline">
                        {item.category}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-surface border-t border-line text-xs text-ink-muted flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-subtle px-1.5 py-0.5 rounded text-[10px] border border-line">
                ↑↓
              </kbd>{' '}
              navigate
            </span>
            <span>
              <kbd className="font-mono bg-subtle px-1.5 py-0.5 rounded text-[10px] border border-line">
                ↵
              </kbd>{' '}
              select
            </span>
          </div>
          <span className="text-brand font-medium">SyncFlow</span>
        </div>
      </div>
    </div>
  );
};
