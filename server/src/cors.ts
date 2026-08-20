export function parseAllowedOrigins(value = process.env.FRONTEND_ORIGIN) {
  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes("*")) {
    throw new Error("FRONTEND_ORIGIN must contain at least one explicit origin.");
  }

  return origins;
}
