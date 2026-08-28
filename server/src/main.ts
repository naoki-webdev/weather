import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";
import { join } from "node:path";

import { AppModule } from "./app.module";
import { ApplicationExceptionFilter } from "./observability/application-exception.filter";
import { HttpObservabilityMiddleware } from "./observability/http-observability.middleware";
import { parseAllowedOrigins } from "./cors";
import { trustProxyHops } from "./trust-proxy";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const express = app.getHttpAdapter().getInstance();
  const observability = new HttpObservabilityMiddleware();
  app.use(observability.use.bind(observability));
  app.useGlobalFilters(new ApplicationExceptionFilter());
  express.set("trust proxy", trustProxyHops());
  app.enableCors({ origin: parseAllowedOrigins(), credentials: true, exposedHeaders: ["Content-Disposition"] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  // `start:dev` runs from `/app/server`, while the production image runs from `/app`.
  // Resolve the shared frontend bundle from the compiled entrypoint instead of cwd.
  const publicDir = join(__dirname, "..", "..", "public");
  app.useStaticAssets(publicDir, {
    setHeaders: (response, filePath) => {
      if (filePath.endsWith("index.html")) response.setHeader("Cache-Control", "no-store, max-age=0");
    },
  });

  express.get(/^\/(?!api(?:\/|$)|up(?:\/|$)).*/, (_request: unknown, response: { setHeader: (name: string, value: string) => void; sendFile: (path: string) => void }) => {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.sendFile(join(publicDir, "index.html"));
  });

  await app.listen(Number(process.env.PORT ?? 3201), "0.0.0.0");
}

void bootstrap();
