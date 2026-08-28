import { parseTravelDateTime, TravelDateTimeError } from "./timezone";

describe("parseTravelDateTime", () => {
  it("converts a local datetime using the requested timezone", () => {
    expect(parseTravelDateTime("2026-08-20T09:00", "Asia/Tokyo").toISOString()).toBe("2026-08-20T00:00:00.000Z");
  });

  it("rejects a calendar date that does not exist", () => {
    expect(() => parseTravelDateTime("2026-02-31T09:00", "Asia/Tokyo")).toThrow(TravelDateTimeError);
  });

  it("rejects a local time skipped by the start of daylight saving time", () => {
    expect(() => parseTravelDateTime("2026-03-08T02:30", "America/New_York")).toThrow(TravelDateTimeError);
  });

  it("rejects a local time that occurs twice at the end of daylight saving time", () => {
    expect(() => parseTravelDateTime("2026-11-01T01:30", "America/New_York")).toThrow(TravelDateTimeError);
  });
});
