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
          DEFAULT: '#D6336C',
          light: '#E05A8A',
        },
        navy: {
          DEFAULT: '#1B3A57',
          light: '#2A4F6E',
        },
        warm: '#E8A33D',
        'bg-alt': '#F0F4F8',
        border: '#d0d5dd',
        text: {
          DEFAULT: '#2B2B2B',
          light: '#555555',
        },
      },
    },
  },
  plugins: [],
};
