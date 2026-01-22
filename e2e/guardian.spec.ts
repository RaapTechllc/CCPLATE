import { test, expect } from "@playwright/test";

test.describe("Guardian UI", () => {
  // These require authentication - skip for now or use test user
  test.skip("guardian config page loads", async ({ page }) => {
    await page.goto("/guardian");
    await expect(page.getByText(/guardian/i)).toBeVisible();
  });
});
