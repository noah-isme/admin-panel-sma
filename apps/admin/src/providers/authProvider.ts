import type { AuthProvider } from "@refinedev/core";

const sanitizeBaseUrl = (rawUrl?: string) => {
  // Prefer explicit env var when provided
  if (rawUrl && rawUrl.trim().length > 0) {
    return rawUrl.replace(/\/+$/, "");
  }

  // If running in a browser at runtime, derive API base from current origin
  try {
    if (typeof window !== "undefined" && window?.location?.origin) {
      return `${window.location.origin.replace(/\/+$/, "")}/api/v1`;
    }
  } catch {
    // ignore and fall through to localhost
  }

  // Fallback for build-time / non-browser environments
  return "http://localhost:8081/api/v1";
};

const ENABLE_MSW = (import.meta.env.VITE_USE_MSW ?? import.meta.env.VITE_ENABLE_MSW) === "true";

const API_URL = (() => {
  const base = sanitizeBaseUrl(import.meta.env.VITE_API_URL);

  if (ENABLE_MSW) {
    try {
      if (typeof window !== "undefined" && window.location?.origin) {
        const origin = window.location.origin.replace(/\/+$/, "");
        const fallback = `${origin}/api`;
        if (base !== fallback) {
          console.warn("[authProvider] Overriding API base for MSW:", base, "→", fallback);
        }
        return fallback;
      }
    } catch {
      // ignore and fall through
    }
  }

  return base;
})();

// Expose resolved API URL in console so we can verify runtime base in production
try {
  if (typeof window !== "undefined") {
    console.info("[authProvider] Resolved API base:", API_URL);
  }
} catch {
  // noop
}

const resolveEndpoint = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

const readAPIErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    return payload?.error?.message ?? payload?.message ?? fallback;
  } catch {
    return fallback;
  }
};

/** Request a password-reset email without revealing whether an account exists. */
export const requestPasswordReset = async (email: string): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(resolveEndpoint("auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    throw new Error("Tidak dapat terhubung ke server. Silakan coba lagi.");
  }

  if (!response.ok) {
    throw new Error(await readAPIErrorMessage(response, "Permintaan reset password gagal."));
  }
};

/** Complete a password reset using the one-time token from the email link. */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(resolveEndpoint("auth/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  } catch {
    throw new Error("Tidak dapat terhubung ke server. Silakan coba lagi.");
  }

  if (!response.ok) {
    throw new Error(
      await readAPIErrorMessage(response, "Reset password gagal atau token sudah kedaluwarsa.")
    );
  }
};

interface LoginParams {
  email: string;
  password: string;
}

type TokenResponse = {
  accessToken?: string;
  refreshToken?: string;
  access_token?: string;
  refresh_token?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  expires_in?: number;
  refresh_expires_in?: number;
  tokenType?: "Bearer";
  token_type?: string;
  user?: MeResponse;
  data?: TokenResponse;
  result?: TokenResponse;
};

interface MeResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  teacherId?: string | null;
  studentId?: string | null;
  classId?: string | null;
}

type MeEnvelope = Partial<MeResponse> & {
  data?: MeEnvelope;
  full_name?: string;
  teacher_id?: string | null;
  student_id?: string | null;
  class_id?: string | null;
};

// Helper to get tokens from localStorage
const getAccessToken = () => localStorage.getItem("access_token");
const getRefreshToken = () => localStorage.getItem("refresh_token");
const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
};
const clearTokens = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
};

const unwrapTokenPayload = (payload: TokenResponse | null | undefined): TokenResponse | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (payload.data && typeof payload.data === "object") {
    return unwrapTokenPayload(payload.data);
  }

  if (payload.result && typeof payload.result === "object") {
    return unwrapTokenPayload(payload.result);
  }

  return payload;
};

const normalizeTokens = (tokens: TokenResponse | null | undefined) => {
  const payload = unwrapTokenPayload(tokens);
  if (!payload) {
    return null;
  }

  const accessToken = payload.accessToken ?? payload.access_token;
  const refreshToken = payload.refreshToken ?? payload.refresh_token;

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
};

const normalizeUser = (payload: MeEnvelope | null | undefined): MeResponse | null => {
  if (!payload || typeof payload !== "object") return null;
  if (payload.data) return normalizeUser(payload.data);

  const id = payload.id;
  const email = payload.email;
  const fullName = payload.fullName ?? payload.full_name;
  const role = payload.role;
  if (!id || !email || !fullName || !role) return null;

  return {
    id,
    email,
    fullName,
    role,
    teacherId: payload.teacherId ?? payload.teacher_id,
    studentId: payload.studentId ?? payload.student_id,
    classId: payload.classId ?? payload.class_id,
  };
};

const readStoredUser = (): MeResponse | null => {
  const value = localStorage.getItem("user");
  if (!value) return null;

  try {
    return normalizeUser(JSON.parse(value) as MeEnvelope);
  } catch {
    return null;
  }
};

export const authProvider: AuthProvider = {
  login: async ({ email, password }: LoginParams) => {
    try {
      const url = resolveEndpoint("auth/login");

      // Log the outgoing login attempt (mask password)
      try {
        console.info("[authProvider] POST", url, { email, password: "••••" });
      } catch {
        // ignore
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            name: "LoginError",
            message: error.message || "Invalid email or password",
          },
        };
      }

      const body: TokenResponse = await response.json();

      // Log a short summary of the auth response but do not print tokens
      try {
        const preview = {
          ok: response.ok,
          status: response.status,
          hasUser: Boolean(body && (body as any).user),
          hasAccessToken:
            Boolean(body && (body as any).accessToken) ||
            Boolean(body && (body as any).access_token),
        };
        console.info("[authProvider] login response summary:", preview);
      } catch {
        // ignore
      }
      const normalizedTokens = normalizeTokens(body ?? null);

      if (!normalizedTokens) {
        return {
          success: false,
          error: {
            name: "LoginError",
            message: "Authentication response did not include access tokens.",
          },
        };
      }

      const { accessToken, refreshToken } = normalizedTokens;

      // Store tokens first
      setTokens(accessToken, refreshToken);

      // If backend already returned user, store it. Otherwise try fetching /auth/me
      const loginPayload = unwrapTokenPayload(body);
      const loginUser = normalizeUser(loginPayload?.user);
      if (loginUser) {
        localStorage.setItem("user", JSON.stringify(loginUser));
      }

      try {
        const meResponse = await fetch(resolveEndpoint("auth/me"), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (meResponse.ok) {
          const user = normalizeUser((await meResponse.json()) as MeEnvelope);
          if (user) {
            localStorage.setItem("user", JSON.stringify(user));
          } else if (!loginUser) {
            localStorage.removeItem("user");
          }
        } else if (!loginUser) {
          localStorage.removeItem("user");
        }
      } catch (error) {
        console.error("Failed to fetch user profile after login", error);
        if (!loginUser) {
          localStorage.removeItem("user");
        }
      }

      return { success: true, redirectTo: "/" };
    } catch {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: "Network error. Please check your connection.",
        },
      };
    }
  },

  logout: async () => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (accessToken && refreshToken) {
      try {
        // Call logout endpoint to invalidate tokens
        await fetch(resolveEndpoint("/auth/logout"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (error) {
        console.error("Logout API call failed:", error);
      }
    }

    clearTokens();
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  check: async () => {
    const token = getAccessToken();

    console.info("[auth] checkAuth", {
      hasToken: Boolean(token),
      tokenPreview: token ? `${token.slice(0, 8)}…` : undefined,
    });

    if (!token) {
      console.warn("[auth] checkAuth", "No access token found. Redirecting to login.");
      return { authenticated: false, redirectTo: "/login", logout: true };
    }

    // Optionally verify token with backend
    try {
      const response = await fetch(resolveEndpoint("auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.info("[auth] checkAuth", "/auth/me response", response.status);

      if (!response.ok) {
        console.warn("[auth] checkAuth", "Backend rejected token. Clearing session.");
        clearTokens();
        return { authenticated: false, redirectTo: "/login", logout: true };
      }

      return { authenticated: true };
    } catch (error) {
      console.error("[auth] checkAuth", "Network error during /auth/me", error);
      // If /auth/me doesn't exist, just check token presence
      return { authenticated: true };
    }
  },

  getPermissions: async () => {
    return readStoredUser()?.role ?? null;
  },

  getIdentity: async () => {
    const user = readStoredUser();
    if (user) {
      return {
        id: user.id,
        name: user.fullName,
        email: user.email,
        avatar: undefined,
      };
    }

    const token = getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(resolveEndpoint("auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return null;
      }

      const user = normalizeUser((await response.json()) as MeEnvelope);
      if (!user) return null;
      localStorage.setItem("user", JSON.stringify(user));

      return {
        id: user.id,
        name: user.fullName,
        email: user.email,
        avatar: undefined,
      };
    } catch (error) {
      console.error("[auth] getIdentity", "Failed to fetch identity", error);
      return null;
    }
  },

  onError: async (error) => {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      clearTokens();
      return { logout: true, redirectTo: "/login", error };
    }
    return { error };
  },
};
