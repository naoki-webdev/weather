import { expect, test } from "@playwright/test";
import { login } from "./helpers/dashboard";

test("saves and reloads a group of comparison cities", async ({ page }) => {
  await login(page);
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByLabel("グループ名").fill("旅行候補");
  await page.getByRole("button",{ name:"選択中の都市を保存" }).click();
  await page.reload();
  await page.getByLabel("保存したグループ").click();
  await page.getByRole("option",{ name:"旅行候補",exact:true }).click();
  await page.getByRole("button",{ name:"比較に読み込む" }).click();
  await expect.poll(() => JSON.parse(new URL(page.url()).searchParams.get("compare") ?? "[]").length).toBe(2);
});

test("uses city cards on mobile and finds a suitable outing hour", async ({ page }) => {
  await page.setViewportSize({ width:390,height:844 });
  await login(page);
  await expect(page.getByRole("button",{ name:"詳細を開く" }).first()).toBeVisible();
  await page.route("**/api/cities/*/windows?*", (route) => route.fulfill({ json:{ timezone:"Asia/Tokyo",windows:[{ at:"2026-10-20T00:00:00Z",temperature:24,precipitation_probability:10,wind_speed:5 }] } }));
  await page.getByRole("button",{ name:"詳細を開く" }).first().click();
  await page.getByRole("button",{ name:"外出できる時間を探す" }).click();
  await expect(page.getByText(/雨 10%/)).toBeVisible();
});
