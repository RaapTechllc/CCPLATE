import { test, expect } from "@playwright/test";

test.describe("Builders", () => {
  test("hook builder page loads", async ({ page }) => {
    await page.goto("/hook-builder");
    await expect(page.getByText(/hook builder/i)).toBeVisible();
  });

  test("component builder page loads", async ({ page }) => {
    await page.goto("/component-builder");
    await expect(page.getByText(/component builder/i)).toBeVisible();
  });
});
