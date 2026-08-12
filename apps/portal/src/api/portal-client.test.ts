import { afterEach, describe, expect, it, vi } from "vitest";
import { createPortalClient, PortalApiError } from "./portal-client";

describe("portal API client", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const client = createPortalClient({
    baseUrl: "https://api.test/api/v1/portal/",
    fetchFn: fetchMock,
  });

  afterEach(() => fetchMock.mockReset());

  it("posts portal credentials and unwraps the shared data envelope", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            accessToken: "access",
            refreshToken: "refresh",
            user: { id: "1", role: "ORTU", portalRole: "ORTU" },
          },
        }),
        { status: 200 }
      )
    );
    await expect(
      client.login({ email: "wali@example.test", password: "rahasia123" })
    ).resolves.toMatchObject({
      accessToken: "access",
      refreshToken: "refresh",
      user: { role: "PARENT", portalRole: "PARENT" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/v1/portal/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "wali@example.test", password: "rahasia123" }),
      })
    );
  });

  it("uses snake_case refresh credentials", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ data: { accessToken: "next", refreshToken: "next-refresh", user: {} } }),
        { status: 200 }
      )
    );
    await client.refresh("old-refresh");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/v1/portal/auth/refresh",
      expect.objectContaining({ body: JSON.stringify({ refresh_token: "old-refresh" }) })
    );
  });

  it("adds student scope, query parameters, and bearer authentication to read-only requests", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ termId: "term-1", grades: [] }), { status: 200 })
    );
    await client.grades({ termId: "term-1", studentId: "student-1" }, "token-1");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/api/v1/portal/grades?termId=term-1&studentId=student-1");
    expect(new Headers(options?.headers).get("Authorization")).toBe("Bearer token-1");
  });

  it("turns API error envelopes into typed errors", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Sesi tidak valid" } }), { status: 401 })
    );
    await expect(client.attendance({}, "expired")).rejects.toEqual(
      expect.objectContaining<Partial<PortalApiError>>({
        name: "PortalApiError",
        status: 401,
        message: "Sesi tidak valid",
      })
    );
  });
});
