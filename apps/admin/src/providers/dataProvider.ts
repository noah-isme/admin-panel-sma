import axios, { AxiosHeaders, type AxiosResponse } from "axios";
import type {
  BaseRecord,
  CrudFilters,
  CrudSort,
  DataProvider,
  GetListResponse,
  GetOneResponse,
  CreateResponse,
  UpdateResponse,
  DeleteOneResponse,
  GetManyResponse,
  GetManyParams,
  CustomResponse,
  CustomParams,
} from "@refinedev/core";
import { studentQuerySchema } from "@shared/schemas";

const sanitizeBaseUrl = (rawUrl?: string) => {
  if (rawUrl && rawUrl.trim().length > 0) {
    return rawUrl.replace(/\/+$/, "");
  }

  try {
    if (typeof window !== "undefined" && window?.location?.origin) {
      return `${window.location.origin.replace(/\/+$/, "")}/api/v1`;
    }
  } catch {
    // ignore
  }

  return "http://localhost:8081/api/v1";
};

const ENABLE_MSW = (import.meta.env.VITE_USE_MSW ?? import.meta.env.VITE_ENABLE_MSW) === "true";

const envBaseUrl = sanitizeBaseUrl(import.meta.env.VITE_API_URL);

const API_BASE_URL = (() => {
  if (typeof window === "undefined") {
    return envBaseUrl;
  }

  try {
    const origin = window.location.origin.replace(/\/+$/, "");
    const isSameOrigin = envBaseUrl.startsWith(origin);
    const fallback = `${origin}/api`;

    if (ENABLE_MSW) {
      if (envBaseUrl !== fallback) {
        console.warn(
          "[dataProvider] Overriding API base for MSW (enable flag):",
          envBaseUrl,
          "→",
          fallback
        );
      }
      return fallback;
    }

    if (import.meta.env.DEV && !isSameOrigin) {
      console.warn(
        "[dataProvider] Overriding API base for MSW development:",
        envBaseUrl,
        "→",
        fallback
      );
      return fallback;
    }
  } catch {
    // ignore
  }

  return envBaseUrl;
})();

const ensureLeadingSlash = (path: string) => (path.startsWith("/") ? path : `/${path}`);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const httpClient = api;

// Log resolved base in browser runtime (non-sensitive)
try {
  if (typeof window !== "undefined") {
    console.info("[dataProvider] Resolved API base:", API_BASE_URL);
  }
} catch {
  // ignore
}

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    try {
      if (typeof window !== "undefined") {
        const maskedHeaders = {
          ...(config.headers && typeof config.headers === "object" ? config.headers : {}),
        } as Record<string, unknown>;
        if (maskedHeaders.Authorization || maskedHeaders.authorization) {
          maskedHeaders.Authorization = "Bearer ••••";
        }
        console.info(
          "[dataProvider] Request",
          config.method?.toUpperCase?.() ?? config.method,
          config.url,
          { params: config.params, headers: maskedHeaders }
        );
      }
    } catch {
      // ignore
    }
    const token = localStorage.getItem("access_token");
    if (token) {
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set("Authorization", `Bearer ${token}`);
      } else {
        const headers = AxiosHeaders.from(config.headers ?? {});
        headers.set("Authorization", `Bearer ${token}`);
        config.headers = headers;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const clearStoredSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredSession();
      window.location.href = "/login";
    }
    return Promise.reject(error);
    // --- DEV in-memory store -------------------------------------------------
    // Keep the development store close to the dataProvider so CRUD methods can
    // operate on the same fixtures used by getList when the backend is offline.
  }
);

const studentFiltersSchema = studentQuerySchema.partial();

const filterSchemas: Partial<Record<string, typeof studentFiltersSchema>> = {
  students: studentFiltersSchema,
};

const flattenFilters = (filters?: CrudFilters): Record<string, unknown> => {
  if (!filters) {
    return {};
  }

  return filters.reduce<Record<string, unknown>>((acc, filter) => {
    if ("field" in filter && "operator" in filter) {
      const { field, operator, value } = filter;
      if (operator === "eq" || operator === "contains" || operator === "in") {
        acc[field as string] = value;
      }
    }

    return acc;
  }, {});
};

const transformFilters = (resource: string, filters?: CrudFilters): Record<string, unknown> => {
  const flattened = flattenFilters(filters);
  const schema = filterSchemas[resource];

  if (!schema) {
    return flattened;
  }

  const parsed = schema.safeParse(flattened);
  return parsed.success ? parsed.data : flattened;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const snakeToCamel = (key: string) =>
  key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());

const camelToSnake = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();

/** Keep Go's snake_case API contract outside the camelCase UI model. */
const normalizeApiData = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeApiData);
  if (!isPlainObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [snakeToCamel(key), normalizeApiData(entry)])
  );
};

const serializeApiData = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(serializeApiData);
  if (!isPlainObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [camelToSnake(key), serializeApiData(entry)])
  );
};

const unwrapEnvelope = (payload: unknown): unknown =>
  isPlainObject(payload) && "data" in payload ? payload.data : payload;

const resolveTotal = (payload: Record<string, unknown>, fallback: number) => {
  const directTotal = payload.total;
  if (typeof directTotal === "number") {
    return directTotal;
  }

  const count = payload.count;
  if (typeof count === "number") {
    return count;
  }

  const meta = payload.meta;
  if (meta && typeof meta === "object" && "total" in meta) {
    const metaTotal = (meta as { total?: number }).total;
    if (typeof metaTotal === "number") {
      return metaTotal;
    }
  }

  const pagination = payload.pagination;
  if (pagination && typeof pagination === "object") {
    const totalCount =
      (pagination as { total_count?: unknown; totalCount?: unknown }).total_count ??
      (pagination as { totalCount?: unknown }).totalCount;
    if (typeof totalCount === "number") return totalCount;
  }

  return fallback;
};

const extractListPayload = <TData extends BaseRecord = BaseRecord>(
  response: AxiosResponse
): GetListResponse<TData> => {
  const payload = response.data as Record<string, unknown> | unknown[] | undefined;

  if (Array.isArray(payload)) {
    return { data: payload as TData[], total: payload.length };
  }

  if (payload && typeof payload === "object") {
    const candidates =
      (payload.data as unknown) ??
      (payload.items as unknown) ??
      (payload.results as unknown) ??
      (payload.rows as unknown);

    if (Array.isArray(candidates)) {
      return {
        data: normalizeApiData(candidates) as TData[],
        total: resolveTotal(payload as Record<string, unknown>, candidates.length),
      };
    }

    if (candidates && typeof candidates === "object") {
      return {
        data: [normalizeApiData(candidates) as TData],
        total: resolveTotal(payload as Record<string, unknown>, 1),
      };
    }

    return { data: [], total: resolveTotal(payload as Record<string, unknown>, 0) };
  }

  return { data: [], total: 0 };
};

const resolveHeaders = (meta?: Record<string, unknown>) =>
  (meta?.headers as Record<string, string> | undefined) ?? undefined;

const resolveSignal = (meta?: Record<string, unknown>) =>
  (meta?.signal as AbortSignal | undefined) ?? undefined;

const ensureParams = (
  params: Parameters<DataProvider["getList"]>[0]
): {
  resource: string;
  pagination?: { current?: number; pageSize?: number };
  filters?: CrudFilters;
  meta?: Record<string, unknown>;
  sorters?: CrudSort[];
} => ({
  resource: params.resource,
  pagination: params.pagination,
  filters: params.filters,
  meta: params.meta,
  sorters: (params as any).sorters as CrudSort[] | undefined,
});

const dataProvider: DataProvider = {
  getList: async <TData extends BaseRecord = BaseRecord>(
    params: Parameters<DataProvider["getList"]>[0]
  ): Promise<GetListResponse<TData>> => {
    const { resource, pagination, filters, meta, sorters } = ensureParams(params as any);

    const queryParams: Record<string, unknown> = {
      ...transformFilters(resource, filters as CrudFilters | undefined),
    };

    if (pagination?.current) {
      queryParams.page = pagination.current;
    }
    if (pagination?.pageSize) {
      queryParams[resource === "users" ? "page_size" : "limit"] = pagination.pageSize;
    }

    if (Array.isArray(sorters) && sorters.length > 0) {
      const sorter = sorters[0];
      if (sorter?.field) {
        queryParams[resource === "users" ? "sort_by" : "sort"] = camelToSnake(sorter.field);
        // `CrudSort["order"]` is "asc" | "desc", but antd's Table hands back
        // "ascend" | "descend", and some call sites pass that straight through.
        // Accept either spelling rather than assuming the declared type holds.
        const orderValue = String(sorter.order ?? "").toLowerCase();
        queryParams[resource === "users" ? "sort_order" : "order"] =
          orderValue === "desc" || orderValue === "descend" ? "DESC" : "ASC";
      }
    }

    if (meta?.cursor) {
      queryParams.cursor = meta.cursor;
    }

    // Pass any meta fields as query parameters (e.g., termId for dashboard)
    if (meta) {
      Object.entries(meta).forEach(([key, value]) => {
        if (key !== "cursor" && value !== undefined && value !== null) {
          queryParams[key] = value;
        }
      });
    }

    const response = await api.get(ensureLeadingSlash(resource), {
      params: queryParams,
      headers: resolveHeaders(meta),
      signal: resolveSignal(meta),
    });

    return extractListPayload(response);
  },

  getApiUrl: () => api.defaults.baseURL ?? "",

  getOne: async <TData extends BaseRecord = BaseRecord>(
    params: Parameters<DataProvider["getOne"]>[0]
  ): Promise<GetOneResponse<TData>> => {
    const { resource, id, meta } = params as any;
    const response = await api.get(ensureLeadingSlash(`${resource}/${id}`), {
      headers: resolveHeaders(meta),
    });
    return { data: normalizeApiData(unwrapEnvelope(response.data)) as TData };
  },

  create: async <TData extends BaseRecord = BaseRecord>(
    params: Parameters<DataProvider["create"]>[0]
  ): Promise<CreateResponse<TData>> => {
    const { resource, variables, meta } = params as any;
    const response = await api.post(ensureLeadingSlash(resource), serializeApiData(variables), {
      headers: resolveHeaders(meta),
    });
    return { data: normalizeApiData(unwrapEnvelope(response.data)) as TData };
  },

  update: async <TData extends BaseRecord = BaseRecord>(
    params: Parameters<DataProvider["update"]>[0]
  ): Promise<UpdateResponse<TData>> => {
    const { resource, id, variables, meta } = params as any;
    const response = await api.put(
      ensureLeadingSlash(`${resource}/${id}`),
      serializeApiData(variables),
      {
        headers: resolveHeaders(meta),
      }
    );
    return { data: normalizeApiData(unwrapEnvelope(response.data)) as TData };
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord>(
    params: Parameters<DataProvider["deleteOne"]>[0]
  ): Promise<DeleteOneResponse<TData>> => {
    const { resource, id, meta } = params as any;
    const response = await api.delete(ensureLeadingSlash(`${resource}/${id}`), {
      headers: resolveHeaders(meta),
    });
    return { data: response.data as TData };
  },

  getMany: async <TData extends BaseRecord = BaseRecord>(
    params: GetManyParams
  ): Promise<GetManyResponse<TData>> => {
    const { resource, ids, meta } = params as any;
    const records = await Promise.all(
      ids.map(async (id: string | number) => {
        const response = await api.get(ensureLeadingSlash(`${resource}/${id}`), {
          headers: resolveHeaders(meta),
          signal: resolveSignal(meta),
        });
        return normalizeApiData(unwrapEnvelope(response.data)) as TData;
      })
    );
    return { data: records };
  },

  custom: async <TData extends BaseRecord = BaseRecord>(
    params: CustomParams
  ): Promise<CustomResponse<TData>> => {
    const { url, method, payload, query, headers, meta } = params;
    const response = await api.request({
      url: /^https?:\/\//.test(url) ? url : ensureLeadingSlash(url),
      method,
      data: payload,
      params: query,
      headers: (headers as Record<string, string> | undefined) ?? resolveHeaders(meta),
      signal: resolveSignal(meta),
    });

    return { data: normalizeApiData(unwrapEnvelope(response.data)) as TData };
  },
};

const formatArg = (arg: unknown) => {
  if (typeof arg === "string" || typeof arg === "number" || typeof arg === "boolean") {
    return arg;
  }

  if (arg instanceof URL) {
    return arg.toString();
  }

  try {
    return JSON.parse(JSON.stringify(arg));
  } catch (error) {
    console.warn("[DataProvider] Unable to serialise argument for logging", arg, error);
    return arg;
  }
};

const formatArgs = (args: unknown[]) => args.map(formatArg);

const createDataProviderLogger = (dp: DataProvider): DataProvider =>
  new Proxy(dp, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof value !== "function") {
        return value;
      }

      return (...args: unknown[]) => {
        const formattedArgs = formatArgs(args);
        console.info("[DataProvider]", String(prop), formattedArgs);

        try {
          const result = (value as (...innerArgs: unknown[]) => unknown).apply(target, args);

          if (result instanceof Promise) {
            return result.finally(() => {
              console.info("[DataProvider]", String(prop), "completed");
            });
          }

          console.info("[DataProvider]", String(prop), "completed");
          return result;
        } catch (error) {
          console.error("[DataProvider]", String(prop), "failed", error);
          throw error;
        }
      };
    },
  });

const resolveDataProvider = () => {
  if (import.meta.env.DEV) {
    return createDataProviderLogger(dataProvider);
  }

  return dataProvider;
};

export { api, dataProvider, createDataProviderLogger, resolveDataProvider };
