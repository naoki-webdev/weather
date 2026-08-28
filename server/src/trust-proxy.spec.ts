import { trustProxyHops } from "./trust-proxy";

describe("trustProxyHops", () => {
  it("trusts one proxy by default in production", () => {
    expect(trustProxyHops("production", undefined)).toBe(1);
  });

  it("does not trust a proxy by default outside production", () => {
    expect(trustProxyHops("development", undefined)).toBe(0);
  });

  it("accepts an explicit hop count", () => {
    expect(trustProxyHops("production", "2")).toBe(2);
    expect(trustProxyHops("production", " 0 ")).toBe(0);
  });

  it("rejects an invalid hop count", () => {
    expect(() => trustProxyHops("production", "proxy")).toThrow("TRUST_PROXY_HOPS");
  });
});
