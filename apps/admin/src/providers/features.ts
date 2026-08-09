/**
 * Runtime feature discovery.
 *
 * The backend defaults every optional module to disabled, and which ones are
 * mounted is a property of the deployment, not of this bundle. Baking the answer
 * into `VITE_ENABLE_*` at build time means one wrong env var produces navigation
 * entries whose pages can only 404.
 *
 * So we ask the API. `GET /features` is unauthenticated and returns only
 * booleans, so it can be read before login while the shell is still deciding
 * what to render. The build-time flags remain the fallback for when the API is
 * unreachable (offline dev, MSW runs, or a failed deploy), which keeps the app
 * usable rather than empty.
 */

export type FeatureName =
  | "dashboard"
  | "calendar"
  | "attendance"
  | "homerooms"
  | "settings"
  | "schedules"
  | "mutations"
  | "archives"
  | "reports"
  | "documents"
  | "audit"
  | "analytics";

/** Maps the API's feature keys onto the frontend's feature names. */
const apiFeatureKeys: Record<FeatureName, string> = {
  dashboard: "dashboard",
  calendar: "calendarAlias",
  attendance: "attendanceAlias",
  homerooms: "homerooms",
  settings: "configuration",
  schedules: "scheduler",
  mutations: "mutations",
  archives: "archives",
  reports: "reports",
  documents: "documents",
  audit: "audit",
  analytics: "analytics",
};

export type FeatureFlags = Record<FeatureName, boolean>;

const FEATURE_NAMES = Object.keys(apiFeatureKeys) as FeatureName[];

const envFlag = (feature: FeatureName) => import.meta.env.VITE_ENABLE_ALL_FEATURES === "true";

/** Flags derived purely from the build, used until the API answers. */
export const buildTimeFeatures = (): FeatureFlags =>
  FEATURE_NAMES.reduce((acc, feature) => {
    acc[feature] = envFlag(feature);
    return acc;
  }, {} as FeatureFlags);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Pulls the flag map out of the response, tolerating both the enveloped
 * (`{ data: { features } }`) and bare (`{ features }`) shapes.
 */
const extractFeatureMap = (payload: unknown): Record<string, unknown> | null => {
  if (!isRecord(payload)) return null;
  const body = isRecord(payload.data) ? payload.data : payload;
  if (isRecord(body.features)) return body.features;
  return null;
};

/**
 * Merges the API response over the build-time defaults. Keys the API omits keep
 * their build-time value so a backend that predates a flag does not silently
 * hide a working page.
 */
export const mergeFeatures = (payload: unknown, fallback = buildTimeFeatures()): FeatureFlags => {
  const remote = extractFeatureMap(payload);
  if (!remote) return fallback;

  return FEATURE_NAMES.reduce((acc, feature) => {
    const value = remote[apiFeatureKeys[feature]];
    acc[feature] = typeof value === "boolean" ? value : fallback[feature];
    return acc;
  }, {} as FeatureFlags);
};

/**
 * Fetches the runtime feature set. Never throws: on any failure it returns the
 * build-time flags so the shell still renders.
 */
export const fetchFeatures = async (
  baseUrl: string,
  options: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<FeatureFlags> => {
  const fallback = buildTimeFeatures();
  const { timeoutMs = 4000, fetchImpl = globalThis.fetch } = options;

  if (typeof fetchImpl !== "function") return fallback;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${baseUrl.replace(/\/+$/, "")}/features`;
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      console.warn("[features] Discovery returned", response.status, "- using build-time flags");
      return fallback;
    }
    return mergeFeatures(await response.json(), fallback);
  } catch (error) {
    console.warn(
      "[features] Discovery unavailable, using build-time flags:",
      error instanceof Error ? error.message : String(error)
    );
    return fallback;
  } finally {
    clearTimeout(timer);
  }
};
