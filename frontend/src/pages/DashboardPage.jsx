import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useBoardStore } from '../store/useBoardStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { StatCard } from '../components/dashboard/StatCard';
import { CardsByListChart } from '../components/dashboard/CardsByListChart';
import { TaskDistributionChart } from '../components/dashboard/TaskDistributionChart';
import { AssignedTasksList } from '../components/dashboard/AssignedTasksList';
import { ProjectProgressCards } from '../components/dashboard/ProjectProgressCards';
import { Button } from '../components/common/Button';
import { RoleBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Skeleton';
import {
  Building2,
  FolderKanban,
  Users,
  Columns3,
  Plus,
  ArrowRight,
  KeyRound,
} from 'lucide-react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    workspaces,
    activeWorkspaceId,
    activeWorkspaceDetails,
    members,
    isLoadingWorkspaces,
  } = useWorkspaceStore();
  const { boards, activeBoard, lists, cardsByList } = useBoardStore();
  const {
    openCreateWorkspace,
    openJoinWorkspace,
    openCreateBoard,
    openCreateCard,
  } = useUIStore();

  const activeWorkspace =
    activeWorkspaceDetails || workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const allBoardCards = Object.values(cardsByList).flat();
  const urgentOrHighCount = allBoardCards.filter(
    (c) => c.priority === 'urgent' || c.priority === 'high'
  ).length;

  if (isLoadingWorkspaces) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <section className="rounded-xl bg-surface border border-line p-5 sm:p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-brand uppercase tracking-wider">
                {activeWorkspace ? activeWorkspace.name : 'Getting Started'}
              </span>
              {activeWorkspace?.role && <RoleBadge role={activeWorkspace.role} />}
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              {activeWorkspace
                ? activeBoard
                  ? `Active board "${activeBoard.name}" has ${allBoardCards.length} tracked ${
                      allBoardCards.length === 1 ? 'card' : 'cards'
                    } across ${lists.length} ${lists.length === 1 ? 'list' : 'lists'}.`
                  : `${activeWorkspace.name} has ${boards.length} ${
                      boards.length === 1 ? 'board' : 'boards'
                    } and ${members.length} ${members.length === 1 ? 'member' : 'members'}.`
                : 'Create a workspace or join an existing team with an invite code to start collaborating.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!activeWorkspace ? (
              <>
                <Button variant="secondary" icon={KeyRound} onClick={openJoinWorkspace}>
                  Join with Invite Code
                </Button>
                <Button variant="primary" icon={Plus} onClick={openCreateWorkspace}>
                  Create Workspace
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  icon={ArrowRight}
                  onClick={() => navigate('/board')}
                >
                  Open Board
                </Button>
                {lists.length > 0 ? (
                  <Button
                    variant="primary"
                    icon={Plus}
                    onClick={() => openCreateCard(lists[0].id)}
                  >
                    New Card
                  </Button>
                ) : (
                  <Button variant="primary" icon={Plus} onClick={openCreateBoard}>
                    New Board
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {!activeWorkspace ? (
        <EmptyState
          icon={Building2}
          title="You are not in a workspace yet"
          description="Workspaces organize boards, lists, cards, and team members cleanly."
          actionLabel="Create Workspace"
          onAction={openCreateWorkspace}
          secondaryActionLabel="Join with Invite Code"
          onSecondaryAction={openJoinWorkspace}
        />
      ) : (
        <>
          {/* Real Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Workspaces"
              value={workspaces.length}
              subtitle={`Active: ${activeWorkspace.name}`}
              icon={Building2}
              color="teal"
            />
            <StatCard
              title="Workspace Boards"
              value={boards.length}
              subtitle={activeBoard ? `Active: ${activeBoard.name}` : 'No active board'}
              icon={FolderKanban}
              color="slate"
            />
            <StatCard
              title="Team Members"
              value={members.length}
              subtitle={`Your role: ${activeWorkspace.role || 'member'}`}
              icon={Users}
              color="success"
            />
            <StatCard
              title="Active Board Cards"
              value={allBoardCards.length}
              subtitle={`${urgentOrHighCount} high/urgent priority`}
              icon={Columns3}
              color={urgentOrHighCount > 0 ? 'warning' : 'teal'}
            />
          </div>

          {/* Analytics Breakdown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardsByListChart />
            <TaskDistributionChart />
          </div>

          {/* Assigned Cards & Boards Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AssignedTasksList />
            <ProjectProgressCards />
          </div>
        </>
      )}
    </div>
  );
};
