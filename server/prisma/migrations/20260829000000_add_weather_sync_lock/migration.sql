CREATE TABLE "weather_sync_locks" (
    "name" VARCHAR(64) NOT NULL,
    "owner" VARCHAR(36) NOT NULL,
    "locked_until" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weather_sync_locks_pkey" PRIMARY KEY ("name")
);
