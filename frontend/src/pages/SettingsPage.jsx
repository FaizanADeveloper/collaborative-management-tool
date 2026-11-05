import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useUIStore } from '../store/useUIStore';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import {
  Settings,
  User,
  Bell,
  Palette,
  Shield,
  RotateCcw,
  Check,
  Moon,
  Sun,
  Zap
} from 'lucide-react';

export const SettingsPage = () => {
  const { user, updateProfile } = useAuthStore();
  const { resetAllData } = useWorkspaceStore();
  const { theme, toggleTheme } = useUIStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [mentionNotifs, setMentionNotifs] = useState(true);
  const [sprintDigest, setSprintDigest] = useState(true);

  const handleProfileSave = (e) => {
    e.preventDefault();
    updateProfile({ name, email, role, department });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all tasks, projects, and activities to default showcase data?')) {
      resetAllData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>Workspace & Account Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your personal profile, notification thresholds, and team preferences.
        </p>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <User className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-100">Profile Information</h3>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar user={{ name, avatar: user?.avatar }} size="xl" />
            <div>
              <p className="text-sm font-semibold text-white">{name || 'Your Name'}</p>
              <p className="text-xs text-slate-400">{role || 'Role'}</p>
              <span className="text-[11px] text-indigo-400 font-mono mt-1 block">
                Avatar synced with workspace presence
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Job Title / Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
            <Input
              label="Department / Squad"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <Check className="w-4 h-4" /> Profile updated successfully!
              </span>
            ) : <div />}

            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Appearance & Theme Section */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Palette className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-100">Appearance & Theme</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Color Mode</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Switch between Dark Mode (Linear-inspired) and Light Mode.
            </p>
          </div>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark Theme (Active)</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light Theme (Active)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Bell className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-100">Notification Preferences</h3>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/40 cursor-pointer">
            <div>
              <span className="text-xs font-medium text-slate-200 block">Task Assignment Alerts</span>
              <span className="text-[11px] text-slate-400">Receive in-app & socket notifications when issues are assigned to you</span>
            </div>
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/40 cursor-pointer">
            <div>
              <span className="text-xs font-medium text-slate-200 block">@Mention Notifications</span>
              <span className="text-[11px] text-slate-400">Notify immediately when teammate tags you in comments</span>
            </div>
            <input
              type="checkbox"
              checked={mentionNotifs}
              onChange={(e) => setMentionNotifs(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/40 cursor-pointer">
            <div>
              <span className="text-xs font-medium text-slate-200 block">Sprint Velocity Summary</span>
              <span className="text-[11px] text-slate-400">Daily burndown trajectory update banner</span>
            </div>
            <input
              type="checkbox"
              checked={sprintDigest}
              onChange={(e) => setSprintDigest(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
          </label>
        </div>
      </div>

      {/* Danger Zone: Reseed Mock Data */}
      <div className="rounded-xl bg-rose-950/20 border border-rose-900/40 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2">
          <RotateCcw className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-semibold text-rose-300">Demo Reset Zone</h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-300 font-medium">Reset sample workspace data</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Restores initial realistic tasks, projects, sprints, and comments if you wish to reset your changes.
            </p>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={handleResetData}
            icon={RotateCcw}
          >
            Reset to Defaults
          </Button>
        </div>

        {resetSuccess && (
          <p className="text-xs text-emerald-400 font-medium">
            Workspace data successfully restored to fresh showcase state!
          </p>
        )}
      </div>
    </div>
  );
};

