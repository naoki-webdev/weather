import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

import { currentRequestId } from "./observability/request-context";
import { logStructured } from "./observability/structured-log";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    const observedClient = this.$extends({
      query: {
        $allOperations: async ({ model, operation, args, query }) => {
          const startedAt = process.hrtime.bigint();
          try {
            const result = await query(args);
            logStructured("info", {
              event: "db_query",
              request_id: currentRequestId(),
              model,
              operation,
              duration_ms: elapsedMilliseconds(startedAt),
            });
            return result;
          } catch (error) {
            logStructured("error", {
              event: "db_error",
              request_id: currentRequestId(),
              model,
              operation,
              duration_ms: elapsedMilliseconds(startedAt),
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          }
        },
      },
    });

    return Object.assign(observedClient, {
      onModuleInit: this.onModuleInit.bind(this),
      onModuleDestroy: this.onModuleDestroy.bind(this),
    }) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

function elapsedMilliseconds(startedAt: bigint) {
  return Math.round(Number(process.hrtime.bigint() - startedAt) / 10_000) / 100;
}
