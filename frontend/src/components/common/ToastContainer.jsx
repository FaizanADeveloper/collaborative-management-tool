import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  const styles = {
    success:
      'bg-elevated border-emerald-500/40 text-ink',
    error:
      'bg-elevated border-rose-500/40 text-ink',
    info:
      'bg-elevated border-line-strong text-ink',
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-brand flex-shrink-0" />,
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3.5 shadow-lg ${
            styles[toast.type] || styles.info
          }`}
        >
          <div className="mt-0.5">{icons[toast.type] || icons.info}</div>
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-xs font-semibold text-ink">{toast.title}</p>
            )}
            {toast.message && (
              <p className="text-xs text-ink-secondary mt-0.5 leading-snug">
                {toast.message}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
            className="rounded p-1 text-ink-muted hover:text-ink hover:bg-subtle transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
