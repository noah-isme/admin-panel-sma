import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authProvider } from "../providers/authProvider";
import { refreshAccessToken } from "../providers/dataProvider";

describe("Go auth contract", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("refreshes with snake_case body and unwraps the Go response envelope", async () => {
    localStorage.setItem("refresh_token", "old-refresh");
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { access_token: "new-access", refresh_token: "new-refresh" },
      }),
    } as Response);

    await expect(refreshAccessToken()).resolves.toBe("new-access");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/refresh"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refresh_token: "old-refresh" }),
      })
    );
    expect(localStorage.getItem("access_token")).toBe("new-access");
    expect(localStorage.getItem("refresh_token")).toBe("new-refresh");
  });

  it("logs out with the same snake_case refresh-token contract", async () => {
    localStorage.setItem("access_token", "access");
    localStorage.setItem("refresh_token", "refresh");
    const fetchMock = vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    await authProvider.logout?.({});

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/logout"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refresh_token: "refresh" }),
      })
    );
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });
});
