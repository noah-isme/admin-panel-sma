import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@portal-types": path.resolve(__dirname, "../shared/src/types/portal.ts"),
    },
  },
  server: {
    port: 5175,
  },
  build: {
    target: "es2022",
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
