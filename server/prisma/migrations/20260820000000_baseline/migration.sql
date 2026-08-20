-- Baseline for the existing Rails PostgreSQL schema.
-- The IF NOT EXISTS clauses allow this migration to be deployed safely
-- against databases that were created by the former bootstrap script.

CREATE TABLE IF NOT EXISTS "users" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "password_digest" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_only" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "index_users_on_lower_email" ON "users"(LOWER("email"));

CREATE TABLE IF NOT EXISTS "cities" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" VARCHAR NOT NULL,
    "country" VARCHAR NOT NULL DEFAULT '',
    "country_code" VARCHAR NOT NULL DEFAULT '',
    "admin1" VARCHAR NOT NULL DEFAULT '',
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "timezone" VARCHAR NOT NULL DEFAULT 'UTC',
    "external_id" VARCHAR NOT NULL,
    "source_name" VARCHAR NOT NULL DEFAULT 'Open-Meteo',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "index_cities_on_user_id_and_external_id" UNIQUE ("user_id", "external_id"),
    CONSTRAINT "cities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "index_cities_on_user_id_and_favorite" ON "cities"("user_id", "favorite");
CREATE INDEX IF NOT EXISTS "index_cities_on_user_id_and_name" ON "cities"("user_id", "name");

CREATE TABLE IF NOT EXISTS "weather_preferences" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "target_temperature" DECIMAL(5,2) NOT NULL DEFAULT 21.0,
    "temperature_weight" INTEGER NOT NULL DEFAULT 5,
    "precipitation_weight" INTEGER NOT NULL DEFAULT 4,
    "humidity_weight" INTEGER NOT NULL DEFAULT 2,
    "wind_weight" INTEGER NOT NULL DEFAULT 2,
    "air_quality_weight" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weather_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "weather_preferences_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "weather_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "weather_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "city_id" BIGINT NOT NULL,
    "fetched_at" TIMESTAMP(6) NOT NULL,
    "current_temperature" DECIMAL(5,2),
    "current_humidity" INTEGER,
    "current_precipitation" DECIMAL(6,2),
    "current_wind_speed" DECIMAL(6,2),
    "current_weather_code" INTEGER,
    "current_us_aqi" DECIMAL(6,2),
    "current_pm2_5" DECIMAL(7,2),
    "current_pm10" DECIMAL(7,2),
    "daily_data" JSONB NOT NULL DEFAULT '{}',
    "source_name" VARCHAR NOT NULL DEFAULT 'Open-Meteo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weather_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "weather_snapshots_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "index_weather_snapshots_on_city_id_and_fetched_at" ON "weather_snapshots"("city_id", "fetched_at");

CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "action" VARCHAR NOT NULL,
    "resource_type" VARCHAR NOT NULL,
    "resource_id" BIGINT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "index_activity_logs_on_user_id_and_created_at" ON "activity_logs"("user_id", "created_at");
