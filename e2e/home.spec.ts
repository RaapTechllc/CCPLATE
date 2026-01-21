import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load the home page", async ({ page }) => {
    await page.goto("/");

    // Check that the page loads
    await expect(page).toHaveTitle(/CCPLATE/);
  });

  test("should have navigation links", async ({ page }) => {
    await page.goto("/");

    // Check for sign in link when not authenticated
    const signInLink = page.getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible();
  });
});
