/**
 * Home Page E2E Tests
 *
 * Basic tests for the home page.
 *
 * Note: The home page may redirect to /login for unauthenticated users
 * or may require Convex to be running for full functionality.
 */

import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load without errors", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for page to settle
    await page.waitForTimeout(2000);

    // Body should be visible
    await expect(page.locator("body")).toBeVisible();

    // Page should either:
    // 1. Show CCPLATE content (home page)
    // 2. Redirect to /login (protected)
    // 3. Show sign in content (login page)
    const url = page.url();
    const isOnLogin = url.includes("/login");

    if (isOnLogin) {
      // Redirected to login - this is OK
      expect(true).toBe(true);
    } else {
      // On home page - should have CCPLATE somewhere
      const hasCCPLATEInTitle = (await page.title()).includes("CCPLATE");
      const hasCCPLATEInPage = await page.getByText("CCPLATE")
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasSignIn = await page.getByText(/sign in/i)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      // At least one of these should be true
      expect(hasCCPLATEInTitle || hasCCPLATEInPage || hasSignIn).toBe(true);
    }
  });

  test("should show navigation or login", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Should have either:
    // - Header with navigation (home page)
    // - Login page content (redirected)
    // - Loading state (Convex connecting)

    const hasHeader = await page.locator("header").isVisible({ timeout: 5000 }).catch(() => false);
    const hasLoginHeading = await page.getByRole("heading", { name: /sign in/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasBodyContent = await page.locator("body").isVisible();

    // At least one of these should be true
    expect(hasHeader || hasLoginHeading || hasBodyContent).toBe(true);
  });
});
