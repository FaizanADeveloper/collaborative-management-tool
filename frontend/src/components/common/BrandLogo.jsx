import React from 'react';

const sizeMap = {
  sm: {
    box: 'w-7 h-7 rounded-[7px]',
    svg: 'w-4 h-4',
    text: 'text-base',
  },
  md: {
    box: 'w-8 h-8 rounded-lg',
    svg: 'w-4 h-4',
    text: 'text-lg',
  },
  lg: {
    box: 'w-9 h-9 rounded-lg',
    svg: 'w-5 h-5',
    text: 'text-xl',
  },
};

export const BrandMark = ({ size = 'md', className = '' }) => {
  const dims = sizeMap[size] || sizeMap.md;

  return (
    <span
      className={`inline-flex items-center justify-center bg-brand text-white flex-shrink-0 ${dims.box} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={dims.svg}
      >
        <rect x="4" y="4.5" width="5.2" height="15" rx="1.4" fill="currentColor" />
        <rect x="11.2" y="4.5" width="8.8" height="5.2" rx="1.4" fill="currentColor" />
        <rect x="11.2" y="11.5" width="6.4" height="5.2" rx="1.4" fill="currentColor" opacity="0.8" />
      </svg>
    </span>
  );
};

export const BrandLogo = ({
  size = 'md',
  showWordmark = true,
  subtitle = '',
  className = '',
}) => {
  const dims = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={`font-semibold tracking-tight text-ink ${dims.text}`}>
            Flowdesk
          </span>
          {subtitle && (
            <span className="text-[11px] font-normal text-ink-muted mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

