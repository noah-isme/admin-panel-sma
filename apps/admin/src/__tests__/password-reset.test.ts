import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestPasswordReset, resetPassword } from "../providers/authProvider";

describe("admin password-reset API contract", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests a reset email with the snake_case API contract", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({ ok: true, status: 202 } as Response);

    await expect(requestPasswordReset("admin@example.test")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/forgot-password"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "admin@example.test" }),
      })
    );
  });

  it("submits the one-time token and new password without storing either locally", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204 } as Response);

    await expect(resetPassword("raw-reset-token", "StrongPassword123!")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/reset-password"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "raw-reset-token", new_password: "StrongPassword123!" }),
      })
    );
    expect(localStorage.getItem("raw-reset-token")).toBeNull();
  });

  it("surfaces API envelope errors without changing the generic success path", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "invalid or expired password reset token" } }),
    } as Response);

    await expect(resetPassword("expired", "StrongPassword123!")).rejects.toThrow(
      "invalid or expired password reset token"
    );
  });
});
