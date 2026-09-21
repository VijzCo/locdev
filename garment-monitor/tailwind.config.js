/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0F172A",
        card: "#1E293B",
        grid: "#334155",
        ok: "#10B981",
        warn: "#F59E0B",
        bad: "#EF4444",
        info: "#3B82F6",
        ink: "#F8FAFC",
      },
      fontFamily: {
        sans: ["Barlow", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
