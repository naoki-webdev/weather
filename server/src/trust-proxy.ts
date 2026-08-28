const DEFAULT_PRODUCTION_TRUST_PROXY_HOPS = 1;

export function trustProxyHops(
  nodeEnv = process.env.NODE_ENV,
  configuredValue = process.env.TRUST_PROXY_HOPS,
) {
  const value = configuredValue?.trim();
  if (!value) return nodeEnv === "production" ? DEFAULT_PRODUCTION_TRUST_PROXY_HOPS : 0;
  if (!/^\d+$/.test(value)) throw new Error("TRUST_PROXY_HOPS must be a non-negative integer.");

  const hops = Number(value);
  if (!Number.isSafeInteger(hops)) throw new Error("TRUST_PROXY_HOPS must be a safe integer.");
  return hops;
}
