import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

let historyWritePending = false;

export function useQueryState<T>(key: string, fallback: T, valid: (value: unknown) => value is T) {
  const fallbackRef = useRef(fallback);
  const validRef = useRef(valid);
  validRef.current = valid;
  const readValue = useCallback(() => {
    try {
      const raw = new URL(window.location.href).searchParams.get(key);
      const value: unknown = raw === null ? fallbackRef.current : JSON.parse(raw);
      return validRef.current(value) ? value : fallbackRef.current;
    } catch { return fallbackRef.current; }
  }, [key]);
  const [value, setValue] = useState<T>(readValue);
  const valueRef = useRef(value);
  valueRef.current = value;
  useEffect(() => {
    const restore = () => { const next = readValue(); valueRef.current = next; setValue(next); };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [readValue]);
  const update = useCallback((action: SetStateAction<T>) => {
    const next = typeof action === "function" ? (action as (previous: T) => T)(valueRef.current) : action;
    if (!validRef.current(next)) return;
    valueRef.current = next;
    setValue(next);
    const url = new URL(window.location.href);
    if (JSON.stringify(next) === JSON.stringify(fallbackRef.current)) url.searchParams.delete(key);
    else url.searchParams.set(key, JSON.stringify(next));
    if (url.href !== window.location.href) {
      if (historyWritePending) window.history.replaceState(null, "", url);
      else {
        window.history.pushState(null, "", url);
        historyWritePending = true;
        queueMicrotask(() => { historyWritePending = false; });
      }
    }
  }, [key]);
  return [value, update] as const;
}
