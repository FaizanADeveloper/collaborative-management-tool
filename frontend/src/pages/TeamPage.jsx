import React, { useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { RoleBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Skeleton';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  Users,
  Plus,
  KeyRound,
  Mail,
  Copy,
  RefreshCw,
  UserMinus,
  LogOut,
  Shield,
  Calendar,
} from 'lucide-react';

export const TeamPage = () => {
  const { user } = useAuthStore();
  const {
    workspaces,
    activeWorkspaceId,
    activeWorkspaceDetails,
    members,
    isLoadingWorkspaces,
    isLoadingMembers,
    workspaceError,
    regenerateInviteCode,
    removeMember,
  } = useWorkspaceStore();
  const { openCreateWorkspace, openJoinWorkspace, addToast } = useUIStore();

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const activeWorkspace =
    activeWorkspaceDetails || workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const currentUserRole = activeWorkspace?.role;
  const canManageWorkspace = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleCopyInviteCode = async () => {
    const code = activeWorkspace?.inviteCode;
    if (!code) return;
    try {
      await navigator.clipboard?.writeText(code);
      addToast({
        type: 'success',
        title: 'Invite code copied',
        message: 'Share this code with teammates so they can join the workspace.',
      });
    } catch {
      addToast({
        type: 'info',
        title: 'Invite code',
        message: `Use code: ${code}`,
      });
    }
  };

  const handleRegenerateInvite = async () => {
    if (!activeWorkspace) return;
    setIsRegenerating(true);
    const result = await regenerateInviteCode(activeWorkspace.id);
    setIsRegenerating(false);

    if (!result.success) {
      addToast({
        type: 'error',
        title: 'Unable to regenerate code',
        message: result.error,
      });
      return;
    }

    addToast({
      type: 'success',
      title: 'Invite code updated',
      message: `New invitation code: ${result.inviteCode}`,
    });
  };

  const canRemoveTargetMember = (member) => {
    if (!user?.id || !member?.id) return false;
    const isSelf = member.id === user.id;
    if (isSelf) {
      return member.role !== 'owner';
    }
    if (currentUserRole === 'owner') {
      return member.role !== 'owner';
    }
    if (currentUserRole === 'admin') {
      return member.role === 'member';
    }
    return false;
  };

  const handleConfirmRemoval = async () => {
    if (!confirmTarget || !activeWorkspace) return;
    setIsRemoving(true);
    const isSelf = confirmTarget.id === user?.id;
    const result = await removeMember(activeWorkspace.id, confirmTarget.id, user?.id);
    setIsRemoving(false);

    if (!result.success) {
      addToast({
        type: 'error',
        title: isSelf ? 'Unable to leave workspace' : 'Unable to remove member',
        message: result.error,
      });
      return;
    }

    addToast({
      type: 'success',
      title: isSelf ? 'Left workspace' : 'Member removed',
      message: isSelf
        ? `You are no longer a member of ${activeWorkspace.name}.`
        : `${confirmTarget.name} was removed from ${activeWorkspace.name}.`,
    });
    setConfirmTarget(null);
  };

  if (isLoadingWorkspaces) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <EmptyState
        icon={Users}
        title="No active workspace"
        description="Create a new workspace or join an existing team with an invite code to view and manage collaborators."
        actionLabel="Create Workspace"
        onAction={openCreateWorkspace}
        secondaryActionLabel="Join with Invite Code"
        onSecondaryAction={openJoinWorkspace}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight">
              Team &amp; Membership
            </h1>
            {currentUserRole && <RoleBadge role={currentUserRole} />}
          </div>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Manage collaborators and invitations for <strong className="text-ink font-medium">{activeWorkspace.name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={KeyRound} onClick={openJoinWorkspace}>
            Join Another Workspace
          </Button>
          <Button variant="primary" icon={Plus} onClick={openCreateWorkspace}>
            New Workspace
          </Button>
        </div>
      </div>

      {workspaceError && (
        <div
          role="alert"
          className="rounded-xl bg-danger-subtle border border-danger/30 p-4 text-xs text-danger"
        >
          {workspaceError}
        </div>
      )}

      {/* Workspace Invitation Panel */}
      <div className="rounded-xl bg-surface border border-line p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand" />
              <h2 className="text-sm font-semibold text-ink">Workspace Invitation Code</h2>
            </div>
            <p className="text-xs text-ink-muted">
              {canManageWorkspace
                ? 'Teammates can use this code under "Join with Invite Code" to become workspace members.'
                : 'Workspace owners and admins manage invitation codes.'}
            </p>
          </div>

          {canManageWorkspace && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-subtle border border-line-strong font-mono text-sm font-semibold text-ink tracking-wider">
                {activeWorkspace.inviteCode || 'Unavailable'}
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={Copy}
                onClick={handleCopyInviteCode}
                disabled={!activeWorkspace.inviteCode}
              >
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                onClick={handleRegenerateInvite}
                loading={isRegenerating}
              >
                Regenerate
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Members List */}
      {isLoadingMembers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members loaded"
          description="Members belonging to this workspace will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const isSelf = member.id === user?.id;
            const canAct = canRemoveTargetMember(member);
            const joinedLabel = member.joinedAt
              ? new Date(member.joinedAt).toLocaleDateString()
              : null;

            return (
              <div
                key={member.id}
                className="rounded-xl bg-surface border border-line p-5 shadow-card flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar user={member} size="lg" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-ink truncate">
                          {member.name} {isSelf && <span className="text-xs text-ink-muted font-normal">(You)</span>}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      </div>
                    </div>
                    <RoleBadge role={member.role} />
                  </div>

                  {joinedLabel && (
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted pt-2 border-t border-line">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Joined {joinedLabel}</span>
                    </div>
                  )}
                </div>

                {canAct && (
                  <div className="flex justify-end pt-2 border-t border-line">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={isSelf ? LogOut : UserMinus}
                      className="text-danger hover:bg-danger-subtle hover:text-danger"
                      onClick={() => setConfirmTarget(member)}
                    >
                      {isSelf ? 'Leave Workspace' : 'Remove'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirmRemoval}
        loading={isRemoving}
        variant="danger"
        title={
          confirmTarget?.id === user?.id
            ? `Leave ${activeWorkspace.name}?`
            : `Remove ${confirmTarget?.name}?`
        }
        description={
          confirmTarget?.id === user?.id
            ? 'You will lose access to boards and cards in this workspace until re-invited.'
            : `${confirmTarget?.name} will lose access to this workspace and its boards.`
        }
        confirmLabel={confirmTarget?.id === user?.id ? 'Leave Workspace' : 'Remove Member'}
      />
    </div>
  );
};
