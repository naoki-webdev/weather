import { AsyncLocalStorage } from "node:async_hooks";
import type { Request } from "express";

type RequestContext = { requestId: string };
export type ObservedRequest = Request & { requestId?: string };

const storage = new AsyncLocalStorage<RequestContext>();
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function runWithRequestContext<T>(requestId: string, callback: () => T) {
  return storage.run({ requestId }, callback);
}

export function currentRequestId() {
  return storage.getStore()?.requestId;
}

export function readRequestId(request: Request) {
  const value = request.get("X-Request-Id")?.trim();
  return value && REQUEST_ID_PATTERN.test(value) ? value : undefined;
}

export function requestIdFor(request: ObservedRequest) {
  return request.requestId ?? currentRequestId();
}
