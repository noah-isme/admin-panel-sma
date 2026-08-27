import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  // A real staging build may use Vercel's Preview environment while pointing
  // at the isolated VPS API. Keep ordinary previews mock-only and require an
  // explicit opt-in before allowing a real API URL through the bundle.
  const isStaging = process.env.VITE_STAGING?.trim().toLowerCase() === "true";
  const previewUsesMsw = vercelEnv === "preview" && !isStaging;

  return {
    // The top-level Vercel project publishes the admin bundle below /admin/.
    // Vercel's system VERCEL_ENV is available during the build, so this stays
    // correct even when VITE_BASE_PATH is not duplicated in Project Settings.
    base:
      process.env.VITE_BASE_PATH ??
      (process.env.VERCEL_ENV ? "/admin/" : mode === "production" ? "/" : "/admin/"),
    // Keep preview bundles hermetic: they must never inherit the production API
    // URL and always use the committed MSW fixtures. An explicit staging build
    // is the only Preview exception; it retains the configured VITE_API_URL.
    define: vercelEnv
      ? {
          "import.meta.env.VITE_VERCEL_ENV": JSON.stringify(vercelEnv),
          ...(vercelEnv === "preview" || vercelEnv === "production"
            ? {
                "import.meta.env.VITE_USE_MSW": JSON.stringify(previewUsesMsw),
                "import.meta.env.VITE_ENABLE_MSW": JSON.stringify(previewUsesMsw),
              }
            : {}),
          ...(previewUsesMsw ? { "import.meta.env.VITE_API_URL": JSON.stringify("/api") } : {}),
        }
      : undefined,
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
  };
});
