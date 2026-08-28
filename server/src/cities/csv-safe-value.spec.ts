import { safeCsvValue } from "./csv-safe-value";

describe("safeCsvValue", () => {
  it.each(["=SUM(A1:A2)", "+SUM(A1:A2)", "-2+3", "@cmd"])("neutralizes formula-like values: %s", (value) => {
    expect(safeCsvValue(value)).toBe(`'${value}`);
  });

  it("keeps ordinary text unchanged", () => {
    expect(safeCsvValue("東京")).toBe("東京");
  });
});
