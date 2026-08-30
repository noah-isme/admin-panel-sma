/**
 * Destinations exposed by the setup wizard summary.
 *
 * Keep this list intentionally narrow. The value passed to `navigate` is a
 * runtime value even though the current callers use constants, so a type
 * annotation alone would not protect the browser from a crafted destination.
 */
export const SETUP_SUMMARY_ROUTES = ["/terms", "/students"] as const;

const setupSummaryRouteAllowlist = new Set<string>(SETUP_SUMMARY_ROUTES);
const unsafeRouteCharacters = /[\\\s]/;
const encodedPathSeparator = /%(?:2f|5c)/i;
const routeScheme = /^[a-z][a-z\d+.-]*:/i;

const containsControlCharacter = (target: string): boolean => {
  for (const character of target) {
    const code = character.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
};

/**
 * Returns true only for an exact, allowlisted route in the admin SPA.
 *
 * In particular, reject backslashes before React Router sees the value. A
 * browser can interpret them as path separators, which turns a seemingly
 * internal destination such as `/\\\\example.test` into a protocol-relative
 * navigation. The URL-origin check is a second defense for protocol-relative
 * and scheme-based destinations.
 */
export const isSafeInternalRoute = (
  target: unknown
): target is (typeof SETUP_SUMMARY_ROUTES)[number] => {
  if (typeof target !== "string" || target.length === 0) return false;
  if (!target.startsWith("/") || target.startsWith("//")) return false;
  if (routeScheme.test(target)) return false;
  if (
    unsafeRouteCharacters.test(target) ||
    containsControlCharacter(target) ||
    encodedPathSeparator.test(target)
  ) {
    return false;
  }
  if (!setupSummaryRouteAllowlist.has(target)) return false;

  try {
    const parsed = new URL(target, "https://sma.invalid");
    return parsed.origin === "https://sma.invalid" && parsed.pathname === target;
  } catch {
    return false;
  }
};

/** Resolve an untrusted summary destination to a safe in-app fallback. */
export const getSafeInternalRoute = (
  target?: unknown
): "/" | (typeof SETUP_SUMMARY_ROUTES)[number] => (isSafeInternalRoute(target) ? target : "/");
