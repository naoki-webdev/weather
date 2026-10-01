import { Prisma } from "@prisma/client";

import {
  HUMIDITY_PENALTY_PER_PERCENT,
  IDEAL_HUMIDITY,
  MAX_SCORE,
  TEMPERATURE_PENALTY_PER_DEGREE,
  WIND_PENALTY_PER_KMH,
  type ScoreComponent,
  type WeatherPreferenceLike,
} from "./weather-score";

export type ScoreSqlFields = {
  temperature: Prisma.Sql;
  precipitation: Prisma.Sql;
  humidity: Prisma.Sql;
  wind: Prisma.Sql;
  airQuality: Prisma.Sql;
};

type WeightedComponent = {
  score: Prisma.Sql;
  weight: number;
};

function numericParameter(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Prisma.sql`${numericValue}` : Prisma.sql`NULL`;
}

function doublePrecisionExpression(expression: Prisma.Sql) {
  return Prisma.sql`CAST(${expression} AS double precision)`;
}

function scoreFromDifference(value: Prisma.Sql, target: Prisma.Sql, penalty: number) {
  const numericValue = doublePrecisionExpression(value);
  const numericTarget = doublePrecisionExpression(target);
  return Prisma.sql`
    CASE
      WHEN ${numericValue} IS NULL OR ${numericTarget} IS NULL THEN NULL
      ELSE GREATEST(ROUND(CAST(${MAX_SCORE} - ABS(${numericValue} - ${numericTarget}) * ${penalty} AS numeric)), 0)
    END
  `;
}

function scoreFromPenalty(value: Prisma.Sql, penalty: number) {
  const numericValue = doublePrecisionExpression(value);
  return Prisma.sql`
    CASE
      WHEN ${numericValue} IS NULL THEN NULL
      ELSE GREATEST(ROUND(CAST(${MAX_SCORE} - ${numericValue} * ${penalty} AS numeric)), 0)
    END
  `;
}

function sqlSum(expressions: Prisma.Sql[]) {
  return Prisma.sql`(${Prisma.join(expressions, " + ")})`;
}

export type ScoreSqlComponents = Record<ScoreComponent, Prisma.Sql>;

export function scoreComponentsSqlFor(preference: WeatherPreferenceLike, fields: ScoreSqlFields): ScoreSqlComponents {
  return {
    temperature: scoreFromDifference(fields.temperature, numericParameter(preference.targetTemperature), TEMPERATURE_PENALTY_PER_DEGREE),
    precipitation: scoreFromPenalty(fields.precipitation, 1),
    humidity: scoreFromDifference(fields.humidity, Prisma.sql`${IDEAL_HUMIDITY}`, HUMIDITY_PENALTY_PER_PERCENT),
    wind: scoreFromPenalty(fields.wind, WIND_PENALTY_PER_KMH),
    air_quality: scoreFromPenalty(fields.airQuality, 1),
  };
}

export function scoreSqlFromComponents(preference: WeatherPreferenceLike, componentScores: ScoreSqlComponents) {
  const components: WeightedComponent[] = [
    { score: componentScores.temperature, weight: Number(preference.temperatureWeight) },
    { score: componentScores.precipitation, weight: Number(preference.precipitationWeight) },
    { score: componentScores.humidity, weight: Number(preference.humidityWeight) },
    { score: componentScores.wind, weight: Number(preference.windWeight) },
    { score: componentScores.air_quality, weight: Number(preference.airQualityWeight) },
  ];
  const totalWeight = sqlSum(components.map(({ score, weight }) => Prisma.sql`CASE WHEN ${score} IS NOT NULL AND ${weight} > 0 THEN ${weight} ELSE 0 END`));
  const weightedTotal = sqlSum(components.map(({ score, weight }) => Prisma.sql`CASE WHEN ${score} IS NOT NULL AND ${weight} > 0 THEN ${score} * ${weight} ELSE 0 END`));

  return Prisma.sql`
    CASE
      WHEN ${totalWeight} = 0 THEN NULL
      ELSE ROUND(CAST(${weightedTotal} / ${totalWeight} AS numeric))
    END
  `;
}

export function scoreSqlFor(preference: WeatherPreferenceLike, fields: ScoreSqlFields) {
  return scoreSqlFromComponents(preference, scoreComponentsSqlFor(preference, fields));
}
