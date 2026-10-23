// Runtime configuration — replaced when the app runs in its container.
//
// In production the container writes this file at startup from the Cloud Run
// service's environment variables (nginx/40-city-config.sh). Everywhere else —
// `npm run dev`, Vercel — it stays empty, and the app uses the values from .env
// that Vite builds in. See src/framework/config/appConfig.ts.
window.__CITY_CONFIG__ = window.__CITY_CONFIG__ || {};
