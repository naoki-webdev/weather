import { afterEach, describe, expect, test, vi } from "vitest";

import { compareCities } from "./cityRequests";

describe("city requests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("passes an AbortSignal to the comparison request", async () => {
    const controller = new AbortController();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ cities: [], meta: { count: 0, leader_id: null, average_score: 0, history_period_days: 30 } }),
    } as Response);

    await compareCities([1, 2], controller.signal);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("ids%5B%5D=1"),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
