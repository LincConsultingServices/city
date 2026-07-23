/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// defineConfig comes from "vite" (not "vitest/config") so the react() plugin's
// Plugin type matches; the triple-slash reference above augments UserConfig with
// the `test` field. envPrefix accepts both our VITE_* names and the main WarRoom
// frontend's NEXT_PUBLIC_* names, so its .env drops in verbatim (see AppConfig).
export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
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
