import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

export async function selectOptionByLabel(container: Locator, page: Page, label: string, option: string) {
  await container.getByLabel(label).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

export async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "メールアドレス" }).fill(email);
  await page.getByLabel("パスワード").fill(password);
  // LoginPage にはデモログインと通常ログインがあるので、submit のみを取る。
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Weather Compare", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "コンディション一覧", level: 6 })).toBeVisible();
}

export async function login(page: Page) {
  // CRUD 系E2Eは read_only でない通常ユーザーで実行する（デモユーザーは read_only=true で書き込み不可）。
  await loginWithCredentials(page, "e2e@example.com", "password");
}

export async function loginAsDemo(page: Page) {
  await loginWithCredentials(page, "demo@example.com", "password");
  await expect(page.getByText("閲覧専用").first()).toBeVisible();
}

export async function authHeaders(page: Page) {
  const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name === "weather-compare-session");
  expect(sessionCookie).toBeTruthy();
  return { Cookie: `${sessionCookie!.name}=${sessionCookie!.value}` };
}

export function drawerWithHeading(page: Page, heading: string) {
  return page
    .locator(".MuiDrawer-paper")
    .filter({ has: page.getByRole("heading", { name: heading }) });
}

export function writableDetailDrawer(page: Page) {
  return page
    .locator(".MuiDrawer-paper")
    .filter({ has: page.getByRole("button", { name: "今すぐ更新" }) });
}
