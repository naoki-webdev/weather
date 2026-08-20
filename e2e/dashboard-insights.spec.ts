import { expect, test } from "@playwright/test";

import { login } from "./helpers/dashboard";

test.describe("weather dashboard insights", () => {
  test("shows the seven-day forecast and score breakdown in the detail drawer", async ({ page }) => {
    await login(page);

    await page.getByRole("row").filter({ has: page.getByText("東京", { exact: true }) }).first().click();

    const detailDrawer = page.locator(".MuiDrawer-paper").filter({ has: page.getByRole("heading", { name: "東京" }) });
    await expect(detailDrawer.getByText("7日間予報")).toBeVisible();
    await expect(detailDrawer.getByText("スコア内訳")).toBeVisible();
    await expect(detailDrawer.getByText(/直近30日平均との比較/)).toBeVisible();
    await expect(detailDrawer.getByText("現在のコンディション")).toBeVisible();
    await expect(detailDrawer.getByText("大気質").last()).toBeVisible();
  });

  test("filters the city list by keyword and can clear the filter", async ({ page }) => {
    await login(page);

    const keywordField = page.getByRole("textbox", { name: "都市・国・地域" });
    await keywordField.fill("札幌");

    await expect(page.getByRole("row").filter({ has: page.getByText("札幌", { exact: true }) }).first()).toBeVisible();
    await expect(page.getByRole("row").filter({ has: page.getByText("東京", { exact: true }) }).first()).not.toBeVisible();

    await page.getByRole("button", { name: "クリア" }).click();
    await expect(page.getByRole("row").filter({ has: page.getByText("東京", { exact: true }) }).first()).toBeVisible();
  });

  test("starts a city CSV export download", async ({ page }) => {
    await login(page);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV出力" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^weather-cities-\d+\.csv$/);
  });

  test("compares selected cities side by side", async ({ page }) => {
    await login(page);

    await page.getByRole("checkbox", { name: "東京を比較対象に選択" }).check();
    await page.getByRole("checkbox", { name: "札幌を比較対象に選択" }).check();

    await expect(page.getByRole("heading", { name: "選択した都市を横並びで比較" })).toBeVisible();
    await expect(page.getByText("30日平均快適度")).toBeVisible();
    await expect(page.getByText("1位")).toBeVisible();
  });

  test("plans travel and shows the arrival weather", async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);

    await page.getByRole("checkbox", { name: "東京を比較対象に選択" }).check();
    await page.getByRole("checkbox", { name: "福岡を比較対象に選択" }).check();
    await expect(page.getByRole("button", { name: "到着時の天気を見る" })).toBeVisible();
    await expect(page.getByText("移動予定と到着時の天気", { exact: true })).not.toBeVisible();

    const travelResponsePromise = page.waitForResponse((response) => response.url().includes("/api/travel/plan") && response.request().method() === "GET");
    await page.getByRole("button", { name: "到着時の天気を見る" }).click();
    const travelResponse = await travelResponsePromise;

    expect(travelResponse.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "移動予定と到着時の天気" })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("button", { name: "閉じる" })).toBeVisible();
    await expect(page.getByText("到着時の予報", { exact: true })).toBeVisible();
    await expect(page.getByText(/^(傘がおすすめ|折りたたみ傘があると安心|傘は不要そう|到着時の予報を取得できません)$/)).toBeVisible();

    await page.getByRole("button", { name: "閉じる" }).click();
    await expect(page.getByRole("heading", { name: "移動予定と到着時の天気" })).not.toBeVisible();
  });

  test("finds the best departure time and shows candidate weather", async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);

    await page.getByRole("checkbox", { name: "東京を比較対象に選択" }).check();
    await page.getByRole("checkbox", { name: "福岡を比較対象に選択" }).check();
    await page.getByRole("radio", { name: "おすすめ時刻を探す" }).check();
    await expect(page.getByRole("button", { name: "おすすめ時刻を探す" })).toBeVisible();

    const bestDepartureResponsePromise = page.waitForResponse((response) => response.url().includes("/api/travel/best-departure") && response.request().method() === "GET");
    await page.getByRole("button", { name: "おすすめ時刻を探す" }).click();
    const bestDepartureResponse = await bestDepartureResponsePromise;

    expect(bestDepartureResponse.ok()).toBeTruthy();
    await expect(page.getByText(/おすすめの出発時刻は/)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("table", { name: "出発時刻候補" })).toBeVisible();
    await expect(page.getByText(/この時間帯では、|分遅らせると|分早めると/)).toBeVisible();
  });

  test("persists a city as a favorite", async ({ page }) => {
    await login(page);

    await expect(page.getByRole("row").filter({ has: page.getByText("東京", { exact: true }) }).first()).toBeVisible();
    const unfavoriteButton = page.getByRole("button", { name: "東京のお気に入りを解除" });
    if (await unfavoriteButton.count()) {
      await unfavoriteButton.click();
      await expect(page.getByRole("button", { name: "東京をお気に入りに登録" })).toBeVisible();
    }

    const favoriteButton = page.getByRole("button", { name: "東京をお気に入りに登録" });
    await favoriteButton.click();
    const savedFavoriteButton = page.getByRole("button", { name: "東京のお気に入りを解除" });
    await expect(savedFavoriteButton).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(savedFavoriteButton).toHaveCSS("color", "rgb(242, 176, 30)");
  });
});
