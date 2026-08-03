import { describe, expect, it, vi } from "vitest";
import { buildTimeFeatures, fetchFeatures, mergeFeatures } from "../providers/features";

const allFalse = {
  dashboard: false,
  calendar: false,
  attendance: false,
  homerooms: false,
  settings: false,
  schedules: false,
  mutations: false,
  archives: false,
  reports: false,
  documents: false,
  audit: false,
};

describe("mergeFeatures", () => {
  it("reads the enveloped API shape", () => {
    const merged = mergeFeatures(
      { data: { features: { dashboard: true, scheduler: true, attendanceAlias: true } } },
      allFalse
    );

    expect(merged.dashboard).toBe(true);
    expect(merged.schedules).toBe(true);
    expect(merged.attendance).toBe(true);
    expect(merged.reports).toBe(false);
  });

  it("reads the bare API shape", () => {
    const merged = mergeFeatures({ features: { reports: true } }, allFalse);
    expect(merged.reports).toBe(true);
  });

  // The API's key names differ from the frontend's feature names; the mapping
  // must be applied rather than assuming they match.
  it("maps API key names onto frontend feature names", () => {
    const merged = mergeFeatures(
      {
        features: {
          calendarAlias: true,
          attendanceAlias: true,
          configuration: true,
          scheduler: true,
        },
      },
      allFalse
    );

    expect(merged.calendar).toBe(true);
    expect(merged.attendance).toBe(true);
    expect(merged.settings).toBe(true);
    expect(merged.schedules).toBe(true);
  });

  // A backend older than a flag must not silently hide a page the build enabled.
  it("keeps the fallback for keys the API omits", () => {
    const fallback = { ...allFalse, reports: true };
    const merged = mergeFeatures({ features: { dashboard: true } }, fallback);

    expect(merged.dashboard).toBe(true);
    expect(merged.reports).toBe(true);
  });

  it("ignores non-boolean values", () => {
    const fallback = { ...allFalse, reports: true };
    const merged = mergeFeatures({ features: { reports: "yes", dashboard: 1 } }, fallback);

    expect(merged.reports).toBe(true);
    expect(merged.dashboard).toBe(false);
  });

  it("falls back on a malformed payload", () => {
    const fallback = { ...allFalse, archives: true };

    expect(mergeFeatures(null, fallback)).toEqual(fallback);
    expect(mergeFeatures("nope", fallback)).toEqual(fallback);
    expect(mergeFeatures({}, fallback)).toEqual(fallback);
    expect(mergeFeatures({ features: [] }, fallback)).toEqual(fallback);
  });
});

describe("fetchFeatures", () => {
  it("returns the merged remote flags on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { features: { reports: true, mutations: true } } }),
    });

    const features = await fetchFeatures("http://api.test/api/v1", {
      fetchImpl: fetchImpl as never,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/features",
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(features.reports).toBe(true);
    expect(features.mutations).toBe(true);
  });

  it("strips trailing slashes from the base URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ features: {} }),
    });

    await fetchFeatures("http://api.test/api/v1///", { fetchImpl: fetchImpl as never });

    expect(fetchImpl).toHaveBeenCalledWith("http://api.test/api/v1/features", expect.anything());
  });

  // A discovery failure must leave the shell usable, not empty.
  it("falls back to build-time flags on a non-OK response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    const features = await fetchFeatures("http://api.test", { fetchImpl: fetchImpl as never });

    expect(features).toEqual(buildTimeFeatures());
  });

  it("falls back to build-time flags when the request throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));

    const features = await fetchFeatures("http://api.test", { fetchImpl: fetchImpl as never });

    expect(features).toEqual(buildTimeFeatures());
  });

  it("falls back when the body is not JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      },
    });

    const features = await fetchFeatures("http://api.test", { fetchImpl: fetchImpl as never });

    expect(features).toEqual(buildTimeFeatures());
  });

  // Some runtimes (older jsdom, SSR shims) have no global fetch at all.
  it("falls back when no fetch implementation is available", async () => {
    const features = await fetchFeatures("http://api.test", {
      fetchImpl: null as unknown as typeof fetch,
    });
    expect(features).toEqual(buildTimeFeatures());
  });

  it("exposes every feature name as a boolean", () => {
    const features = buildTimeFeatures();
    expect(Object.keys(features).sort()).toEqual(Object.keys(allFalse).sort());
    Object.values(features).forEach((value) => expect(typeof value).toBe("boolean"));
  });
});
