/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#4A90E2',
          light: '#7DB3F0',
        },
        accent: {
          DEFAULT: '#2B8AC6',
          light: '#4A90E2',
        },
        navy: {
          DEFAULT: '#1E293B',
          light: '#334155',
        },
        warm: '#F59E0B',
        'bg-alt': 'rgba(248, 250, 252, 0.72)',
        border: 'rgba(148, 163, 184, 0.34)',
        success: '#059669',
        danger: '#dc2626',
        text: {
          DEFAULT: '#1E293B',
          light: '#475569',
        },
      },
    },
  },
  plugins: [],
};
