import { describe, expect, test } from "vitest";

import { dateTimeInputValue } from "./travelDateTime";

describe("dateTimeInputValue", () => {
  test("formats the datetime-local wall clock in the requested city timezone", () => {
    expect(dateTimeInputValue(new Date("2026-08-20T13:00:00.000Z"), "America/New_York")).toBe("2026-08-20T09:00");
    expect(dateTimeInputValue(new Date("2026-08-20T13:00:00.000Z"), "Asia/Tokyo")).toBe("2026-08-20T22:00");
  });
});
