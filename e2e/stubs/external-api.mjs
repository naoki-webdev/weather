import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 8080);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function hourlyTimes() {
  const start = new Date();
  start.setUTCMinutes(0, 0, 0);
  start.setUTCHours(0);

  return Array.from({ length: 8 * 24 + 1 }, (_, index) => new Date(start.getTime() + index * 60 * 60 * 1000).toISOString());
}

function forecastPayload(url) {
  const times = hourlyTimes();
  const dailyTimes = times.filter((_, index) => index % 24 === 0).slice(0, 7).map((time) => time.slice(0, 10));

  return {
    current: {
      temperature_2m: 25,
      relative_humidity_2m: 55,
      precipitation: 0,
      weather_code: 1,
      wind_speed_10m: 5,
    },
    daily: {
      time: dailyTimes,
      weather_code: dailyTimes.map(() => 1),
      temperature_2m_max: dailyTimes.map(() => 27),
      temperature_2m_min: dailyTimes.map(() => 20),
      precipitation_sum: dailyTimes.map(() => 0),
      precipitation_probability_max: dailyTimes.map(() => 10),
    },
    hourly: {
      time: times,
      temperature_2m: times.map(() => 25),
      precipitation_probability: times.map(() => 10),
      precipitation: times.map(() => 0),
      wind_speed_10m: times.map(() => 5),
      weather_code: times.map(() => 1),
    },
    timezone: url.searchParams.get("timezone") ?? "UTC",
  };
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (url.pathname.startsWith("/osrm/route/v1/driving/")) {
    sendJson(response, 200, {
      code: "Ok",
      routes: [{ duration: 60 * 60, distance: 45_000 }],
    });
    return;
  }

  if (url.pathname === "/open-meteo/v1/forecast") {
    sendJson(response, 200, forecastPayload(url));
    return;
  }

  if (url.pathname === "/open-meteo/v1/air-quality") {
    sendJson(response, 200, { current: { us_aqi: 25, pm2_5: 8, pm10: 12 } });
    return;
  }

  if (url.pathname === "/open-meteo/v1/search") {
    sendJson(response, 200, { results: [] });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`E2E external API stub listening on ${port}`);
});
