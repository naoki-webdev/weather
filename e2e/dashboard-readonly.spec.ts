import { expect, test } from "@playwright/test";

import { authHeaders, login, loginAsDemo } from "./helpers/dashboard";

test.describe("weather dashboard read-only and list", () => {
  test("shows seeded cities in the comparison list", async ({ page }) => {
    await login(page);

    await expect(page.getByRole("heading", { name: "Weather Compare" })).toBeVisible();
    await expect(page.getByText("東京", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("札幌", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "都市ランキング", level: 5 })).toBeVisible();
    await expect(page.getByText("4都市を表示中", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "都市" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "快適度" })).toBeVisible();
  });

  test("keeps read-only demo users from writing city data through the UI and API", async ({ page }) => {
    await loginAsDemo(page);

    await expect(page.getByRole("button", { name: "都市を追加" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "今すぐ更新" })).not.toBeVisible();

    const headers = await authHeaders(page);
    const beforeResponse = await page.request.get("/api/cities?per_page=1", { headers });
    expect(beforeResponse.ok()).toBeTruthy();
    const beforeBody = await beforeResponse.json();
    const targetCity = beforeBody.cities[0];
    const beforeTotal = beforeBody.meta.total_count;

    const createResponse = await page.request.post("/api/cities", {
      headers,
      data: {
        city: {
          external_id: "read-only-city",
          name: "Read Only City",
          country: "Japan",
          country_code: "JP",
          latitude: 35.68,
          longitude: 139.65,
          timezone: "Asia/Tokyo",
          source_name: "E2E",
        },
      },
    });
    expect(createResponse.status()).toBe(403);

    const syncResponse = await page.request.post(`/api/cities/${targetCity.id}/sync`, { headers });
    expect(syncResponse.status()).toBe(403);

    const deleteResponse = await page.request.delete(`/api/cities/${targetCity.id}`, { headers });
    expect(deleteResponse.status()).toBe(403);

    const preferenceResponse = await page.request.patch("/api/weather_preference", {
      headers,
      data: { weather_preference: { target_temperature: 25 } },
    });
    expect(preferenceResponse.status()).toBe(403);

    const afterResponse = await page.request.get("/api/cities?per_page=1", { headers });
    const afterBody = await afterResponse.json();
    expect(afterBody.meta.total_count).toBe(beforeTotal);
    expect(afterBody.cities[0].id).toBe(targetCity.id);
  });
});
