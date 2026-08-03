/**
 * Shared active-term resolution.
 *
 * Two contracts have to meet here. The API returns `is_active`, which the data
 * provider normalizes to `isActive`; the MSW fixtures predate that and expose
 * `active`. Screens were reading only `active`, so against the real backend the
 * predicate was always false and every caller quietly fell back to "first term
 * in the list". With one seeded term that looks correct, which is why it went
 * unnoticed; with two it silently picks the wrong one.
 *
 * The list filter has the same split: the API parses `isActive`, so a
 * `field: "active"` filter is dropped and the request returns every term.
 */

/** Minimum shape a term must have to be resolved. */
export type ActiveTermFlags = {
  /** MSW fixture flag. */
  active?: boolean;
  /** API flag, normalized from `is_active`. */
  isActive?: boolean;
};

/** Query field the API honours when filtering terms by active flag. */
export const ACTIVE_TERM_FILTER_FIELD = "isActive";

/** True when the term is flagged active under either contract. */
export const isTermActive = (term: ActiveTermFlags): boolean =>
  term.isActive === true || term.active === true;

/**
 * Picks the active term, falling back to the first entry so a deployment that
 * has not flagged one still renders instead of showing an empty screen.
 */
export const resolveActiveTerm = <T extends ActiveTermFlags>(
  terms: readonly T[] | undefined | null
): T | null => {
  if (!terms?.length) return null;
  return terms.find(isTermActive) ?? terms[0] ?? null;
};

/** Term types the API accepts (models.TermType). */
export const TERM_TYPES = ["SEMESTER", "TRIMESTER", "QUARTER"] as const;

export type TermType = (typeof TERM_TYPES)[number];

export const DEFAULT_TERM_TYPE: TermType = "SEMESTER";

/**
 * Widens a date to the RFC3339 instant the API's `time.Time` fields require.
 * A bare `YYYY-MM-DD` fails binding, which surfaces as a bare
 * "invalid payload" with no indication of which field was at fault.
 */
export const toApiDate = (value: unknown): string | undefined => {
  if (value == null || value === "") return undefined;

  if (typeof value === "object" && value !== null && "toISOString" in value) {
    const iso = (value as { toISOString: () => string }).toISOString();
    return iso;
  }

  const text = String(value).trim();
  if (!text) return undefined;
  // Already an instant.
  if (text.includes("T")) return text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00Z`;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

/**
 * Derives the academic year label the API requires from a start date. The
 * Indonesian school year opens in July, so a term starting in or after July
 * belongs to `Y/Y+1` and anything earlier to `Y-1/Y`.
 */
export const deriveAcademicYear = (start: unknown): string | undefined => {
  const iso = toApiDate(start);
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;

  const year = date.getUTCFullYear();
  // getUTCMonth is zero-based; July is 6.
  return date.getUTCMonth() >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

/** Form shape the term screens collect. */
export type TermFormPayload = {
  name?: string;
  type?: string;
  academicYear?: string;
  startDate?: unknown;
  endDate?: unknown;
  /** Either flag name; both are accepted so callers need not care. */
  active?: boolean;
  isActive?: boolean;
};

/**
 * Maps a term form onto the API contract. The dataProvider snake_cases keys on
 * the way out, so this stays camelCase and only has to fix the parts the forms
 * get wrong: the flag name, the date format, and the two required fields
 * (`type`, `academicYear`) that no form used to send.
 */
export const buildTermPayload = (values: TermFormPayload) => {
  const startDate = toApiDate(values.startDate);
  const endDate = toApiDate(values.endDate);

  return {
    name: values.name?.trim(),
    type: values.type?.trim() || DEFAULT_TERM_TYPE,
    academicYear: values.academicYear?.trim() || deriveAcademicYear(startDate),
    startDate,
    endDate,
    isActive: values.isActive ?? values.active ?? false,
  };
};
