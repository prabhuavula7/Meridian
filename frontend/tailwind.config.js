/** @type {import('tailwindcss').Config} */
const colorVar = (name) => `rgb(var(${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          base: colorVar('--bg-base'),
          deep: colorVar('--bg-deep'),
          elevated: colorVar('--bg-elevated'),
        },
        surface: {
          DEFAULT: colorVar('--surface'),
          hover: colorVar('--surface-hover'),
          active: colorVar('--surface-active'),
          glass: colorVar('--surface-glass'),
        },
        foreground: {
          DEFAULT: colorVar('--fg-primary'),
          muted: colorVar('--fg-muted'),
          subtle: colorVar('--fg-subtle'),
        },
        border: {
          DEFAULT: colorVar('--border-default'),
          hover: colorVar('--border-hover'),
          accent: colorVar('--border-accent'),
        },
        accent: {
          DEFAULT: colorVar('--accent-base'),
          hover: colorVar('--accent-hover'),
          glow: colorVar('--accent-glow'),
        },
        gold: {
          DEFAULT: colorVar('--gold-base'),
          glow: colorVar('--gold-glow'),
        },
        focus: colorVar('--focus-ring'),
        success: colorVar('--success'),
        warning: colorVar('--warning'),
        danger: colorVar('--danger'),
        info: colorVar('--info'),
        dark: {
          50: '#f7f7f8',
          100: '#e3e5ea',
          200: '#b6bac3',
          300: '#8a8f98',
          400: '#656a77',
          500: '#3f4351',
          600: '#2f323c',
          700: '#1f2128',
          800: '#131319',
          900: '#0b0b0e',
          950: '#050506',
        },
        primary: {
          50: '#f4f1ff',
          100: '#ebe4ff',
          200: '#d9c9ff',
          300: '#bda3ff',
          400: '#9b73ff',
          500: '#7b45e6',
          600: '#642fbe',
          700: '#51258f',
          800: '#3d1c68',
          900: '#2a1347',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Manrope', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        elevated: 'var(--shadow-elevated)',
        floating: 'var(--shadow-floating)',
        glow: 'var(--shadow-glow)',
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'blob-float': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(0, -12px, 0) scale(1.04)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        'blob-float': 'blob-float 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
