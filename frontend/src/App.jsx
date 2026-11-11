import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { CommandPalette } from './components/layout/CommandPalette';
import { TaskCreateModal } from './components/tasks/TaskCreateModal';
import { TaskDetailsDrawer } from './components/tasks/TaskDetailsDrawer';
import { ProjectCreateModal } from './components/projects/ProjectCreateModal';
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

const AppLayout = ({ children }) => {
  const { sidebarCollapsed, theme } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

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
      <TaskCreateModal />
      <ProjectCreateModal />
      <TaskDetailsDrawer />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/register" element={<SignupPage />} />

        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          }
        />
        <Route
          path="/board"
          element={
            <AppLayout>
              <BoardPage />
            </AppLayout>
          }
        />
        <Route
          path="/projects"
          element={
            <AppLayout>
              <ProjectsPage />
            </AppLayout>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <AppLayout>
              <ProjectDetailsPage />
            </AppLayout>
          }
        />
        <Route
          path="/team"
          element={
            <AppLayout>
              <TeamPage />
            </AppLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
