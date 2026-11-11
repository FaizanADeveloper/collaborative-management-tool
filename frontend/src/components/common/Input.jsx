import React, { useId } from 'react';

export const Input = React.forwardRef(
  (
    {
      label,
      error,
      icon: Icon,
      iconRight: IconRight,
      helperText,
      className = '',
      containerClassName = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-ink-secondary mb-1.5 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-lg">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : undefined}
            className={`block w-full rounded-lg bg-surface border text-ink placeholder-ink-muted text-sm transition-colors duration-150 focus:outline-none focus:ring-2 ${
              Icon ? 'pl-9' : 'pl-3'
            } ${IconRight ? 'pr-9' : 'pr-3'} py-2 ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
                : 'border-line-strong hover:border-ink-muted/60 focus:border-brand focus:ring-brand/25'
            } ${className}`}
            {...props}
          />
          {IconRight && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-muted">
              <IconRight className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
        </div>
        {error ? (
          <p role="alert" className="mt-1.5 text-xs text-rose-500 dark:text-rose-400">
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-ink-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const Textarea = React.forwardRef(
  ({ label, error, helperText, className = '', containerClassName = '', id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-medium text-ink-secondary mb-1.5 select-none"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? 'true' : undefined}
          className={`block w-full rounded-lg bg-surface border text-ink placeholder-ink-muted text-sm p-3 transition-colors duration-150 focus:outline-none focus:ring-2 ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
              : 'border-line-strong hover:border-ink-muted/60 focus:border-brand focus:ring-brand/25'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p role="alert" className="mt-1.5 text-xs text-rose-500 dark:text-rose-400">
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-ink-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export const Select = React.forwardRef(
  ({ label, error, children, className = '', containerClassName = '', id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-ink-secondary mb-1.5 select-none"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? 'true' : undefined}
          className={`block w-full rounded-lg bg-surface border border-line-strong text-ink text-sm py-2 px-3 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-colors ${
            error ? 'border-rose-500' : ''
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-rose-500 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
