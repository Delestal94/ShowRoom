import type { Config } from 'tailwindcss'

/** Wraps an OKLCH channel token so Tailwind can inject opacity modifiers. */
const token = (name: string) => `oklch(var(--${name}) / <alpha-value>)`

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: {
          DEFAULT: token('surface'),
          2: token('surface-2'),
        },
        border: {
          DEFAULT: token('border'),
          strong: token('border-strong'),
        },
        fg: {
          DEFAULT: token('fg'),
          muted: token('fg-muted'),
          subtle: token('fg-subtle'),
        },
        primary: {
          DEFAULT: token('primary'),
          fg: token('primary-fg'),
        },
        accent: {
          DEFAULT: token('accent'),
          fg: token('accent-fg'),
        },
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 16px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Fluid display sizes — scale with the viewport, no breakpoint jumps
        display: ['clamp(2.75rem, 1.6rem + 5.2vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.035em' }],
        headline: ['clamp(2rem, 1.3rem + 3vw, 3.5rem)', { lineHeight: '1.05', letterSpacing: '-0.028em' }],
        title: ['clamp(1.375rem, 1.1rem + 1.2vw, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        lead: ['clamp(1.0625rem, 1rem + 0.4vw, 1.25rem)', { lineHeight: '1.6' }],
      },
      maxWidth: {
        prose: '68ch',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.5s ease-out both',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
}

export default config
