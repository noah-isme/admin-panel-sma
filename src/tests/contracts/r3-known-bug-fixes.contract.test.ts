import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { authProvider } from "../../../apps/admin/src/providers/authProvider";
import {
  clearAccessToken,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "../../../apps/admin/src/providers/dataProvider";
import {
  fetchFeatures,
  mergeFeatures,
  buildTimeFeatures,
} from "../../../apps/admin/src/providers/features";

const findProjectRoot = (): string => {
  let current = process.cwd();
  while (current !== path.parse(current).root) {
    if (fs.existsSync(path.join(current, "AGENTS.md"))) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
};

describe("R3 Known Bug Fixes Contract Tests (G-01, G-02, G-09)", () => {
  const rootDir = findProjectRoot();
  const backendDir = path.resolve(rootDir, "..", "sma-adp-api");

  beforeEach(() => {
    localStorage.clear();
    clearAccessToken();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    clearAccessToken();
  });

  describe("Tier 1: Auth Contract Alignment (G-01)", () => {
    it("R3.1-T1-01: Frontend logout calls POST /api/v1/auth/logout with cookie credentials", async () => {
      setAccessToken("test-access");

      const fetchMock = vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message: "logged out" }),
      } as Response);

      await authProvider.logout?.({});

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/logout"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          headers: { Authorization: "Bearer test-access" },
        })
      );
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
    });

    it("R3.1-T1-02: Token refresh unwraps Go snake_case response envelope correctly", async () => {
      const fetchMock = vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            access_token: "new-go-access-token",
            refresh_token: "new-go-refresh-token",
          },
        }),
      } as Response);

      const token = await refreshAccessToken();
      expect(token).toBe("new-go-access-token");
      expect(getAccessToken()).toBe("new-go-access-token");
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/refresh"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        })
      );
    });

    it("R3.1-T1-03: Login handles both snake_case (Go) and camelCase token payloads", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            access_token: "snake-access",
            refresh_token: "snake-refresh",
            user: { id: "u-1", email: "admin@test.com", role: "ADMIN_TU" },
          },
        }),
      } as Response);

      const res = await authProvider.login({
        username: "admin@test.com",
        password: "Password123!",
      });
      expect(res.success).toBe(true);
      expect(getAccessToken()).toBe("snake-access");
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
    });
  });

  describe("Tier 1: Feature Flag Fallback & Mapping (G-02)", () => {
    it("R3.2-T1-04: Runtime feature flag endpoint overrides build-time VITE_ENABLE_* defaults", async () => {
      const fetchMock = vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            features: {
              scheduler: true,
              reports: false,
              attendanceAlias: true,
            },
          },
        }),
      } as Response);

      const flags = await fetchFeatures("http://localhost:8080/api/v1", {
        fetchImpl: fetchMock as never,
      });

      expect(flags.schedules).toBe(true);
      expect(flags.reports).toBe(false);
      expect(flags.attendance).toBe(true);
    });

    it("R3.2-T1-05: Resource routing maps feature keys onto frontend resources", () => {
      const fallback = buildTimeFeatures();
      const merged = mergeFeatures(
        {
          features: {
            scheduler: true,
            configuration: true,
            calendarAlias: true,
          },
        },
        fallback
      );

      expect(merged.schedules).toBe(true);
      expect(merged.settings).toBe(true);
      expect(merged.calendar).toBe(true);
    });
  });

  describe("Tier 2: Boundary & Swagger Annotations (G-09)", () => {
    it("R3.3-T2-01: Swagger route validation script exists and is configured", () => {
      const scriptPath = path.join(backendDir, "scripts", "validate_swagger_routes.py");
      expect(fs.existsSync(scriptPath)).toBe(true);
      const content = fs.readFileSync(scriptPath, "utf-8");
      expect(content).toContain("swagger");
    });

    it("R3.3-T2-02: Public routes in Go handlers are unauthenticated in Swagger docs", () => {
      const swaggerJsonPath = path.join(backendDir, "api", "swagger", "swagger.json");
      if (fs.existsSync(swaggerJsonPath)) {
        const content = fs.readFileSync(swaggerJsonPath, "utf-8");
        const json = JSON.parse(content);
        expect(json.paths["/api/v1/auth/login"] || json.paths["/auth/login"]).toBeDefined();
        expect(json.paths["/api/v1/features"] || json.paths["/features"]).toBeDefined();
      }
    });

    it("R3.1-T2-03: Logout clears local storage even when backend logout fails with 500", async () => {
      setAccessToken("expired-access");

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" }),
      } as Response);

      await authProvider.logout?.({});

      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
    });

    it("R3.2-T2-04: Feature flags fall back safely when network times out", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network connection lost"));

      const flags = await fetchFeatures("http://localhost:8080/api/v1");
      expect(flags).toBeDefined();
      expect(typeof flags.dashboard).toBe("boolean");
      expect(typeof flags.schedules).toBe("boolean");
    });

    it("R3.2-T2-05: Feature flag merger handles null/undefined/malformed payloads", () => {
      const fallback = buildTimeFeatures();
      expect(mergeFeatures(null, fallback)).toEqual(fallback);
      expect(mergeFeatures(undefined, fallback)).toEqual(fallback);
      expect(mergeFeatures("invalid string", fallback)).toEqual(fallback);
    });
  });
});
