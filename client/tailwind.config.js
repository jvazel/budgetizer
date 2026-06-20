/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        "surface-2": "var(--bg-surface-2)",
        elevated: "var(--bg-elevated)",
        border: "var(--border)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        accent: "var(--accent)",
        "accent-dim": "var(--accent-dim)",
        danger: "var(--danger)",
        "danger-dim": "var(--danger-dim)",
        warning: "var(--warning)",
        info: "var(--info)",
        purple: "var(--purple)",
      },
      fontFamily: {
        sans: ['"Manrope"', "sans-serif"],
        mono: ['"DM Mono"', "monospace"],
      },
    },
  },
  plugins: [],
}
