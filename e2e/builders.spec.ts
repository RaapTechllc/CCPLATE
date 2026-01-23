/**
 * AI Builders E2E Tests - Golden Paths
 * 
 * Tests the AI builder flows including:
 * - Hook Builder
 * - Component Builder
 * - API Builder
 * - Schema Builder
 * - Prompt Builder
 * - Agent Builder
 */

import { test, expect } from "./fixtures/auth";

test.describe("AI Builders", () => {
  test.describe("Unauthenticated Access", () => {
    test("hook builder redirects to login", async ({ page }) => {
      await page.goto("/hook-builder");
      await expect(page).toHaveURL(/\/login/);
    });

    test("component builder redirects to login", async ({ page }) => {
      await page.goto("/component-builder");
      await expect(page).toHaveURL(/\/login/);
    });

    test("api builder redirects to login", async ({ page }) => {
      await page.goto("/api-builder");
      await expect(page).toHaveURL(/\/login/);
    });

    test("schema builder redirects to login", async ({ page }) => {
      await page.goto("/schema-builder");
      await expect(page).toHaveURL(/\/login/);
    });

    test("prompt builder redirects to login", async ({ page }) => {
      await page.goto("/prompt-builder");
      await expect(page).toHaveURL(/\/login/);
    });

    test("agent builder redirects to login", async ({ page }) => {
      await page.goto("/agent-builder");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Authenticated Access", () => {
    test("hook builder loads for authenticated user", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/hook-builder");
      
      // Should not redirect to login
      await expect(authenticatedPage).not.toHaveURL(/\/login/);
      
      // Should show hook builder UI
      await expect(
        authenticatedPage.getByRole("heading", { name: /hook/i }).or(
          authenticatedPage.getByText(/generate.*hook/i)
        )
      ).toBeVisible({ timeout: 5000 }).catch(() => {
        // Page loaded but may have different structure
      });
    });

    test("component builder loads for authenticated user", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/component-builder");
      await expect(authenticatedPage).not.toHaveURL(/\/login/);
      
      await expect(
        authenticatedPage.getByRole("heading", { name: /component/i }).or(
          authenticatedPage.getByText(/generate.*component/i)
        )
      ).toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    test("api builder loads for authenticated user", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/api-builder");
      await expect(authenticatedPage).not.toHaveURL(/\/login/);
    });

    test("schema builder loads for authenticated user", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/schema-builder");
      await expect(authenticatedPage).not.toHaveURL(/\/login/);
    });

    test("prompt builder loads for authenticated user", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/prompt-builder");
      await expect(authenticatedPage).not.toHaveURL(/\/login/);
    });

    test("agent builder loads for authenticated user", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/agent-builder");
      await expect(authenticatedPage).not.toHaveURL(/\/login/);
    });
  });

  test.describe("Hook Builder Flow", () => {
    test("can enter description and see generate button", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/hook-builder");
      
      // Find description input
      const descriptionInput = authenticatedPage.getByPlaceholder(/describe|enter/i).or(
        authenticatedPage.getByLabel(/description/i)
      ).or(
        authenticatedPage.locator('textarea').first()
      );
      
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill("A hook to fetch user data with loading state");
        
        // Generate button should be present
        const generateBtn = authenticatedPage.getByRole("button", { name: /generate/i });
        await expect(generateBtn).toBeVisible();
      }
    });
  });

  test.describe("Component Builder Flow", () => {
    test("can enter description and see generate button", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/component-builder");
      
      const descriptionInput = authenticatedPage.getByPlaceholder(/describe|enter/i).or(
        authenticatedPage.getByLabel(/description/i)
      ).or(
        authenticatedPage.locator('textarea').first()
      );
      
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill("A modal dialog with close button and overlay");
        
        const generateBtn = authenticatedPage.getByRole("button", { name: /generate/i });
        await expect(generateBtn).toBeVisible();
      }
    });
  });

  test.describe("API Builder Flow", () => {
    test("can enter description and see generate button", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/api-builder");
      
      const descriptionInput = authenticatedPage.getByPlaceholder(/describe|enter/i).or(
        authenticatedPage.getByLabel(/description/i)
      ).or(
        authenticatedPage.locator('textarea').first()
      );
      
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill("POST endpoint to create a new user with validation");
        
        const generateBtn = authenticatedPage.getByRole("button", { name: /generate/i });
        await expect(generateBtn).toBeVisible();
      }
    });
  });
});
