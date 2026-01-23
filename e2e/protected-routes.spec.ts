/**
 * Protected Routes E2E Tests
 * 
 * Verifies that all protected routes properly redirect
 * unauthenticated users to login and allow authenticated access.
 */

import { test, expect } from "@playwright/test";
import { test as authTest } from "./fixtures/auth";

// Routes that should redirect unauthenticated users
const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/hook-builder",
  "/component-builder",
  "/api-builder",
  "/schema-builder",
  "/prompt-builder",
  "/agent-builder",
  "/guardian",
  "/guardian/timeline",
  "/guardian/worktrees",
  "/uploads",
];

// Routes that should allow public access
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
];

test.describe("Protected Routes - Unauthenticated", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to login`, async ({ page }) => {
      await page.goto(route);
      
      // Should redirect to login (with or without callback URL)
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("Public Routes", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} is accessible`, async ({ page }) => {
      await page.goto(route);
      
      // Should NOT redirect to login (unless / redirects to login by design)
      if (route !== "/") {
        await expect(page).toHaveURL(new RegExp(route.replace("/", "\\/")));
      }
    });
  }
});

authTest.describe("Protected Routes - Authenticated", () => {
  for (const route of PROTECTED_ROUTES) {
    authTest(`${route} loads for authenticated user`, async ({ authenticatedPage }) => {
      await authenticatedPage.goto(route);
      
      // Should NOT redirect to login
      await expect(authenticatedPage).not.toHaveURL(/\/login/);
    });
  }
});

test.describe("Admin Routes", () => {
  const ADMIN_ROUTES = [
    "/admin",
    "/admin/users",
    "/admin/settings",
    "/admin/guardian",
  ];

  for (const route of ADMIN_ROUTES) {
    test(`${route} requires authentication`, async ({ page }) => {
      await page.goto(route);
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("API Routes - Authentication", () => {
  test("unauthenticated API requests return 401", async ({ request }) => {
    const response = await request.get("/api/uploads");
    expect(response.status()).toBe(401);
  });

  test("unauthenticated POST to protected API returns 401", async ({ request }) => {
    const response = await request.post("/api/hook-builder/generate", {
      data: { description: "test" },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("Callback URL Handling", () => {
  test("login preserves callback URL", async ({ page }) => {
    // Go to protected route
    await page.goto("/dashboard");
    
    // Should redirect to login with callback
    await expect(page).toHaveURL(/\/login/);
    
    // URL should contain callbackUrl parameter
    const url = page.url();
    expect(url).toMatch(/callbackUrl|redirect/i);
  });
});
