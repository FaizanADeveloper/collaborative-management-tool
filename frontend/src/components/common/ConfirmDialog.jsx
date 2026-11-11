import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm action',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg flex-shrink-0 ${
              variant === 'danger'
                ? 'bg-danger-subtle text-danger border border-danger/25'
                : 'bg-warning-subtle text-warning border border-warning/25'
            }`}
          >
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
