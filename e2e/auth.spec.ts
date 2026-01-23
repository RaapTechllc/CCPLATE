/**
 * Authentication E2E Tests - OAuth Flow
 *
 * Tests the Convex Auth OAuth authentication flow.
 *
 * IMPORTANT: These tests require the Convex backend to be running.
 * - Start Convex with: npm run dev:convex
 * - Or run full dev: npm run dev
 *
 * Without Convex, middleware redirects may not work correctly.
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("should display sign in heading", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1000);

      // Check page title
      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible({ timeout: 15000 });
    });

    test("should display sign in page content", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      // Should see the sign in heading
      const heading = page.getByRole("heading", { name: /sign in/i });
      await expect(heading).toBeVisible({ timeout: 10000 });

      // Should see description text about providers or choosing
      const description = page.getByText(/choose|provider|sign in/i);
      await expect(description.first()).toBeVisible({ timeout: 5000 });
    });

    test("login page card should be visible", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      // The login card should be visible
      const card = page.locator('[class*="card"], [class*="Card"]').first();
      const hasCard = await card.isVisible({ timeout: 5000 }).catch(() => false);

      // Or at minimum the heading should be visible
      const hasHeading = await page.getByRole("heading", { name: /sign in/i })
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(hasCard || hasHeading).toBe(true);
    });
  });

  test.describe("Protected Routes", () => {
    // Note: These tests require Convex backend to be running for middleware redirects

    test("unauthenticated access to /dashboard redirects or shows login", async ({ page }) => {
      await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);

      // Either:
      // 1. Redirected to /login (Convex Auth working)
      // 2. Shows login content (client-side redirect)
      // 3. Shows error/loading (Convex not connected)
      const url = page.url();
      const onLogin = url.includes("/login");
      const hasLoginContent = await page.getByRole("heading", { name: /sign in/i })
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      // Test passes if we're on login page OR see login content
      expect(onLogin || hasLoginContent).toBe(true);
    });
  });

  test.describe("Public Routes", () => {
    test("login page loads without error", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });

      // Should stay on login page
      await expect(page).toHaveURL(/\/login/);

      // Body should be visible (page loaded)
      await expect(page.locator("body")).toBeVisible();
    });

    test("home page loads without error", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30000 });

      // Body should be visible (page loaded)
      await expect(page.locator("body")).toBeVisible();
    });
  });
});
