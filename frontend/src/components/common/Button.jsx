import React from 'react';

export const Button = React.forwardRef(({
  children,
  variant = 'primary', // 'primary', 'secondary', 'ghost', 'danger', 'outline', 'subtle'
  size = 'md', // 'xs', 'sm', 'md', 'lg'
  icon: Icon,
  iconRight: IconRight,
  disabled = false,
  loading = false,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg select-none focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-indigo-500/20 focus:ring-indigo-500 focus:ring-offset-slate-900 border border-indigo-500/30',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white border border-slate-700/60 shadow-sm focus:ring-slate-500 focus:ring-offset-slate-900',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-100 focus:ring-slate-600 focus:ring-offset-slate-900',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm hover:shadow-rose-500/20 focus:ring-rose-500 focus:ring-offset-slate-900',
    outline: 'bg-transparent hover:bg-indigo-600/10 text-indigo-400 hover:text-indigo-300 border border-indigo-500/40 focus:ring-indigo-500 focus:ring-offset-slate-900',
    subtle: 'bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-800/40 focus:ring-indigo-500 focus:ring-offset-slate-900'
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs gap-1',
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-0.5 mr-1.5 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon ? (
        <Icon className={`flex-shrink-0 ${size === 'xs' || size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      ) : null}
      
      <span>{children}</span>

      {IconRight && !loading && (
        <IconRight className={`flex-shrink-0 ${size === 'xs' || size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      )}
    </button>
  );
});

Button.displayName = 'Button';

