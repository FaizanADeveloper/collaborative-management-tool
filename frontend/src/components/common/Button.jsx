import React from 'react';

export const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconRight: IconRight,
      disabled = false,
      loading = false,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-lg select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

    const variants = {
      primary:
        'bg-brand hover:bg-brand-hover text-brand-fg border border-transparent shadow-card',
      secondary:
        'bg-surface hover:bg-subtle text-ink border border-line-strong shadow-card',
      ghost:
        'bg-transparent hover:bg-subtle text-ink-secondary hover:text-ink border border-transparent',
      danger:
        'bg-danger-solid hover:bg-danger-hover text-white border border-transparent shadow-card focus-visible:ring-danger',
      outline:
        'bg-transparent hover:bg-brand-subtle text-brand border border-brand/40',
      subtle:
        'bg-brand-subtle hover:bg-brand/20 text-brand border border-brand/25',
    };

    const sizes = {
      xs: 'px-2 py-1 text-xs gap-1',
      sm: 'px-2.5 py-1.5 text-xs gap-1.5',
      md: 'px-3.5 py-2 text-sm gap-2',
      lg: 'px-4 py-2.5 text-sm gap-2',
    };

    const iconSize = size === 'xs' || size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
        {...props}
      >
        {loading ? (
          <svg
            className={`animate-spin ${iconSize} text-current`}
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : Icon ? (
          <Icon className={`flex-shrink-0 ${iconSize}`} aria-hidden="true" />
        ) : null}

        {children && <span>{children}</span>}

        {IconRight && !loading && (
          <IconRight className={`flex-shrink-0 ${iconSize}`} aria-hidden="true" />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
