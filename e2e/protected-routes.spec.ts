import { test, expect } from "@playwright/test";

test.describe("Protected Routes", () => {
  test("should redirect unauthenticated users from dashboard to login", async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto("/dashboard");

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect unauthenticated users from profile to login", async ({ page }) => {
    // Try to access profile without authentication
    await page.goto("/profile");

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});
