/**
 * Playwright Validation Loop
 * 
 * Integrates Playwright test results into workflow-state.json.
 * Agents cannot mark tasks DONE until corresponding tests pass.
 * Auto-spawns "Fix Loop" on test failure with screenshot context.
 */

import { spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

export interface PlaywrightTestResult {
  testFile: string;
  testName: string;
  status: "passed" | "failed" | "skipped" | "timedOut";
  duration: number;
  error?: string;
  screenshotPath?: string;
}

export interface PlaywrightRunResult {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: PlaywrightTestResult[];
  reportPath?: string;
}

export interface ValidationState {
  lastRun?: PlaywrightRunResult;
  blockedTasks: Array<{
    taskId: string;
    requiredTests: string[];
    failingTests: string[];
  }>;
  fixLoopActive: boolean;
  fixLoopAttempts: number;
  fixLoopTarget?: {
    testFile: string;
    testName: string;
    error: string;
    screenshotPath?: string;
  };
}

export interface TaskTestMapping {
  taskId: string;
  testPatterns: string[];
}

const VALIDATION_STATE_FILE = "playwright-validation.json";
const TASK_TEST_MAP_FILE = "task-test-map.json";

function execFile(file: string, args: string[], cwd: string): { stdout: string; _exitCode: number } {
  try {
    const result = spawnSync(file, args, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: false
    });
    return {
      stdout: (result.stdout || "").trim(),
      _exitCode: result.status ?? (result.error ? 1 : 0)
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; status?: number };
    return { 
      stdout: execError.stdout || "", 
      _exitCode: execError.status || 1 
    };
  }
}

export function loadValidationState(rootDir: string): ValidationState {
  const path = join(rootDir, "memory", VALIDATION_STATE_FILE);
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf-8"));
    }
  } catch {
    // Fall through
  }
  return {
    blockedTasks: [],
    fixLoopActive: false,
    fixLoopAttempts: 0,
  };
}

export function saveValidationState(rootDir: string, state: ValidationState): void {
  const path = join(rootDir, "memory", VALIDATION_STATE_FILE);
  writeFileSync(path, JSON.stringify(state, null, 2) + "\n");
}

export function loadTaskTestMap(rootDir: string): TaskTestMapping[] {
  const path = join(rootDir, "memory", TASK_TEST_MAP_FILE);
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf-8"));
    }
  } catch {
    // Fall through
  }
  return [];
}

export function saveTaskTestMap(rootDir: string, mappings: TaskTestMapping[]): void {
  const path = join(rootDir, "memory", TASK_TEST_MAP_FILE);
  writeFileSync(path, JSON.stringify(mappings, null, 2) + "\n");
}

export function registerTaskTests(
  rootDir: string,
  taskId: string,
  testPatterns: string[]
): void {
  const mappings = loadTaskTestMap(rootDir);
  const existing = mappings.find((m) => m.taskId === taskId);
  
  if (existing) {
    existing.testPatterns = [...new Set([...existing.testPatterns, ...testPatterns])];
  } else {
    mappings.push({ taskId, testPatterns });
  }
  
  saveTaskTestMap(rootDir, mappings);
}

export function parsePlaywrightJsonReport(reportPath: string): PlaywrightRunResult | null {
  try {
    if (!existsSync(reportPath)) {
      return null;
    }
    
    const report = JSON.parse(readFileSync(reportPath, "utf-8"));
    const tests: PlaywrightTestResult[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDuration = 0;

    // Parse Playwright JSON report format
    for (const suite of report.suites || []) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const result = test.results?.[0];
          const status = result?.status || "skipped";
          const duration = result?.duration || 0;
          
          tests.push({
            testFile: suite.file || "",
            testName: spec.title || "",
            status: status as PlaywrightTestResult["status"],
            duration,
            error: result?.error?.message,
            screenshotPath: result?.attachments?.find(
              (a: { name: string }) => a.name === "screenshot"
            )?.path,
          });

          totalDuration += duration;
          if (status === "passed") passed++;
          else if (status === "failed" || status === "timedOut") failed++;
          else skipped++;
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      totalTests: tests.length,
      passed,
      failed,
      skipped,
      duration: totalDuration,
      tests,
      reportPath,
    };
  } catch {
    return null;
  }
}

export function parsePlaywrightOutput(output: string): PlaywrightRunResult {
  const tests: PlaywrightTestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // Parse standard Playwright output lines
  // Format: "  ✓  1 [chromium] › auth.spec.ts:5:3 › Authentication › Login Page › should display login form (2.1s)"
  // Format: "  ✘  2 [chromium] › auth.spec.ts:17:3 › Authentication › Login Page › should show validation (5.2s)"
  const testLinePattern = /^\s*([✓✘◯⊘])\s+\d+\s+\[.+?\]\s+›\s+(.+?):(\d+):\d+\s+›\s+(.+?)\s*(?:\(([0-9.]+)(?:s|ms)\))?$/;
  
  for (const line of output.split("\n")) {
    const match = line.match(testLinePattern);
    if (match) {
      const [, symbol, file, , testName, durationStr] = match;
      const status: PlaywrightTestResult["status"] = 
        symbol === "✓" ? "passed" :
        symbol === "✘" ? "failed" :
        symbol === "◯" ? "skipped" : "timedOut";
      
      const duration = durationStr ? parseFloat(durationStr) * 1000 : 0;
      
      tests.push({
        testFile: file,
        testName: testName.trim(),
        status,
        duration,
      });

      if (status === "passed") passed++;
      else if (status === "failed" || status === "timedOut") failed++;
      else skipped++;
    }
  }

  // Also parse summary line: "  2 passed (5.2s)"
  const summaryMatch = output.match(/(\d+)\s+passed.*?(\d+)\s+failed/);
  if (summaryMatch && tests.length === 0) {
    passed = parseInt(summaryMatch[1], 10);
    failed = parseInt(summaryMatch[2], 10);
  }

  return {
    timestamp: new Date().toISOString(),
    totalTests: tests.length || passed + failed + skipped,
    passed,
    failed,
    skipped,
    duration: 0,
    tests,
  };
}

export function runPlaywrightTests(
  rootDir: string,
  options: {
    testPattern?: string;
    reporter?: "json" | "list";
    updateSnapshots?: boolean;
  } = {}
): PlaywrightRunResult {
  const { testPattern, reporter = "list", updateSnapshots = false } = options;
  
  const args = ["playwright", "test"];
  
  if (testPattern) {
    args.push(testPattern);
  }
  
  if (reporter === "json") {
    args.push("--reporter=json");
  }
  
  if (updateSnapshots) {
    args.push("--update-snapshots");
  }

  const { stdout } = execFile("npx", args, rootDir);
  
  // Try to parse JSON report if available
  const jsonReportPath = join(rootDir, "test-results", "report.json");
  const jsonResult = parsePlaywrightJsonReport(jsonReportPath);
  
  if (jsonResult) {
    return jsonResult;
  }
  
  // Fall back to parsing stdout
  return parsePlaywrightOutput(stdout);
}

export function findLatestScreenshot(rootDir: string, testName: string): string | null {
  const testResultsDir = join(rootDir, "test-results");
  
  if (!existsSync(testResultsDir)) {
    return null;
  }

  try {
    const entries = readdirSync(testResultsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const screenshotDir = join(testResultsDir, entry.name);
        const files = readdirSync(screenshotDir);
        
        for (const file of files) {
          if (file.endsWith(".png") && entry.name.includes(testName.replace(/\s+/g, "-"))) {
            return join(screenshotDir, file);
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }
  
  return null;
}

export function checkTaskCanComplete(
  rootDir: string,
  taskId: string
): { canComplete: boolean; reason?: string; failingTests?: string[] } {
  const mappings = loadTaskTestMap(rootDir);
  const validation = loadValidationState(rootDir);
  
  const taskMapping = mappings.find((m) => m.taskId === taskId);
  
  if (!taskMapping || taskMapping.testPatterns.length === 0) {
    return { canComplete: true };
  }

  if (!validation.lastRun) {
    return {
      canComplete: false,
      reason: `No Playwright tests have been run. Run tests matching: ${taskMapping.testPatterns.join(", ")}`,
    };
  }

  const failingTests: string[] = [];
  
  for (const pattern of taskMapping.testPatterns) {
    const matchingTests = validation.lastRun.tests.filter((t) =>
      t.testFile.includes(pattern) || t.testName.includes(pattern)
    );
    
    for (const test of matchingTests) {
      if (test.status === "failed" || test.status === "timedOut") {
        failingTests.push(`${test.testFile}: ${test.testName}`);
      }
    }
  }

  if (failingTests.length > 0) {
    return {
      canComplete: false,
      reason: `Task blocked: ${failingTests.length} test(s) still failing`,
      failingTests,
    };
  }

  return { canComplete: true };
}

export function startFixLoop(
  rootDir: string,
  testResult: PlaywrightTestResult
): void {
  const validation = loadValidationState(rootDir);
  
  const screenshotPath = testResult.screenshotPath || 
    findLatestScreenshot(rootDir, testResult.testName);
  
  validation.fixLoopActive = true;
  validation.fixLoopAttempts = 0;
  validation.fixLoopTarget = {
    testFile: testResult.testFile,
    testName: testResult.testName,
    error: testResult.error || "Test failed",
    screenshotPath: screenshotPath || undefined,
  };
  
  saveValidationState(rootDir, validation);
}

export function incrementFixLoopAttempt(rootDir: string): number {
  const validation = loadValidationState(rootDir);
  validation.fixLoopAttempts++;
  saveValidationState(rootDir, validation);
  return validation.fixLoopAttempts;
}

export function endFixLoop(rootDir: string): void {
  const validation = loadValidationState(rootDir);
  validation.fixLoopActive = false;
  validation.fixLoopAttempts = 0;
  validation.fixLoopTarget = undefined;
  saveValidationState(rootDir, validation);
}

export function getFixLoopContext(rootDir: string): string | null {
  const validation = loadValidationState(rootDir);
  
  if (!validation.fixLoopActive || !validation.fixLoopTarget) {
    return null;
  }

  const { testFile, testName, error, screenshotPath } = validation.fixLoopTarget;
  const attempts = validation.fixLoopAttempts;
  
  let context = `🔄 Fix Loop Active (Attempt ${attempts + 1})\n`;
  context += `Test: ${testFile} › ${testName}\n`;
  context += `Error: ${error}\n`;
  
  if (screenshotPath && existsSync(screenshotPath)) {
    context += `Screenshot: ${screenshotPath}\n`;
  }
  
  if (attempts >= 3) {
    context += `\n⚠️ Multiple fix attempts. Consider:\n`;
    context += `- Checking test expectations are correct\n`;
    context += `- Reviewing the component being tested\n`;
    context += `- Running tests locally with --debug flag\n`;
  }
  
  return context;
}

export function updateValidationFromTestRun(
  rootDir: string,
  result: PlaywrightRunResult
): { shouldStartFixLoop: boolean; failedTest?: PlaywrightTestResult } {
  const validation = loadValidationState(rootDir);
  validation.lastRun = result;
  
  // Update blocked tasks
  const mappings = loadTaskTestMap(rootDir);
  validation.blockedTasks = [];
  
  for (const mapping of mappings) {
    const failingTests: string[] = [];
    
    for (const pattern of mapping.testPatterns) {
      const matchingTests = result.tests.filter((t) =>
        t.testFile.includes(pattern) || t.testName.includes(pattern)
      );
      
      for (const test of matchingTests) {
        if (test.status === "failed" || test.status === "timedOut") {
          failingTests.push(`${test.testFile}:${test.testName}`);
        }
      }
    }
    
    if (failingTests.length > 0) {
      validation.blockedTasks.push({
        taskId: mapping.taskId,
        requiredTests: mapping.testPatterns,
        failingTests,
      });
    }
  }
  
  // Check if we should start a fix loop
  const firstFailure = result.tests.find((t) => t.status === "failed");
  
  if (firstFailure && !validation.fixLoopActive) {
    saveValidationState(rootDir, validation);
    return { shouldStartFixLoop: true, failedTest: firstFailure };
  }
  
  // If fix loop is active and tests still failing, increment attempt
  if (validation.fixLoopActive && firstFailure) {
    validation.fixLoopAttempts++;
  } else if (validation.fixLoopActive && !firstFailure) {
    // All tests passing, end fix loop
    validation.fixLoopActive = false;
    validation.fixLoopTarget = undefined;
    validation.fixLoopAttempts = 0;
  }
  
  saveValidationState(rootDir, validation);
  return { shouldStartFixLoop: false };
}

export function formatValidationStatus(rootDir: string): string {
  const validation = loadValidationState(rootDir);
  
  if (!validation.lastRun) {
    return "No Playwright tests have been run yet.";
  }
  
  const { passed, failed, skipped, totalTests, timestamp } = validation.lastRun;
  const time = new Date(timestamp).toLocaleTimeString();
  
  let status = `🧪 Playwright: ${passed}/${totalTests} passed`;
  
  if (failed > 0) {
    status += ` (${failed} failed)`;
  }
  
  if (skipped > 0) {
    status += ` (${skipped} skipped)`;
  }
  
  status += ` at ${time}`;
  
  if (validation.blockedTasks.length > 0) {
    status += `\n⛔ ${validation.blockedTasks.length} task(s) blocked by failing tests`;
  }
  
  if (validation.fixLoopActive) {
    status += `\n🔄 Fix loop active (attempt ${validation.fixLoopAttempts + 1})`;
  }
  
  return status;
}
