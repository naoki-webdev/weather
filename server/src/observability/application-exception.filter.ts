import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { randomUUID } from "node:crypto";

import { requestIdFor, type ObservedRequest } from "./request-context";
import { logStructured } from "./structured-log";

type ErrorBody = { code?: unknown; errors?: unknown; message?: unknown };

const STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "UNPROCESSABLE_ENTITY",
  [HttpStatus.TOO_MANY_REQUESTS]: "RATE_LIMITED",
  [HttpStatus.BAD_GATEWAY]: "BAD_GATEWAY",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_SERVER_ERROR",
};

const DEFAULT_MESSAGES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "リクエストが正しくありません。",
  [HttpStatus.UNAUTHORIZED]: "認証が必要です。",
  [HttpStatus.FORBIDDEN]: "この操作は許可されていません。",
  [HttpStatus.NOT_FOUND]: "指定されたリソースが見つかりません。",
  [HttpStatus.CONFLICT]: "リクエストが現在の状態と競合しています。",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "入力内容を処理できません。",
  [HttpStatus.TOO_MANY_REQUESTS]: "リクエストが多すぎます。しばらく待ってから再試行してください。",
  [HttpStatus.BAD_GATEWAY]: "外部サービスから応答を取得できませんでした。",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "サーバーエラーが発生しました。",
};

@Catch()
export class ApplicationExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<ObservedRequest>();
    const response = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = requestIdFor(request) ?? randomUUID();
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const errors = messagesFor(status, body);
    const code = codeFor(body, status);
    const message = errors.join(" / ");
    const userId = (request as ObservedRequest & { user?: { id?: bigint | number | string } }).user?.id;

    response.setHeader("X-Request-Id", requestId);
    logStructured(status >= 500 ? "error" : "warn", {
      event: "http_error",
      request_id: requestId,
      user_id: userId === undefined ? undefined : String(userId),
      method: request.method,
      route: request.route?.path ? `${request.baseUrl ?? ""}${String(request.route.path)}` : request.path || request.url,
      status,
      error_code: code,
      error_type: exception instanceof Error ? exception.name : typeof exception,
      error: exception instanceof Error ? exception.message : String(exception),
    });

    response.status(status).json({ code, message, errors, requestId });
  }
}

function messagesFor(status: number, body: unknown) {
  if (status >= 500 && status !== HttpStatus.BAD_GATEWAY) return [DEFAULT_MESSAGES[HttpStatus.INTERNAL_SERVER_ERROR]];

  const errorBody = isErrorBody(body) ? body : undefined;
  const rawMessages = status === HttpStatus.TOO_MANY_REQUESTS
    ? undefined
    : errorBody?.errors ?? errorBody?.message ?? (typeof body === "string" ? body : undefined);
  const messages = Array.isArray(rawMessages) ? rawMessages.map(String).filter(Boolean) : rawMessages === undefined ? [] : [String(rawMessages)];
  return messages.length > 0 ? messages : [DEFAULT_MESSAGES[status] ?? "リクエストを処理できませんでした。"];
}

function codeFor(body: unknown, status: number) {
  const code = isErrorBody(body) && typeof body.code === "string" ? body.code : undefined;
  return code ?? STATUS_CODES[status] ?? `HTTP_${status}`;
}

function isErrorBody(value: unknown): value is ErrorBody {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
