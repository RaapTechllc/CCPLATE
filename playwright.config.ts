import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for CCPLATE E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Directory containing test files
  testDir: "./e2e",

  // Global setup to warm up server before tests
  globalSetup: "./e2e/global-setup.ts",

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only (increased to 2 for flaky network issues)
  retries: process.env.CI ? 2 : 1,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/report.json" }],
    ["list"],
  ],

  // Global timeout for each test (increased for slow server)
  timeout: 90000,

  // Expect timeout for assertions
  expect: {
    timeout: 15000,
  },

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: "http://localhost:3000",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Capture screenshot on failure
    screenshot: "only-on-failure",

    // Navigation timeout (increased for production server cold pages)
    navigationTimeout: 60000,

    // Action timeout
    actionTimeout: 20000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Uncomment to add more browsers
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
    // Mobile viewports
    // {
    //   name: "Mobile Chrome",
    //   use: { ...devices["Pixel 5"] },
    // },
  ],

  // Start server for tests: dev server locally (reuses existing), standalone build in CI
  webServer: {
    command: process.env.CI
      ? "npm run build && node .next/standalone/server.js"
      : "npm run dev:next",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      E2E_TEST_AUTH_BYPASS: "true",
    },
  },
});
