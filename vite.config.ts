/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// defineConfig comes from "vite" (not "vitest/config") so the react() plugin's
// Plugin type matches; the triple-slash reference above augments UserConfig with
// the `test` field. Only VITE_* variables reach the app (see AppConfig).
export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_"],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
