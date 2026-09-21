/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#fef3ee',
          100: '#fde4d4',
          200: '#fbc5a8',
          300: '#f89b71',
          400: '#f46638',
          500: '#f14012',
          600: '#e22a08',
          700: '#bb1e09',
          800: '#951a10',
          900: '#781810',
        },
        dark: {
          50:  '#f6f6f7',
          100: '#e1e2e5',
          200: '#c3c4cb',
          300: '#9b9daa',
          400: '#73768a',
          500: '#595c70',
          600: '#484b5c',
          700: '#3a3d4a',
          800: '#252733',  // card bg
          850: '#1e2030',  // sidebar
          900: '#181a24',  // main bg
          950: '#12141c',  // deepest
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
