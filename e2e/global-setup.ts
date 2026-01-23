/**
 * Playwright Global Setup
 *
 * Runs before all tests to:
 * 1. Warm up the server (cold start mitigation)
 * 2. Verify the server is responding
 */

import { chromium, type FullConfig } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const WARMUP_PAGES = ["/", "/login", "/register"];
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function waitForServer(): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(BASE_URL, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000)
      });
      if (response.ok || response.status === 404) {
        console.log(`✓ Server responding after ${attempt} attempt(s)`);
        return true;
      }
    } catch {
      console.log(`  Waiting for server... (attempt ${attempt}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }
  return false;
}

async function warmupServer(): Promise<void> {
  console.log("\n🔥 Warming up server...");

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const path of WARMUP_PAGES) {
    try {
      console.log(`  Warming: ${path}`);
      await page.goto(`${BASE_URL}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
      // Wait a bit for any async resources
      await page.waitForTimeout(500);
    } catch (error) {
      console.log(`  Warning: Failed to warm ${path}:`, error instanceof Error ? error.message : error);
    }
  }

  await browser.close();
  console.log("✓ Server warmup complete\n");
}

export default async function globalSetup(config: FullConfig) {
  console.log("\n📋 Running Playwright Global Setup");

  // Wait for server to be ready
  const serverReady = await waitForServer();
  if (!serverReady) {
    throw new Error("Server did not start within expected time. Run 'npm start' first.");
  }

  // Warm up common pages
  await warmupServer();
}
