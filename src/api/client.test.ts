import { afterEach, describe, expect, test, vi } from "vitest";

import { requestJson } from "./client";

describe("requestJson", () => {
  afterEach(() => vi.restoreAllMocks());

  test("preserves the backend error code and request ID", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: new Headers({ "X-Request-Id": "header-id" }),
      text: async () => JSON.stringify({
        code: "RATE_LIMITED",
        message: "リクエストが多すぎます。",
        errors: ["リクエストが多すぎます。"],
        requestId: "body-id",
      }),
    } as Response);

    await expect(requestJson("/api/cities")).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
      requestId: "body-id",
      errors: ["リクエストが多すぎます。"],
    });
  });
});
