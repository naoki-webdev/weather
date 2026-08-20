import { execFileSync } from "node:child_process";

import { Prisma, PrismaClient } from "@prisma/client";

export const BASELINE_MIGRATION = "20260820000000_baseline";
export const REQUIRED_TABLES = [
  "users",
  "cities",
  "weather_preferences",
  "weather_snapshots",
  "activity_logs",
] as const;

type RequiredColumn = {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: "YES" | "NO";
  numericPrecision?: number;
  numericScale?: number;
};

export type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  numeric_precision: number | null;
  numeric_scale: number | null;
};

export type IndexRow = { table_name: string; indexdef: string };
export type ConstraintRow = { table_name: string; constraint_type: string; definition: string };

export type BaselineSchema = {
  tables: string[];
  columns: ColumnRow[];
  indexes: IndexRow[];
  constraints: ConstraintRow[];
};

const requiredColumnDefinitions: Array<[string, string, string, "YES" | "NO", number?, number?]> = [
  ["users", "id", "bigint", "NO", 64, 0],
  ["users", "name", "character varying", "NO"],
  ["users", "email", "character varying", "NO"],
  ["users", "password_digest", "character varying", "NO"],
  ["users", "created_at", "timestamp without time zone", "NO"],
  ["users", "updated_at", "timestamp without time zone", "NO"],
  ["users", "read_only", "boolean", "NO"],
  ["cities", "id", "bigint", "NO", 64, 0],
  ["cities", "user_id", "bigint", "NO", 64, 0],
  ["cities", "name", "character varying", "NO"],
  ["cities", "country", "character varying", "NO"],
  ["cities", "country_code", "character varying", "NO"],
  ["cities", "admin1", "character varying", "NO"],
  ["cities", "latitude", "numeric", "NO", 9, 6],
  ["cities", "longitude", "numeric", "NO", 9, 6],
  ["cities", "timezone", "character varying", "NO"],
  ["cities", "external_id", "character varying", "NO"],
  ["cities", "source_name", "character varying", "NO"],
  ["cities", "favorite", "boolean", "NO"],
  ["cities", "created_at", "timestamp without time zone", "NO"],
  ["cities", "updated_at", "timestamp without time zone", "NO"],
  ["weather_preferences", "id", "bigint", "NO", 64, 0],
  ["weather_preferences", "user_id", "bigint", "NO", 64, 0],
  ["weather_preferences", "target_temperature", "numeric", "NO", 5, 2],
  ["weather_preferences", "temperature_weight", "integer", "NO", 32, 0],
  ["weather_preferences", "precipitation_weight", "integer", "NO", 32, 0],
  ["weather_preferences", "humidity_weight", "integer", "NO", 32, 0],
  ["weather_preferences", "wind_weight", "integer", "NO", 32, 0],
  ["weather_preferences", "air_quality_weight", "integer", "NO", 32, 0],
  ["weather_preferences", "created_at", "timestamp without time zone", "NO"],
  ["weather_preferences", "updated_at", "timestamp without time zone", "NO"],
  ["weather_snapshots", "id", "bigint", "NO", 64, 0],
  ["weather_snapshots", "city_id", "bigint", "NO", 64, 0],
  ["weather_snapshots", "fetched_at", "timestamp without time zone", "NO"],
  ["weather_snapshots", "current_temperature", "numeric", "YES", 5, 2],
  ["weather_snapshots", "current_humidity", "integer", "YES", 32, 0],
  ["weather_snapshots", "current_precipitation", "numeric", "YES", 6, 2],
  ["weather_snapshots", "current_wind_speed", "numeric", "YES", 6, 2],
  ["weather_snapshots", "current_weather_code", "integer", "YES", 32, 0],
  ["weather_snapshots", "current_us_aqi", "numeric", "YES", 6, 2],
  ["weather_snapshots", "current_pm2_5", "numeric", "YES", 7, 2],
  ["weather_snapshots", "current_pm10", "numeric", "YES", 7, 2],
  ["weather_snapshots", "daily_data", "jsonb", "NO"],
  ["weather_snapshots", "source_name", "character varying", "NO"],
  ["weather_snapshots", "created_at", "timestamp without time zone", "NO"],
  ["weather_snapshots", "updated_at", "timestamp without time zone", "NO"],
  ["activity_logs", "id", "bigint", "NO", 64, 0],
  ["activity_logs", "user_id", "bigint", "NO", 64, 0],
  ["activity_logs", "action", "character varying", "NO"],
  ["activity_logs", "resource_type", "character varying", "NO"],
  ["activity_logs", "resource_id", "bigint", "YES", 64, 0],
  ["activity_logs", "metadata", "jsonb", "NO"],
  ["activity_logs", "created_at", "timestamp without time zone", "NO"],
  ["activity_logs", "updated_at", "timestamp without time zone", "NO"],
];

export const REQUIRED_COLUMNS: RequiredColumn[] = requiredColumnDefinitions.map(([tableName, columnName, dataType, isNullable, numericPrecision, numericScale]) => ({
  tableName,
  columnName,
  dataType,
  isNullable: isNullable as "YES" | "NO",
  ...(numericPrecision === undefined ? {} : { numericPrecision, numericScale }),
}));

type RequiredIndex = { tableName: string; unique: boolean; expression: string };

export const REQUIRED_INDEXES: RequiredIndex[] = [
  { tableName: "users", unique: true, expression: "lower((email)::text)" },
  { tableName: "cities", unique: true, expression: "(user_id, external_id)" },
  { tableName: "cities", unique: false, expression: "(user_id, favorite)" },
  { tableName: "cities", unique: false, expression: "(user_id, name)" },
  { tableName: "weather_preferences", unique: true, expression: "(user_id)" },
  { tableName: "weather_snapshots", unique: false, expression: "(city_id, fetched_at)" },
  { tableName: "activity_logs", unique: false, expression: "(user_id, created_at)" },
];

const REQUIRED_FOREIGN_KEYS = [
  ["cities", "foreign key (user_id) references users(id)"],
  ["weather_preferences", "foreign key (user_id) references users(id)"],
  ["weather_snapshots", "foreign key (city_id) references cities(id)"],
  ["activity_logs", "foreign key (user_id) references users(id)"],
] as const;

const prisma = new PrismaClient();

type TableRow = { table_name: string };
type MigrationRow = { migration_name: string };

export function baselineSchemaMatches(schema: BaselineSchema) {
  const tableNames = new Set(schema.tables);
  if (!REQUIRED_TABLES.every((tableName) => tableNames.has(tableName))) return false;

  const columns = new Map(schema.columns.map((column) => [`${column.table_name}.${column.column_name}`, column]));
  const columnMatches = REQUIRED_COLUMNS.every((required) => {
    const actual = columns.get(`${required.tableName}.${required.columnName}`);
    if (!actual || actual.data_type !== required.dataType || actual.is_nullable !== required.isNullable) return false;
    if (required.numericPrecision !== undefined && actual.numeric_precision !== required.numericPrecision) return false;
    if (required.numericScale !== undefined && actual.numeric_scale !== required.numericScale) return false;
    return true;
  });
  if (!columnMatches) return false;

  const normalizedIndexes = schema.indexes.map((index) => ({
    tableName: index.table_name,
    definition: normalizeDefinition(index.indexdef),
  }));
  const indexMatches = REQUIRED_INDEXES.every((required) => normalizedIndexes.some((actual) => {
    if (actual.tableName !== required.tableName) return false;
    const isUnique = actual.definition.startsWith("create unique index");
    return isUnique === required.unique && actual.definition.includes(normalizeDefinition(required.expression));
  }));
  if (!indexMatches) return false;

  const normalizedConstraints = schema.constraints.map((constraint) => ({
    tableName: constraint.table_name,
    type: constraint.constraint_type,
    definition: normalizeDefinition(constraint.definition),
  }));
  const primaryKeysMatch = REQUIRED_TABLES.every((tableName) => normalizedConstraints.some((constraint) => (
    constraint.tableName === tableName && constraint.type === "p" && constraint.definition.includes("primary key (id)")
  )));
  if (!primaryKeysMatch) return false;

  return REQUIRED_FOREIGN_KEYS.every(([tableName, definition]) => normalizedConstraints.some((constraint) => (
    constraint.tableName === tableName && constraint.type === "f" && constraint.definition.includes(definition)
  )));
}

function normalizeDefinition(value: string) {
  return value.toLowerCase().replaceAll('"', "").replace(/\s+/g, " ").trim();
}

async function prepareDatabase() {
  const tables = await prisma.$queryRaw<TableRow[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (${Prisma.join(REQUIRED_TABLES)})
  `;
  const tableNames = tables.map((table) => table.table_name);
  if (tableNames.length === 0) return;
  if (tableNames.length !== REQUIRED_TABLES.length) {
    throw new Error("Existing database has a partial baseline schema; refusing to mark Prisma baseline as applied.");
  }

  const [columns, indexes, constraints] = await Promise.all([
    prisma.$queryRaw<ColumnRow[]>`
      SELECT table_name, column_name, data_type, is_nullable, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (${Prisma.join(REQUIRED_TABLES)})
    `,
    prisma.$queryRaw<IndexRow[]>`
      SELECT tablename AS table_name, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN (${Prisma.join(REQUIRED_TABLES)})
    `,
    prisma.$queryRaw<ConstraintRow[]>`
      SELECT cls.relname AS table_name,
             con.contype AS constraint_type,
             pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class cls ON cls.oid = con.conrelid
      WHERE cls.relnamespace = 'public'::regnamespace
        AND cls.relname IN (${Prisma.join(REQUIRED_TABLES)})
        AND con.contype IN ('p', 'f')
    `,
  ]);

  if (!baselineSchemaMatches({ tables: tableNames, columns, indexes, constraints })) {
    throw new Error("Existing database does not match the Prisma baseline schema; refusing to mark migration as applied.");
  }

  const migrationTable = await prisma.$queryRaw<TableRow[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
  `;
  if (migrationTable.length === 0) {
    markBaselineApplied();
    return;
  }

  const applied = await prisma.$queryRaw<MigrationRow[]>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = ${BASELINE_MIGRATION}
    LIMIT 1
  `;
  if (applied.length === 0) markBaselineApplied();
}

function markBaselineApplied() {
  console.log(`Registering Prisma baseline migration: ${BASELINE_MIGRATION}`);
  execFileSync("npx", ["prisma", "migrate", "resolve", "--applied", BASELINE_MIGRATION], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

if (require.main === module) {
  prepareDatabase()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
