/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces and text resolve through CSS variables so light/dark
        // share one set of component classes.
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',

        // Navy scale — the fixed brand spine, identical in both themes.
        navy: {
          950: '#04101B',
          900: '#071522',
          800: '#0C2033',
          700: '#123047',
          600: '#1B4666',
          500: '#276185',
        },

        // Production semaphore. These four are reserved for status only.
        signal: {
          green: '#12A150',
          amber: '#E8A317',
          red: '#E5484D',
          grey: '#8A99A8',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Oswald', 'sans-serif'],
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Signage scale for the wall display and metric readouts.
        metric: ['2.75rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'metric-lg': ['4.5rem', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        eyebrow: ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.12em' }],
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '2px',
        md: '3px',
        lg: '4px',
      },
      spacing: {
        rail: '3px',
        sidebar: '15rem',
        'sidebar-tight': '4.25rem',
        topbar: '3.5rem',
      },
      transitionDuration: { DEFAULT: '120ms' },
    },
  },
  plugins: [],
};
