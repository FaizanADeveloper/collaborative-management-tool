/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--bg-canvas-rgb) / <alpha-value>)',
        sidebar: 'rgb(var(--bg-sidebar-rgb) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
        subtle: 'rgb(var(--bg-subtle-rgb) / <alpha-value>)',
        elevated: 'rgb(var(--bg-elevated-rgb) / <alpha-value>)',
        line: 'rgb(var(--border-subtle-rgb) / <alpha-value>)',
        'line-strong': 'rgb(var(--border-strong-rgb) / <alpha-value>)',
        ink: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
        'ink-secondary': 'rgb(var(--text-secondary-rgb) / <alpha-value>)',
        'ink-muted': 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover-rgb) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg-rgb) / <alpha-value>)',
          subtle: 'var(--accent-subtle)',
        },
        'brand-secondary': {
          DEFAULT: 'rgb(var(--accent-secondary-rgb) / <alpha-value>)',
          subtle: 'var(--accent-secondary-subtle)',
        },
        success: {
          DEFAULT: 'rgb(var(--success-rgb) / <alpha-value>)',
          subtle: 'var(--success-subtle)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning-rgb) / <alpha-value>)',
          subtle: 'var(--warning-subtle)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger-rgb) / <alpha-value>)',
          solid: 'rgb(var(--danger-solid-rgb) / <alpha-value>)',
          hover: 'rgb(var(--danger-hover-rgb) / <alpha-value>)',
          subtle: 'var(--danger-subtle)',
        },
        info: {
          DEFAULT: 'rgb(var(--info-rgb) / <alpha-value>)',
          subtle: 'var(--info-subtle)',
        },
        overlay: 'var(--overlay-bg)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        popover: 'var(--shadow-popover)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};