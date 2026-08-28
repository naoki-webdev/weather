import { expect, test } from "@playwright/test";

import { drawerWithHeading, login } from "./helpers/dashboard";

test.describe("weather dashboard settings", () => {
  test("updates the preferred temperature from the settings drawer", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: "評価設定" }).click();

    const settingsDrawer = drawerWithHeading(page, "快適度設定");
    const temperatureInput = settingsDrawer.getByLabel("理想の気温");
    await temperatureInput.fill("23");
    await settingsDrawer.getByRole("button", { name: "保存" }).click();

    await expect(settingsDrawer).not.toBeVisible();
  });
});
