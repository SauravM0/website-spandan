/** @type {import('tailwindcss').Config} */

// Colors are defined once in src/styles/globals.css (:root) and referenced here.
// Solid tokens are stored as "R G B" channels so opacity modifiers work
// (e.g. bg-danger/10, ring-accent/10). Composite tokens already carry alpha.
const channel = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'var(--font-devanagari)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'Cambria', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: channel('accent'),
          light: channel('accent-light'),
        },
        primary: {
          DEFAULT: channel('primary'),
          light: channel('primary-light'),
        },
        blush: {
          DEFAULT: channel('blush'),
          deep: channel('blush-deep'),
          soft: channel('blush-soft'),
        },
        warm: channel('warm'),
        ink: {
          DEFAULT: channel('ink'),
          soft: channel('ink-soft'),
        },
        success: channel('success'),
        danger: channel('danger'),
        text: {
          DEFAULT: channel('text'),
          light: channel('text-light'),
        },
        sand: 'var(--color-sand)',
        'bg-alt': 'var(--color-bg-alt)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        'wash-pink': 'var(--color-wash-pink)',
        'wash-blush': 'var(--color-wash-blush)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-xl)',
        '3xl': 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        none: 'none',
      },
      fontSize: {
        xs: 'var(--step--1)',
        sm: ['0.9375rem', { lineHeight: '1.55' }],
        base: ['var(--step-0)', { lineHeight: '1.65' }],
        lg: ['var(--step-1)', { lineHeight: '1.55' }],
        xl: ['var(--step-2)', { lineHeight: '1.35' }],
        '2xl': ['var(--step-3)', { lineHeight: '1.25' }],
        '3xl': ['var(--step-4)', { lineHeight: '1.15' }],
        '4xl': ['var(--step-4)', { lineHeight: '1.12' }],
        '5xl': ['var(--step-5)', { lineHeight: '1.06' }],
      },
      spacing: {
        section: 'var(--space-section)',
        'section-tight': 'var(--space-section-tight)',
      },
    },
  },
  plugins: [],
};
