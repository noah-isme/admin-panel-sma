import { isAxiosError } from "axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { httpClient } from "../providers/dataProvider";

export type AuthenticatedDownloadOptions = {
  url: string;
  params?: Record<string, unknown>;
  filename?: string;
  config?: Omit<AxiosRequestConfig, "params" | "responseType">;
};

export type AuthenticatedDownloadResult = {
  filename: string;
  response: AxiosResponse<Blob>;
};

const decodeFilename = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Resolve the filename supplied by a server Content-Disposition header. */
export const filenameFromContentDisposition = (
  contentDisposition: string | undefined
): string | undefined => {
  if (!contentDisposition) return undefined;

  const encoded = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeFilename(encoded.trim().replace(/^"|"$/g, ""));

  const plain = contentDisposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  const filename = plain?.[1] ?? plain?.[2];
  return filename?.trim();
};

const readErrorMessage = async (response: AxiosResponse<Blob>) => {
  const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.includes("json") || !(response.data instanceof Blob)) return undefined;

  try {
    const payload = JSON.parse(await response.data.text()) as {
      error?: string | { message?: string };
      message?: string;
    };
    if (typeof payload.message === "string") return payload.message;
    if (typeof payload.error === "string") return payload.error;
    if (payload.error && typeof payload.error.message === "string") {
      return payload.error.message;
    }
  } catch {
    // The server may return a non-JSON error body; callers still get a useful
    // generic error below.
  }
  return undefined;
};

/**
 * Download a protected file through the shared Axios client.
 *
 * Going through `httpClient` is important: it adds the in-memory bearer token
 * and participates in the refresh/retry interceptor. A top-level navigation
 * cannot carry either of those headers reliably.
 */
export const downloadAuthenticatedFile = async ({
  url,
  params,
  filename,
  config,
}: AuthenticatedDownloadOptions): Promise<AuthenticatedDownloadResult> => {
  let response: AxiosResponse<Blob>;
  try {
    response = await httpClient.get<Blob>(url, {
      ...config,
      params,
      responseType: "blob",
    });
  } catch (error) {
    const errorResponse = isAxiosError<Blob>(error) ? error.response : undefined;
    if (errorResponse) {
      const message = await readErrorMessage(errorResponse);
      throw new Error(message ?? "Server gagal membuat berkas unduhan.");
    }
    throw error;
  }

  const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
  if (contentType.includes("json")) {
    const message = await readErrorMessage(response);
    throw new Error(message ?? "Server gagal membuat berkas unduhan.");
  }

  const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
  const resolvedFilename =
    filename ??
    filenameFromContentDisposition(String(response.headers["content-disposition"] ?? "")) ??
    "unduhan";
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = resolvedFilename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Keep the URL alive for the browser's download dispatch before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

  return { filename: resolvedFilename, response };
};
