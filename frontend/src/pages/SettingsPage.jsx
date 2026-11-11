import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useUIStore } from '../store/useUIStore';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { Input, Textarea } from '../components/common/Input';
import { RoleBadge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import {
  Settings,
  User,
  Palette,
  Building2,
  Trash2,
  LogOut,
  Moon,
  Sun,
  AlertCircle,
} from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuthStore();
  const {
    workspaces,
    activeWorkspaceId,
    activeWorkspaceDetails,
    updateWorkspace,
    deleteWorkspace,
    removeMember,
  } = useWorkspaceStore();
  const { theme, toggleTheme, openCreateWorkspace, openJoinWorkspace, addToast } = useUIStore();

  const activeWorkspace =
    activeWorkspaceDetails || workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const role = activeWorkspace?.role;
  const canEditWorkspace = role === 'owner' || role === 'admin';
  const isOwner = role === 'owner';

  const [wsName, setWsName] = useState(activeWorkspace?.name || '');
  const [wsDescription, setWsDescription] = useState(activeWorkspace?.description || '');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [isDangerSubmitting, setIsDangerSubmitting] = useState(false);

  useEffect(() => {
    setWsName(activeWorkspace?.name || '');
    setWsDescription(activeWorkspace?.description || '');
    setFieldErrors({});
    setFormError('');
  }, [activeWorkspace?.id, activeWorkspace?.name, activeWorkspace?.description]);

  const validateWorkspace = () => {
    const errors = {};
    const trimmedName = wsName.trim();
    const trimmedDesc = wsDescription.trim();

    if (!trimmedName) {
      errors.name = 'Workspace name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Workspace name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      errors.name = 'Workspace name cannot exceed 100 characters';
    }

    if (trimmedDesc.length > 500) {
      errors.description = 'Workspace description cannot exceed 500 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveWorkspace = async (e) => {
    e.preventDefault();
    if (!activeWorkspace || !canEditWorkspace) return;
    setFormError('');
    if (!validateWorkspace()) return;

    setIsSavingWorkspace(true);
    const result = await updateWorkspace(activeWorkspace.id, {
      name: wsName.trim(),
      description: wsDescription.trim(),
    });
    setIsSavingWorkspace(false);

    if (!result.success) {
      setFormError(result.error || 'Unable to update workspace');
      if (result.fieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors }));
      }
      return;
    }

    addToast({
      type: 'success',
      title: 'Workspace updated',
      message: `${result.workspace.name} settings saved.`,
    });
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    setIsDangerSubmitting(true);
    const result = await deleteWorkspace(activeWorkspace.id);
    setIsDangerSubmitting(false);

    if (!result.success) {
      addToast({
        type: 'error',
        title: 'Delete failed',
        message: result.error,
      });
      return;
    }

    addToast({
      type: 'success',
      title: 'Workspace deleted',
      message: `${activeWorkspace.name} and its boards were permanently deleted.`,
    });
    setConfirmDeleteOpen(false);
  };

  const handleLeaveWorkspace = async () => {
    if (!activeWorkspace || !user?.id) return;
    setIsDangerSubmitting(true);
    const result = await removeMember(activeWorkspace.id, user.id, user.id);
    setIsDangerSubmitting(false);

    if (!result.success) {
      addToast({
        type: 'error',
        title: 'Unable to leave workspace',
        message: result.error,
      });
      return;
    }

    addToast({
      type: 'success',
      title: 'Left workspace',
      message: `You have left ${activeWorkspace.name}.`,
    });
    setConfirmLeaveOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand" />
          <span>Workspace &amp; Account Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          View your account details, switch color themes, and manage workspace configuration.
        </p>
      </div>

      {/* Account Information */}
      <section className="rounded-xl bg-surface border border-line p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-line">
          <User className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-ink">Signed-in Account</h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Avatar user={user} size="xl" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-ink">{user?.name || 'User'}</p>
            <p className="text-xs text-ink-secondary">{user?.email}</p>
            {user?.createdAt && (
              <p className="text-[11px] text-ink-muted">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Appearance & Theme */}
      <section className="rounded-xl bg-surface border border-line p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-line">
          <Palette className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-ink">Appearance</h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold text-ink">Color Theme</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Switch between Light Mode and Dark Mode across the workspace interface.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={toggleTheme}
            icon={theme === 'dark' ? Moon : Sun}
          >
            {theme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}
          </Button>
        </div>
      </section>

      {/* Active Workspace Configuration */}
      {!activeWorkspace ? (
        <EmptyState
          icon={Building2}
          title="No active workspace selected"
          description="Create or join a workspace to configure its settings."
          actionLabel="Create Workspace"
          onAction={openCreateWorkspace}
          secondaryActionLabel="Join with Invite Code"
          onSecondaryAction={openJoinWorkspace}
        />
      ) : (
        <>
          <section className="rounded-xl bg-surface border border-line p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand" />
                <h2 className="text-sm font-semibold text-ink">Active Workspace Details</h2>
              </div>
              {role && <RoleBadge role={role} />}
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-danger-subtle border border-danger/30 p-3 text-xs text-danger"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveWorkspace} className="space-y-4" noValidate>
              <Input
                label="Workspace Name"
                value={wsName}
                onChange={(e) => {
                  setWsName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                }}
                error={fieldErrors.name}
                disabled={!canEditWorkspace}
              />

              <Textarea
                label="Workspace Description"
                rows={3}
                value={wsDescription}
                onChange={(e) => {
                  setWsDescription(e.target.value);
                  if (fieldErrors.description) setFieldErrors((p) => ({ ...p, description: undefined }));
                }}
                error={fieldErrors.description}
                disabled={!canEditWorkspace}
              />

              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-xs text-ink-muted">
                  {canEditWorkspace
                    ? 'Changes apply to all members of this workspace.'
                    : 'Only workspace owners and admins can edit workspace details.'}
                </p>

                {canEditWorkspace && (
                  <Button type="submit" variant="primary" size="sm" loading={isSavingWorkspace}>
                    Save Workspace
                  </Button>
                )}
              </div>
            </form>
          </section>

          {/* Danger Zone */}
          <section className="rounded-xl bg-danger-subtle border border-danger/30 p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-danger/20">
              <Trash2 className="w-4 h-4 text-danger" />
              <h2 className="text-sm font-semibold text-danger">Danger Zone</h2>
            </div>

            {isOwner ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-ink">Delete this workspace</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Permanently deletes {activeWorkspace.name} along with all its boards, lists, cards, and memberships.
                  </p>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  Delete Workspace
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-ink">Leave this workspace</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Remove yourself from {activeWorkspace.name}. An invite code will be required to rejoin later.
                  </p>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  icon={LogOut}
                  onClick={() => setConfirmLeaveOpen(true)}
                >
                  Leave Workspace
                </Button>
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteWorkspace}
        loading={isDangerSubmitting}
        variant="danger"
        title={`Delete ${activeWorkspace?.name || 'workspace'}?`}
        description="This action cannot be undone. All boards, lists, cards, and member records inside this workspace will be permanently deleted."
        confirmLabel="Delete Workspace"
      />

      <ConfirmDialog
        isOpen={confirmLeaveOpen}
        onClose={() => setConfirmLeaveOpen(false)}
        onConfirm={handleLeaveWorkspace}
        loading={isDangerSubmitting}
        variant="danger"
        title={`Leave ${activeWorkspace?.name || 'workspace'}?`}
        description="You will immediately lose access to all boards and cards inside this workspace."
        confirmLabel="Leave Workspace"
      />
    </div>
  );
};
