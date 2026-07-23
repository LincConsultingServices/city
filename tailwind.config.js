/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // The City design tokens — mapped to CSS variables in src/index.css so
        // buildings can theme via tokens (PRD §7.3, §8) without forking styles.
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--c-surface-2) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        text: "rgb(var(--c-text) / <alpha-value>)",
        gold: "rgb(var(--c-gold) / <alpha-value>)",
        coin: "rgb(var(--c-coin) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        success: "rgb(var(--c-success) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Outfit", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
