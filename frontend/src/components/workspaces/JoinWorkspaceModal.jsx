import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { AlertCircle, KeyRound } from 'lucide-react';

export const JoinWorkspaceModal = () => {
  const { isJoinWorkspaceOpen, closeJoinWorkspace, addToast } = useUIStore();
  const { joinByInviteCode } = useWorkspaceStore();

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isJoinWorkspaceOpen) {
      setInviteCode('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isJoinWorkspaceOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = inviteCode.trim();
    if (trimmed.length < 4) {
      setError('Invite code must be at least 4 characters');
      return;
    }

    setError('');
    setIsSubmitting(true);
    const result = await joinByInviteCode(trimmed);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Unable to join workspace with that invite code');
      return;
    }

    addToast({
      type: 'success',
      title: 'Joined workspace',
      message: `Switched active workspace to ${result.workspace.name}.`,
    });
    closeJoinWorkspace();
  };

  return (
    <Modal
      isOpen={isJoinWorkspaceOpen}
      onClose={closeJoinWorkspace}
      title="Join Workspace"
      subtitle="Enter a workspace invitation code shared by an owner or admin."
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Invitation Code *"
          icon={KeyRound}
          placeholder="e.g. A1B2C3D4"
          value={inviteCode}
          onChange={(e) => {
            setInviteCode(e.target.value);
            if (error) setError('');
          }}
          autoFocus
        />

        <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={closeJoinWorkspace} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Join Workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
};
