import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../providers/dataProvider", () => ({
  httpClient: { get },
}));

import { downloadAuthenticatedFile, filenameFromContentDisposition } from "../utils/download";

describe("authenticated downloads", () => {
  beforeEach(() => {
    get.mockReset();
    vi.restoreAllMocks();
  });

  it("parses RFC 5987 and quoted Content-Disposition filenames", () => {
    expect(filenameFromContentDisposition("attachment; filename*=UTF-8''nilai%20akhir.csv")).toBe(
      "nilai akhir.csv"
    );
    expect(filenameFromContentDisposition('attachment; filename="siswa.csv"')).toBe("siswa.csv");
  });

  it("uses the authenticated client and revokes its object URL", async () => {
    vi.useFakeTimers();
    const blob = new Blob(["id,name\n1,A"], { type: "text/csv" });
    get.mockResolvedValue({
      data: blob,
      headers: {
        "content-type": "text/csv",
        "content-disposition": "attachment; filename=server.csv",
      },
      status: 200,
    });
    const objectURL = vi.fn().mockReturnValue("blob:test");
    const revokeURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: objectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeURL, configurable: true });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    const result = await downloadAuthenticatedFile({
      url: "/export/students",
      params: { class_id: "class-1" },
    });

    expect(get).toHaveBeenCalledWith("/export/students", {
      params: { class_id: "class-1" },
      responseType: "blob",
    });
    expect(result.filename).toBe("server.csv");
    expect(objectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(revokeURL).toHaveBeenCalledWith("blob:test");
    vi.useRealTimers();
  });

  it("turns JSON blob errors into a useful exception", async () => {
    const errorResponse = {
      data: new Blob([JSON.stringify({ error: { message: "Tidak diizinkan" } })], {
        type: "application/json",
      }),
      headers: { "content-type": "application/json" },
      status: 403,
    };
    get.mockRejectedValue({
      isAxiosError: true,
      response: errorResponse,
      name: "AxiosError",
    });
    await expect(downloadAuthenticatedFile({ url: "/export/grades" })).rejects.toThrow(
      "Tidak diizinkan"
    );
  });
});
