import { describe, expect, it, vi } from "vitest";

import { retry } from "./retry";

describe("retry", () => {
  it("returns the result when the action succeeds on the first try", async () => {
    const action = vi.fn().mockResolvedValue("ok");

    await expect(retry(action)).resolves.toBe("ok");
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("retries and resolves when a later attempt succeeds", async () => {
    vi.useFakeTimers();
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce("ok");

    const promise = retry(action);
    await vi.advanceTimersByTimeAsync(300);

    await expect(promise).resolves.toBe("ok");
    expect(action).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("throws the last error when all retries fail", async () => {
    vi.useFakeTimers();
    const action = vi.fn().mockRejectedValue(new Error("still failing"));

    const promise = retry(action, { retries: 1, delayMs: 300 });
    const assertion = expect(promise).rejects.toThrow("still failing");
    await vi.advanceTimersByTimeAsync(300);

    await assertion;
    expect(action).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
