ALTER TABLE "weather_snapshots" ADD COLUMN "forecast_fetched_at" TIMESTAMP(6), ADD COLUMN "air_quality_fetched_at" TIMESTAMP(6);
UPDATE "weather_snapshots" SET "forecast_fetched_at" = "fetched_at" WHERE "current_temperature" IS NOT NULL;
UPDATE "weather_snapshots" SET "air_quality_fetched_at" = "fetched_at" WHERE "current_us_aqi" IS NOT NULL;
ALTER TABLE "cities" ADD COLUMN "deleted_at" TIMESTAMP(6);
CREATE INDEX "cities_user_deleted_idx" ON "cities" ("user_id","deleted_at");
ALTER TABLE "weather_snapshots" ADD COLUMN "forecast_sync_failed" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "air_quality_sync_failed" BOOLEAN NOT NULL DEFAULT false;
