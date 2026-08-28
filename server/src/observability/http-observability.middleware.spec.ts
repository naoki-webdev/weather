import type { NextFunction, Request, Response } from "express";

import { HttpObservabilityMiddleware } from "./http-observability.middleware";

describe("HttpObservabilityMiddleware", () => {
  const write = process.stdout.write;

  beforeEach(() => {
    process.stdout.write = jest.fn().mockReturnValue(true) as typeof process.stdout.write;
  });

  afterEach(() => {
    process.stdout.write = write;
  });

  it("assigns a request ID, exposes it in the response, and logs request timing", () => {
    let finish: (() => void) | undefined;
    const request = {
      get: jest.fn().mockReturnValue(undefined),
      method: "GET",
      path: "/api/cities",
      route: { path: "/api/cities" },
      baseUrl: "",
    } as unknown as Request;
    const response = {
      on: jest.fn((event: string, listener: () => void) => {
        if (event === "finish") finish = listener;
        return response;
      }),
      setHeader: jest.fn(),
      statusCode: 200,
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    new HttpObservabilityMiddleware().use(request, response, next);
    finish?.();

    expect(response.setHeader).toHaveBeenCalledWith("X-Request-Id", expect.any(String));
    expect(next).toHaveBeenCalledTimes(1);
    expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('"event":"http_request"'));
    expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('"route":"/api/cities"'));
  });

  it("reuses a valid request ID supplied by the trusted edge", () => {
    let finish: (() => void) | undefined;
    const request = {
      get: jest.fn().mockReturnValue("edge-request-42"),
      method: "GET",
      path: "/up",
      route: { path: "/up" },
      baseUrl: "",
    } as unknown as Request;
    const response = {
      on: jest.fn((_event: string, listener: () => void) => {
        finish = listener;
        return response;
      }),
      setHeader: jest.fn(),
      statusCode: 200,
    } as unknown as Response;

    new HttpObservabilityMiddleware().use(request, response, jest.fn() as NextFunction);
    finish?.();

    expect(response.setHeader).toHaveBeenCalledWith("X-Request-Id", "edge-request-42");
  });
});
