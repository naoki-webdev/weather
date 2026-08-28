export type LogLevel = "info" | "warn" | "error";

export function logStructured(level: LogLevel, fields: Record<string, unknown>) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    ...fields,
  };
  process.stdout.write(`${JSON.stringify(record)}\n`);
}
