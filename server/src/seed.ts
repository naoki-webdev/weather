import * as bcrypt from "bcryptjs";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cityDefinitions = [
  { name: "東京", country: "日本", countryCode: "JP", admin1: "東京都", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo", externalId: "seed-tokyo", temperature: 22.4, humidity: 58, precipitation: 0, windSpeed: 8.2, weatherCode: 1, aqi: 22, favorite: false },
  { name: "札幌", country: "日本", countryCode: "JP", admin1: "北海道", latitude: 43.0618, longitude: 141.3545, timezone: "Asia/Tokyo", externalId: "seed-sapporo", temperature: 14.8, humidity: 62, precipitation: 0.3, windSpeed: 10.4, weatherCode: 2, aqi: 18, favorite: true },
  { name: "福岡", country: "日本", countryCode: "JP", admin1: "福岡県", latitude: 33.5902, longitude: 130.4017, timezone: "Asia/Tokyo", externalId: "seed-fukuoka", temperature: 24.1, humidity: 71, precipitation: 0, windSpeed: 6.8, weatherCode: 1, aqi: 28, favorite: false },
  { name: "ロンドン", country: "イギリス", countryCode: "GB", admin1: "イングランド", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London", externalId: "seed-london", temperature: 16.6, humidity: 77, precipitation: 0.8, windSpeed: 13.2, weatherCode: 3, aqi: 34, favorite: false },
] as const;

const preferenceDefaults = {
  targetTemperature: 21,
  temperatureWeight: 5,
  precipitationWeight: 4,
  humidityWeight: 2,
  windWeight: 2,
  airQualityWeight: 3,
};

async function provisionUser(email: string, password: string, name: string, readOnly: boolean) {
  const passwordDigest = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordDigest, readOnly },
    update: { name, passwordDigest, readOnly },
  });

  await prisma.weatherPreference.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, ...preferenceDefaults } });
  const cityCount = await prisma.city.count({ where: { userId: user.id } });
  if (cityCount === 0) await seedCities(user.id);
  return user;
}

async function seedCities(userId: bigint) {
  for (const definition of cityDefinitions) {
    const city = await prisma.city.create({
      data: {
        userId,
        name: definition.name,
        country: definition.country,
        countryCode: definition.countryCode,
        admin1: definition.admin1,
        latitude: definition.latitude,
        longitude: definition.longitude,
        timezone: definition.timezone,
        externalId: definition.externalId,
        sourceName: "Open-Meteo",
        favorite: definition.favorite,
      },
    });
    const dailyData = {
      time: Array.from({ length: 7 }, (_, index) => new Date(Date.now() + index * 86_400_000).toISOString().slice(0, 10)),
      weather_code: [definition.weatherCode, 2, 1, 3, 61, 1, 0],
      temperature_2m_max: [definition.temperature + 4, definition.temperature + 3, definition.temperature + 5, definition.temperature + 2, definition.temperature + 1, definition.temperature + 4, definition.temperature + 5],
      temperature_2m_min: [definition.temperature - 5, definition.temperature - 4, definition.temperature - 3, definition.temperature - 5, definition.temperature - 6, definition.temperature - 4, definition.temperature - 3],
      precipitation_sum: [definition.precipitation, 0, 1.2, 3.4, 5, 0, 0],
      precipitation_probability_max: [10, 20, 30, 45, 65, 15, 5],
    };

    for (let daysAgo = 30; daysAgo >= 0; daysAgo -= 1) {
      await prisma.weatherSnapshot.create({
        data: {
          cityId: city.id,
          fetchedAt: new Date(Date.now() - daysAgo * 86_400_000),
          currentTemperature: definition.temperature + ((daysAgo % 5) - 2) * 0.8,
          currentHumidity: definition.humidity + ((daysAgo % 4) - 2) * 3,
          currentPrecipitation: Math.max(definition.precipitation + (daysAgo % 3) * 0.2, 0),
          currentWindSpeed: definition.windSpeed + ((daysAgo % 3) - 1) * 1.2,
          currentWeatherCode: definition.weatherCode,
          currentUsAqi: definition.aqi + (daysAgo % 4) * 2,
          currentPm25: definition.aqi / 2,
          currentPm10: definition.aqi * 0.8,
          dailyData,
          sourceName: daysAgo === 0 ? "Open-Meteo（サンプル）" : "Open-Meteo（サンプル履歴）",
        },
      });
    }
  }
}

async function main() {
  const demoEmail = process.env.DEMO_USER_EMAIL ?? "demo@example.com";
  const demoPassword = process.env.DEMO_USER_PASSWORD ?? "password";
  await provisionUser(demoEmail, demoPassword, "デモユーザー", true);
  if (["development", "test"].includes(process.env.NODE_ENV ?? "development")) {
    await provisionUser("e2e@example.com", "password", "テストユーザー", false);
  }
  console.log("NestJS seed completed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
