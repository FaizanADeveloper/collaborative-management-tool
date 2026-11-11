import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { CommandPalette } from './components/layout/CommandPalette';
import { TaskCreateModal } from './components/tasks/TaskCreateModal';
import { TaskDetailsDrawer } from './components/tasks/TaskDetailsDrawer';
import { ProjectCreateModal } from './components/projects/ProjectCreateModal';

import { DashboardPage } from './pages/DashboardPage';
import { BoardPage } from './pages/BoardPage';
import { BacklogPage } from './pages/BacklogPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { TeamPage } from './pages/TeamPage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';

import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

import { useUIStore } from './store/useUIStore';
import { useAuthStore } from './store/useAuthStore';

// Main App Shell Layout
const AppLayout = ({ children }) => {
  const { sidebarCollapsed, theme, simulatePing } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  // Keep theme class in sync with html tag
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Periodic simulated latency ping jitter
  useEffect(() => {
    const timer = setInterval(() => {
      simulatePing();
    }, 6000);
    return () => clearInterval(timer);
  }, [simulatePing]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Fixed Left Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'pl-16' : 'pl-64'
        }`}
      >
        {/* Top Navbar */}
        <Navbar />

        {/* Page Content Body */}
        <main className="flex-1 pt-14 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Interactive Modals & Drawers */}
      <CommandPalette />
      <TaskCreateModal />
      <ProjectCreateModal />
      <TaskDetailsDrawer />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected App Routes wrapped in AppLayout */}
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
          path="/backlog"
          element={
            <AppLayout>
              <BacklogPage />
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
          path="/activity"
          element={
            <AppLayout>
              <ActivityPage />
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

        {/* Catch-all to Dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

