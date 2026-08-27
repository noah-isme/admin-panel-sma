import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "apps/shared/output"),
    },
  },
  test: {
    include: [
      "apps/admin/**/*.test.ts",
      "apps/admin/**/*.test.tsx",
      "apps/shared/**/*.test.ts",
      "src/tests/contracts/**/*.test.ts",
      "src/tests/contracts/**/*.ts",
    ],
    environment: "jsdom",
    setupFiles: ["apps/admin/test/setupTests.ts"],
  },
});
