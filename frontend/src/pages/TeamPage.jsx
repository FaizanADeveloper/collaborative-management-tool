import React, { useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input, Select } from '../components/common/Input';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TeamPage = () => {
  const { users, tasks, setFilter, resetFilters } = useWorkspaceStore();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Frontend Engineer');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const navigate = useNavigate();

  const handleInvite = (e) => {
    e.preventDefault();
    if (inviteEmail) {
      setInviteSuccess(true);
      setTimeout(() => {
        setInviteSuccess(false);
        setInviteEmail('');
        setInviteModalOpen(false);
      }, 1500);
    }
  };

  const handleViewMemberTasks = (userId) => {
    resetFilters();
    setFilter('assigneeId', userId);
    navigate('/board');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Team Workspace & Presence
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time collaborator presence, capacity utilization, and assigned ownership.
          </p>
        </div>

        <Button
          variant="primary"
          icon={UserPlus}
          onClick={() => setInviteModalOpen(true)}
        >
          Invite Teammate
        </Button>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {users.map((member) => {
          const memberTasks = tasks.filter(t => t.assigneeId === member.id);
          const activeTasks = memberTasks.filter(t => t.status !== 'completed').length;
          const completedTasks = memberTasks.filter(t => t.status === 'completed').length;
          const totalPoints = memberTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);

          return (
            <div
              key={member.id}
              className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar user={member} size="lg" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">
                        {member.name}
                      </h3>
                      <p className="text-xs text-indigo-400 font-medium truncate">
                        {member.role}
                      </p>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {member.department}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono capitalize ${
                      member.status === 'online'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                        : member.status === 'away'
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    ● {member.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{member.email}</span>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800/60">
                {/* Workload metric */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Sprint Capacity</span>
                    <span className="text-slate-200 font-semibold">{totalPoints} story pts</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.min(100, (totalPoints / 25) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">
                    <strong className="text-slate-200">{activeTasks}</strong> in-flight • <strong className="text-emerald-400">{completedTasks}</strong> done
                  </span>

                  <button
                    onClick={() => handleViewMemberTasks(member.id)}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View Issues →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Collaborator to Workspace"
        subtitle="Grant role-based access to projects, boards, and real-time sprint sessions."
        maxWidth="max-w-md"
      >
        {inviteSuccess ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-white">Invitation Dispatched!</h4>
            <p className="text-xs text-slate-400">A magic login link has been sent to {inviteEmail}.</p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <Input
              label="Work Email *"
              type="email"
              placeholder="e.g. colleague@acme.corp"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              autoFocus
            />

            <Select
              label="Team Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="Senior Frontend Engineer">Senior Frontend Engineer</option>
              <option value="Backend Engineer">Backend Engineer</option>
              <option value="Product Designer">Product Designer</option>
              <option value="Product Manager">Product Manager</option>
              <option value="QA Engineer">QA Automation Engineer</option>
            </Select>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <Button type="button" variant="ghost" onClick={() => setInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Send Invitation
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

