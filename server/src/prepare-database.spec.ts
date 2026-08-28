import {
  baselineSchemaMatches,
  REQUIRED_COLUMNS,
  REQUIRED_INDEXES,
  REQUIRED_TABLES,
  type BaselineSchema,
} from "./prepare-database";

function validSchema(): BaselineSchema {
  return {
    tables: [...REQUIRED_TABLES],
    columns: REQUIRED_COLUMNS.map((column) => ({
      table_name: column.tableName,
      column_name: column.columnName,
      data_type: column.dataType,
      is_nullable: column.isNullable,
      numeric_precision: column.numericPrecision ?? null,
      numeric_scale: column.numericScale ?? null,
    })),
    indexes: REQUIRED_INDEXES.map((index) => ({
      table_name: index.tableName,
      indexdef: `CREATE ${index.unique ? "UNIQUE " : ""}INDEX test ON public.${index.tableName} ${index.expression}`,
    })),
    constraints: [
      ...REQUIRED_TABLES.map((table_name) => ({ table_name, constraint_type: "p", definition: "PRIMARY KEY (id)" })),
      { table_name: "cities", constraint_type: "f", definition: "FOREIGN KEY (user_id) REFERENCES users(id)" },
      { table_name: "weather_preferences", constraint_type: "f", definition: "FOREIGN KEY (user_id) REFERENCES users(id)" },
      { table_name: "weather_snapshots", constraint_type: "f", definition: "FOREIGN KEY (city_id) REFERENCES cities(id)" },
      { table_name: "activity_logs", constraint_type: "f", definition: "FOREIGN KEY (user_id) REFERENCES users(id)" },
    ],
  };
}

describe("baselineSchemaMatches", () => {
  it("accepts the expected baseline shape", () => {
    expect(baselineSchemaMatches(validSchema())).toBe(true);
  });

  it("rejects a missing or incompatible column", () => {
    const schema = validSchema();
    schema.columns = schema.columns.filter((column) => column.column_name !== "timezone");
    expect(baselineSchemaMatches(schema)).toBe(false);

    const altered = validSchema();
    altered.columns.find((column) => column.column_name === "latitude")!.numeric_scale = 2;
    expect(baselineSchemaMatches(altered)).toBe(false);
  });

  it("rejects missing indexes and foreign keys", () => {
    const schema = validSchema();
    schema.indexes = schema.indexes.filter((index) => index.table_name !== "weather_snapshots");
    expect(baselineSchemaMatches(schema)).toBe(false);

    const altered = validSchema();
    altered.constraints = altered.constraints.filter((constraint) => constraint.table_name !== "cities" || constraint.constraint_type !== "f");
    expect(baselineSchemaMatches(altered)).toBe(false);
  });
});
