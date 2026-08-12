import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authProvider } from "../providers/authProvider";
import {
  clearAccessToken,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from "../providers/dataProvider";

describe("Go auth contract", () => {
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

  it("refreshes through the HttpOnly cookie and unwraps the Go response envelope", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { access_token: "new-access" },
      }),
    } as Response);

    await expect(refreshAccessToken()).resolves.toBe("new-access");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/refresh"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });

  it("logs out with the cookie-backed refresh-token contract", async () => {
    setAccessToken("access");
    const fetchMock = vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    await authProvider.logout?.({});

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/logout"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { Authorization: "Bearer access" },
      })
    );
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });

  it("bootstraps the in-memory access token from the refresh cookie after reload", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { access_token: "bootstrapped-access" } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: "user-1",
            email: "admin@example.com",
            full_name: "Admin User",
            role: "ADMIN_TU",
          },
        }),
      } as Response);

    const result = await authProvider.check?.({});

    expect(result?.authenticated).toBe(true);
    expect(getAccessToken()).toBe("bootstrapped-access");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/auth/refresh"),
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/auth/me"),
      expect.objectContaining({
        credentials: "include",
        headers: { Authorization: "Bearer bootstrapped-access" },
      })
    );
  });
});
