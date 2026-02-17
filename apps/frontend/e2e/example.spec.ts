import { expect, test } from "@playwright/test";

test("notification dashboard loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Notifications");
});
