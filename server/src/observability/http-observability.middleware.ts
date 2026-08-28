import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { logStructured } from "./structured-log";
import { readRequestId, runWithRequestContext } from "./request-context";

type RequestWithUser = Request & { requestId?: string; user?: { id?: bigint | number | string } };

export class HttpObservabilityMiddleware {
  use(request: RequestWithUser, response: Response, next: NextFunction) {
    const requestId = readRequestId(request) ?? randomUUID();
    request.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);
    const startedAt = process.hrtime.bigint();

    response.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const userId = request.user?.id;
      logStructured("info", {
        event: "http_request",
        request_id: requestId,
        user_id: userId === undefined ? undefined : String(userId),
        method: request.method,
        route: routeFor(request),
        status: response.statusCode,
        duration_ms: Math.round(durationMs * 100) / 100,
      });
    });

    return runWithRequestContext(requestId, () => next());
  }
}

function routeFor(request: Request) {
  const route = request.route?.path;
  return route ? `${request.baseUrl ?? ""}${String(route)}` : request.path || request.url;
}
