import type { Config } from 'tailwindcss';

// Palette from docs/STYLE_SHEET.md (gray-box city). Building states never rely
// on color alone (PRD §16) — icon + shape pair with these.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: { a: '#D1D9E3', b: '#C4CEDB' },
        bldg: { floor: '#B39E80', left: '#858FA8', right: '#9EA8C2', roof: '#D1B880' },
        ink: '#40424D',
        accent: '#F2C14E', // reward gold (coins, "new")
        night: '#0d0f17', // login/backdrop
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'coin-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'coin-pop': 'coin-pop 320ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
