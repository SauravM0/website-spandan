/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#2E86C1',
          light: '#5DADE2',
        },
        accent: {
          DEFAULT: '#0F766E',
          light: '#14B8A6',
        },
        navy: {
          DEFAULT: '#12324A',
          light: '#214B68',
        },
        warm: '#F59E0B',
        'bg-alt': '#F7FAFC',
        border: '#d0d5dd',
        success: '#059669',
        danger: '#dc2626',
        text: {
          DEFAULT: '#2B2B2B',
          light: '#555555',
        },
      },
    },
  },
  plugins: [],
};
