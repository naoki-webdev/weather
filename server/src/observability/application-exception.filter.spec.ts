import { HttpException, HttpStatus } from "@nestjs/common";

import { ApplicationExceptionFilter } from "./application-exception.filter";

describe("ApplicationExceptionFilter", () => {
  const write = process.stdout.write;

  beforeEach(() => {
    process.stdout.write = jest.fn().mockReturnValue(true) as typeof process.stdout.write;
  });

  afterEach(() => {
    process.stdout.write = write;
  });

  function host(requestId = "request-123") {
    const response = {
      json: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn(),
    };
    response.status.mockReturnValue(response);
    return {
      host: {
        switchToHttp: () => ({
          getRequest: () => ({ method: "GET", path: "/api/cities", requestId }),
          getResponse: () => response,
        }),
      } as never,
      response,
    };
  }

  it("returns a stable code and request ID while preserving user-facing errors", () => {
    const { host: executionHost, response } = host();

    new ApplicationExceptionFilter().catch(
      new HttpException({ errors: ["都市が見つかりません。"] }, HttpStatus.NOT_FOUND),
      executionHost,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.setHeader).toHaveBeenCalledWith("X-Request-Id", "request-123");
    expect(response.json).toHaveBeenCalledWith({
      code: "NOT_FOUND",
      message: "都市が見つかりません。",
      errors: ["都市が見つかりません。"],
      requestId: "request-123",
    });
  });

  it("does not expose an internal error message for a 500 response", () => {
    const { host: executionHost, response } = host("request-500");

    new ApplicationExceptionFilter().catch(new Error("database password leaked"), executionHost);

    expect(response.json).toHaveBeenCalledWith({
      code: "INTERNAL_SERVER_ERROR",
      message: "サーバーエラーが発生しました。",
      errors: ["サーバーエラーが発生しました。"],
      requestId: "request-500",
    });
  });

  it("uses the application message for rate-limited responses", () => {
    const { host: executionHost, response } = host("request-429");

    new ApplicationExceptionFilter().catch(new HttpException("ThrottlerException: Too Many Requests", HttpStatus.TOO_MANY_REQUESTS), executionHost);

    expect(response.json).toHaveBeenCalledWith({
      code: "RATE_LIMITED",
      message: "リクエストが多すぎます。しばらく待ってから再試行してください。",
      errors: ["リクエストが多すぎます。しばらく待ってから再試行してください。"],
      requestId: "request-429",
    });
  });
});
