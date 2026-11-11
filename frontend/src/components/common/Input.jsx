import React from 'react';

export const Input = React.forwardRef(({
  label,
  error,
  icon: Icon,
  iconRight: IconRight,
  helperText,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label className="block text-xs font-medium text-slate-300 mb-1.5 select-none">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          ref={ref}
          className={`block w-full rounded-lg bg-slate-900/80 border text-slate-100 placeholder-slate-500 text-sm transition-colors duration-150 focus:outline-none focus:ring-1 ${
            Icon ? 'pl-9' : 'pl-3'
          } ${IconRight ? 'pr-9' : 'pr-3'} py-2 ${
            error
              ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500'
              : 'border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500'
          } ${className}`}
          {...props}
        />
        {IconRight && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <IconRight className="h-4 w-4" />
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export const Select = React.forwardRef(({
  label,
  error,
  children,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label className="block text-xs font-medium text-slate-300 mb-1.5 select-none">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`block w-full rounded-lg bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm py-2 px-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors ${
          error ? 'border-rose-500/80' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';

