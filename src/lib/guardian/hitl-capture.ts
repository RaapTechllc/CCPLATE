/**
 * HITL Checkpoint Capture
 * 
 * Provides screenshot capture, preview URL generation, and metrics collection
 * for demo-quality HITL checkpoints in the Beginner tier.
 */

import { execSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import type { HITLCheckpoint, CheckpointMetric, PhaseDefinition } from "./tiers/beginner";

export interface CaptureResult {
  success: boolean;
  screenshotPaths: string[];
  previewUrl?: string;
  deployUrl?: string;
  metrics: MetricResult[];
  errors: string[];
}

export interface MetricResult {
  name: string;
  target: string;
  actual: string;
  passed: boolean;
  command: string;
}

const SCREENSHOTS_DIR = "screenshots";
const ROOT_DIR = process.cwd();

export async function captureHITLCheckpoint(
  phase: PhaseDefinition,
  baseUrl: string = "http://localhost:3000"
): Promise<CaptureResult> {
  const checkpoint = phase.hitlCheckpoint;
  const result: CaptureResult = {
    success: true,
    screenshotPaths: [],
    metrics: [],
    errors: [],
  };

  // Ensure screenshots directory exists
  const screenshotsPath = join(ROOT_DIR, SCREENSHOTS_DIR);
  if (!existsSync(screenshotsPath)) {
    mkdirSync(screenshotsPath, { recursive: true });
  }

  // Capture screenshots
  if (checkpoint.screenshotPaths && checkpoint.screenshotPaths.length > 0) {
    const capturedPaths = await captureScreenshots(
      phase.id,
      baseUrl,
      checkpoint
    );
    result.screenshotPaths = capturedPaths;
  }

  // Collect metrics
  if (checkpoint.metrics && checkpoint.metrics.length > 0) {
    result.metrics = await collectMetrics(checkpoint.metrics);
    const failedMetrics = result.metrics.filter(m => !m.passed);
    if (failedMetrics.length > 0) {
      result.errors.push(
        `${failedMetrics.length} metric(s) did not meet target: ${failedMetrics.map(m => m.name).join(", ")}`
      );
    }
  }

  // Set URLs
  result.previewUrl = checkpoint.demoUrl || baseUrl;
  result.deployUrl = checkpoint.deployUrl;

  return result;
}

async function captureScreenshots(
  phaseId: string,
  baseUrl: string,
  checkpoint: HITLCheckpoint
): Promise<string[]> {
  const captured: string[] = [];
  
  // Define routes to capture based on phase
  const routesToCapture = getRoutesForPhase(phaseId, checkpoint);

  for (const route of routesToCapture) {
    const url = `${baseUrl}${route.path}`;
    const filename = `${phaseId}-${route.name}.png`;
    const filepath = join(ROOT_DIR, SCREENSHOTS_DIR, filename);

    try {
      // Use Playwright to capture screenshot
      const script = generatePlaywrightScreenshotScript(url, filepath, route.waitFor);
      const result = spawnSync("npx", ["playwright", "test", "--project=chromium", "-g", "screenshot"], {
        cwd: ROOT_DIR,
        encoding: "utf-8",
        env: {
          ...process.env,
          SCREENSHOT_URL: url,
          SCREENSHOT_PATH: filepath,
          SCREENSHOT_WAIT: route.waitFor || "networkidle",
        },
      });

      if (result.status === 0 || existsSync(filepath)) {
        captured.push(filepath);
      } else {
        // Fallback: try curl-based capture or just note the missing screenshot
        console.warn(`⚠️ Could not capture ${filename}: ${result.stderr || "unknown error"}`);
      }
    } catch (err) {
      console.warn(`⚠️ Screenshot capture failed for ${url}:`, err);
    }
  }

  // If no Playwright, try alternative capture methods
  if (captured.length === 0 && routesToCapture.length > 0) {
    captured.push(...await captureWithPuppeteerFallback(phaseId, baseUrl, routesToCapture));
  }

  return captured;
}

interface RouteToCapture {
  name: string;
  path: string;
  waitFor?: string;
}

function getRoutesForPhase(phaseId: string, checkpoint: HITLCheckpoint): RouteToCapture[] {
  const routes: RouteToCapture[] = [];

  switch (phaseId) {
    case "foundation":
      routes.push(
        { name: "landing", path: "/", waitFor: "domcontentloaded" },
        { name: "auth", path: "/login", waitFor: "networkidle" }
      );
      break;
    case "data-layer":
      routes.push(
        { name: "dashboard", path: "/dashboard", waitFor: "networkidle" }
      );
      break;
    case "core-feature":
      routes.push(
        { name: "main", path: "/", waitFor: "networkidle" },
        { name: "flow", path: "/dashboard", waitFor: "networkidle" }
      );
      break;
    case "polish":
      routes.push(
        { name: "mobile", path: "/", waitFor: "networkidle" },
        { name: "loading", path: "/", waitFor: "domcontentloaded" },
        { name: "error", path: "/404", waitFor: "domcontentloaded" }
      );
      break;
    case "deploy":
      routes.push(
        { name: "final", path: "/", waitFor: "networkidle" }
      );
      break;
    default:
      routes.push({ name: "default", path: "/", waitFor: "networkidle" });
  }

  return routes;
}

function generatePlaywrightScreenshotScript(
  url: string,
  filepath: string,
  waitFor: string = "networkidle"
): string {
  return `
import { test } from '@playwright/test';

test('screenshot', async ({ page }) => {
  await page.goto('${url}', { waitUntil: '${waitFor}' });
  await page.screenshot({ path: '${filepath}', fullPage: true });
});
`;
}

async function captureWithPuppeteerFallback(
  _phaseId: string,
  _baseUrl: string,
  _routes: RouteToCapture[]
): Promise<string[]> {
  // Puppeteer fallback disabled - use Playwright instead
  // This avoids requiring puppeteer as a dependency
  return [];
}

async function collectMetrics(metrics: CheckpointMetric[]): Promise<MetricResult[]> {
  const results: MetricResult[] = [];

  for (const metric of metrics) {
    const result = await runMetricCommand(metric);
    results.push(result);
  }

  return results;
}

async function runMetricCommand(metric: CheckpointMetric): Promise<MetricResult> {
  const result: MetricResult = {
    name: metric.name,
    target: metric.target,
    actual: "unknown",
    passed: false,
    command: metric.command,
  };

  try {
    const output = execSync(metric.command, {
      cwd: ROOT_DIR,
      encoding: "utf-8",
      timeout: 60000,
      stdio: ["pipe", "pipe", "pipe"],
    });

    result.actual = parseMetricOutput(output, metric);
    result.passed = evaluateMetric(result.actual, metric.target);
  } catch (err: unknown) {
    const error = err as { message?: string; stderr?: string };
    result.actual = `Error: ${error.message || error.stderr || "command failed"}`;
    result.passed = false;
  }

  return result;
}

function parseMetricOutput(output: string, metric: CheckpointMetric): string {
  // Try to extract meaningful value from command output
  const lines = output.trim().split("\n");

  // For build time, look for timing info
  if (metric.name.toLowerCase().includes("time")) {
    const timeMatch = output.match(/(\d+(?:\.\d+)?)\s*(?:s|seconds|ms)/i);
    if (timeMatch) {
      return `${timeMatch[1]}s`;
    }
  }

  // For error counts, look for numbers
  if (metric.name.toLowerCase().includes("error")) {
    const errorMatch = output.match(/(\d+)\s*(?:error|warning)/i);
    if (errorMatch) {
      return errorMatch[1];
    }
    // If command succeeded with no output, assume 0 errors
    if (lines.length === 0 || output.includes("✓")) {
      return "0";
    }
  }

  // For pass/fail checks
  if (metric.target === "pass") {
    if (output.includes("passed") || output.includes("✓") || output.includes("success")) {
      return "pass";
    }
    if (output.includes("failed") || output.includes("✗") || output.includes("error")) {
      return "fail";
    }
  }

  // For percentage scores (like Lighthouse)
  const percentMatch = output.match(/(\d+)%/);
  if (percentMatch) {
    return percentMatch[1];
  }

  // For numeric scores
  const scoreMatch = output.match(/score[:\s]+(\d+)/i);
  if (scoreMatch) {
    return scoreMatch[1];
  }

  // Return last non-empty line
  return lines.filter(l => l.trim()).pop() || output.trim().slice(0, 50);
}

function evaluateMetric(actual: string, target: string): boolean {
  // Handle pass/fail
  if (target.toLowerCase() === "pass") {
    return actual.toLowerCase() === "pass" || actual === "0" || actual.includes("✓");
  }

  // Handle "0" target (no errors)
  if (target === "0") {
    return actual === "0" || actual === "";
  }

  // Handle comparison targets like "<30s", ">90"
  const comparisonMatch = target.match(/^([<>]=?)(\d+(?:\.\d+)?)/);
  if (comparisonMatch) {
    const [, op, targetVal] = comparisonMatch;
    const actualNum = parseFloat(actual.replace(/[^\d.]/g, ""));
    const targetNum = parseFloat(targetVal);

    if (isNaN(actualNum) || isNaN(targetNum)) return false;

    switch (op) {
      case "<": return actualNum < targetNum;
      case "<=": return actualNum <= targetNum;
      case ">": return actualNum > targetNum;
      case ">=": return actualNum >= targetNum;
      default: return actualNum === targetNum;
    }
  }

  // Exact match
  return actual === target;
}

// ============================================================================
// HITL Checkpoint Formatter for CLI/UI
// ============================================================================

export function formatCheckpointSummary(
  phase: PhaseDefinition,
  capture: CaptureResult
): string {
  const lines: string[] = [];
  const checkpoint = phase.hitlCheckpoint;

  lines.push("");
  lines.push("═".repeat(60));
  lines.push(`  ${phase.emoji} HITL Checkpoint: ${phase.name}`);
  lines.push("═".repeat(60));
  lines.push("");
  lines.push(`📝 ${checkpoint.prompt}`);
  lines.push("");

  // Preview URLs
  if (capture.previewUrl) {
    lines.push(`🔗 Preview: ${capture.previewUrl}`);
  }
  if (capture.deployUrl) {
    lines.push(`🚀 Deploy: ${capture.deployUrl}`);
  }

  // Screenshots
  if (capture.screenshotPaths.length > 0) {
    lines.push("");
    lines.push("📸 Screenshots captured:");
    for (const path of capture.screenshotPaths) {
      lines.push(`   • ${path}`);
    }
  }

  // Metrics
  if (capture.metrics.length > 0) {
    lines.push("");
    lines.push("📊 Metrics:");
    for (const metric of capture.metrics) {
      const status = metric.passed ? "✅" : "❌";
      lines.push(`   ${status} ${metric.name}: ${metric.actual} (target: ${metric.target})`);
    }
  }

  // Critical paths to verify
  if (checkpoint.criticalPathsToVerify && checkpoint.criticalPathsToVerify.length > 0) {
    lines.push("");
    lines.push("🎯 Critical paths to verify:");
    for (const path of checkpoint.criticalPathsToVerify) {
      lines.push(`   □ ${path}`);
    }
  }

  // Errors
  if (capture.errors.length > 0) {
    lines.push("");
    lines.push("⚠️ Issues detected:");
    for (const error of capture.errors) {
      lines.push(`   • ${error}`);
    }
  }

  lines.push("");
  lines.push("─".repeat(60));
  lines.push("  [A]pprove and continue  |  [R]equest changes  |  [V]iew details");
  lines.push("─".repeat(60));

  return lines.join("\n");
}

// ============================================================================
// Quick Capture for CLI
// ============================================================================

export async function quickCapture(url: string, name: string): Promise<string | null> {
  const screenshotsPath = join(ROOT_DIR, SCREENSHOTS_DIR);
  if (!existsSync(screenshotsPath)) {
    mkdirSync(screenshotsPath, { recursive: true });
  }

  const filepath = join(screenshotsPath, `${name}-${Date.now()}.png`);
  
  // Try playwright first
  const result = spawnSync("npx", [
    "playwright",
    "screenshot",
    url,
    filepath,
    "--full-page",
  ], {
    cwd: ROOT_DIR,
    encoding: "utf-8",
    timeout: 30000,
  });

  if (result.status === 0 && existsSync(filepath)) {
    return filepath;
  }

  return null;
}

// ============================================================================
// Vercel Preview URL
// ============================================================================

export async function getVercelPreviewUrl(): Promise<string | null> {
  try {
    // Check if we have a Vercel deployment URL in environment
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      return `https://${vercelUrl}`;
    }

    // Try to get from vercel CLI
    const result = spawnSync("npx", ["vercel", "inspect", "--json"], {
      cwd: ROOT_DIR,
      encoding: "utf-8",
    });

    if (result.status === 0) {
      const data = JSON.parse(result.stdout);
      if (data.url) {
        return data.url;
      }
    }
  } catch {
    // No Vercel deployment available
  }

  return null;
}

export async function deployVercelPreview(): Promise<string | null> {
  try {
    const result = spawnSync("npx", ["vercel", "--yes"], {
      cwd: ROOT_DIR,
      encoding: "utf-8",
      timeout: 120000,
    });

    if (result.status === 0) {
      // Extract URL from output
      const urlMatch = result.stdout.match(/https:\/\/[^\s]+\.vercel\.app/);
      if (urlMatch) {
        return urlMatch[0];
      }
    }
  } catch {
    // Deployment failed
  }

  return null;
}
