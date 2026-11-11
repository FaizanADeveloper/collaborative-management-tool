import React from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { StatCard } from '../components/dashboard/StatCard';
import { BurndownChart } from '../components/dashboard/BurndownChart';
import { VelocityChart } from '../components/dashboard/VelocityChart';
import { TaskDistributionChart } from '../components/dashboard/TaskDistributionChart';
import { RecentActivityFeed } from '../components/dashboard/RecentActivityFeed';
import { AssignedTasksList } from '../components/dashboard/AssignedTasksList';
import { ProjectProgressCards } from '../components/dashboard/ProjectProgressCards';
import { Button } from '../components/common/Button';
import {
  FolderKanban,
  CheckCircle,
  Clock,
  Flame,
  Plus,
  Zap,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const { tasks, projects } = useWorkspaceStore();
  const { openCreateTask, openCreateProject } = useUIStore();
  const navigate = useNavigate();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const pendingTasks = tasks.filter(t => t.status === 'todo').length;
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-[#0d1321] border border-indigo-900/30 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sprint 24 • Real-Time Engine Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'Team'} 👋
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your workspace is running at <strong>{completionRate}%</strong> completion for this sprint cycle. 
              {urgentTasks > 0 ? ` There are ${urgentTasks} urgent blocker items requiring review.` : ' All critical paths are currently unblocked.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/board')}
              iconRight={ArrowRight}
            >
              Open Kanban Board
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => openCreateTask('todo')}
            >
              New Issue
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Initiatives"
          value={projects.length}
          subtitle="4 active engineering tracks"
          icon={FolderKanban}
          color="indigo"
          trend="+12%"
          trendDirection="up"
        />

        <StatCard
          title="Tasks Completed"
          value={completedTasks}
          subtitle={`${completionRate}% of planned sprint`}
          icon={CheckCircle}
          color="emerald"
          trend="+8%"
          trendDirection="up"
        />

        <StatCard
          title="In Progress"
          value={inProgressTasks}
          subtitle="Currently active in sprint"
          icon={Clock}
          color="sky"
        />

        <StatCard
          title="Blockers & Urgent"
          value={urgentTasks}
          subtitle={urgentTasks > 0 ? 'Requires attention' : 'Zero blockers'}
          icon={Flame}
          color={urgentTasks > 0 ? 'rose' : 'emerald'}
          trendDirection={urgentTasks > 0 ? 'down' : 'up'}
        />
      </div>

      {/* Sprint Analytics Section: Burndown & Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BurndownChart />
        <VelocityChart />
      </div>

      {/* Middle Row: Status Distribution & Assigned Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TaskDistributionChart />
        </div>
        <div className="lg:col-span-2">
          <AssignedTasksList />
        </div>
      </div>

      {/* Bottom Row: Active Initiatives & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProjectProgressCards />
        </div>
        <div className="lg:col-span-1">
          <RecentActivityFeed limit={5} />
        </div>
      </div>
    </div>
  );
};

