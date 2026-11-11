import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { CommandPalette } from './components/layout/CommandPalette';
import { TaskCreateModal } from './components/tasks/TaskCreateModal';
import { TaskDetailsDrawer } from './components/tasks/TaskDetailsDrawer';
import { ProjectCreateModal } from './components/projects/ProjectCreateModal';
import { WorkspaceCreateModal } from './components/workspaces/WorkspaceCreateModal';
import { JoinWorkspaceModal } from './components/workspaces/JoinWorkspaceModal';
import { ToastContainer } from './components/common/ToastContainer';

import { DashboardPage } from './pages/DashboardPage';
import { BoardPage } from './pages/BoardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';

import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';

import { useUIStore } from './store/useUIStore';
import { useAuthStore } from './store/useAuthStore';
import { useWorkspaceStore } from './store/useWorkspaceStore';

const HydrationLoader = () => (
  <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6">
    <div className="flex flex-col items-center gap-3">
      <div className="w-7 h-7 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      <p className="text-xs text-ink-muted font-medium">Restoring session...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isHydrating } = useAuthStore();
  const location = useLocation();

  if (isHydrating) {
    return <HydrationLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isHydrating } = useAuthStore();
  const location = useLocation();

  if (isHydrating) {
    return <HydrationLoader />;
  }

  if (isAuthenticated) {
    const target = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={target} replace />;
  }

  return children;
};

const AppLayout = ({ children }) => {
  const { sidebarCollapsed, theme } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const { hasLoadedWorkspaces, isLoadingWorkspaces, fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (isAuthenticated && !hasLoadedWorkspaces && !isLoadingWorkspaces) {
      fetchWorkspaces();
    }
  }, [isAuthenticated, hasLoadedWorkspaces, isLoadingWorkspaces, fetchWorkspaces]);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <Sidebar />

      <div
        className={`flex-1 flex flex-col transition-all duration-200 pl-0 ${
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
        }`}
      >
        <Navbar />

        <main className="flex-1 pt-14 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <CommandPalette />
      <WorkspaceCreateModal />
      <JoinWorkspaceModal />
      <TaskCreateModal />
      <ProjectCreateModal />
      <TaskDetailsDrawer />
      <ToastContainer />
    </div>
  );
};

export function AppRoutes() {
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/board"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BoardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProjectsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProjectDetailsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TeamPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
