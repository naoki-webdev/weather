import { expect, test } from "@playwright/test";

import { drawerWithHeading, login } from "./helpers/dashboard";

test.describe("weather dashboard city management", () => {
  test.describe.configure({ mode: "serial" });

  test("adds a city from the geocoding search drawer", async ({ page }) => {
    const result = {
      external_id: "e2e-kyoto",
      name: "京都",
      country: "日本",
      country_code: "JP",
      admin1: "京都府",
      latitude: 35.0116,
      longitude: 135.7681,
      timezone: "Asia/Tokyo",
      source_name: "Open-Meteo",
    };
    const city = {
      id: 9001,
      ...result,
      score: 82,
      score_breakdown: { temperature: 90, precipitation: 80, humidity: 78, wind: 85, air_quality: 82 },
      score_weights: { temperature: 5, precipitation: 4, humidity: 2, wind: 2, air_quality: 3 },
      score_insight: { primary_component: "temperature", primary_weight: 5 },
      favorite: false,
      weather: null,
      history: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await page.route("**/api/cities/search**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [result] }) }));
    await page.route("**/api/cities", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(city) });
      }
      return route.continue();
    });

    await login(page);
    await page.getByRole("button", { name: "都市を追加", exact: true }).click();

    const searchDrawer = drawerWithHeading(page, "都市を検索して追加");
    await searchDrawer.getByLabel("都市名・地域名").fill("Kyoto");
    await searchDrawer.getByRole("button", { name: "検索", exact: true }).click();
    await searchDrawer.getByRole("button", { name: "比較に追加", exact: true }).click();

    await expect(page.getByRole("heading", { name: "京都" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "スコア内訳" })).toBeVisible();
  });

  test("deletes a city from the detail drawer", async ({ page }) => {
    const result = {
      external_id: "e2e-kyoto",
      name: "京都",
      country: "日本",
      country_code: "JP",
      admin1: "京都府",
      latitude: 35.0116,
      longitude: 135.7681,
      timezone: "Asia/Tokyo",
      source_name: "Open-Meteo",
    };
    const city = {
      id: 9001,
      ...result,
      score: 82,
      score_breakdown: { temperature: 90, precipitation: 80, humidity: 78, wind: 85, air_quality: 82 },
      score_weights: { temperature: 5, precipitation: 4, humidity: 2, wind: 2, air_quality: 3 },
      score_insight: { primary_component: "temperature", primary_weight: 5 },
      favorite: false,
      weather: null,
      history: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await page.route("**/api/cities/search**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [result] }) }));
    await page.route("**/api/cities", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(city) });
      }
      return route.continue();
    });
    await page.route("**/api/cities/9001", (route) => {
      if (route.request().method() === "DELETE") return route.fulfill({ status: 204 });
      return route.continue();
    });

    await login(page);
    await page.getByRole("button", { name: "都市を追加", exact: true }).click();

    const searchDrawer = drawerWithHeading(page, "都市を検索して追加");
    await searchDrawer.getByLabel("都市名・地域名").fill("Kyoto");
    await searchDrawer.getByRole("button", { name: "検索", exact: true }).click();
    await searchDrawer.getByRole("button", { name: "比較に追加", exact: true }).click();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    const detailDrawer = page.locator(".MuiDrawer-paper").filter({ has: page.getByRole("heading", { name: "京都" }) });
    await detailDrawer.getByRole("button", { name: "比較から削除" }).click();

    await expect(detailDrawer).not.toBeVisible();
    await expect(page.getByText("京都", { exact: true })).not.toBeVisible();
  });
});
