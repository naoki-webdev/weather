import { parseAllowedOrigins } from "./cors";

describe("parseAllowedOrigins", () => {
  it("parses explicit comma-separated origins", () => {
    expect(parseAllowedOrigins(" http://localhost:5175,https://weather.example.com ")).toEqual([
      "http://localhost:5175",
      "https://weather.example.com",
    ]);
  });

  it("rejects a missing or wildcard origin", () => {
    expect(() => parseAllowedOrigins(undefined)).toThrow("FRONTEND_ORIGIN");
    expect(() => parseAllowedOrigins("   ")).toThrow("FRONTEND_ORIGIN");
    expect(() => parseAllowedOrigins("*")).toThrow("FRONTEND_ORIGIN");
  });
});
