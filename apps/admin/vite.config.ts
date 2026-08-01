import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  // In production, Vercel serves this app at the root (/) when using
  // Root Directory = apps/admin (the standard setup documented in README).
  // In that case, base should be "/".  For the combined deployment (root
  // vercel.json serving admin at /admin/), override this by setting
  // VITE_BASE_PATH="/admin/" as a Vercel Environment Variable.
  base: process.env.VITE_BASE_PATH ?? (mode === "production" ? "/" : "/admin/"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Always point to source to keep MSW fixtures & types in sync
      "@shared": path.resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 500,
    },
  },
  build: {
    target: "es2022",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setupTests.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/tests/e2e/**"],
  },
}));
