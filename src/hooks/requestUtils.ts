export function isAbortError(error: unknown) {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}
