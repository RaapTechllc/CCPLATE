import { execSync, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface ValidationResult {
  passed: boolean;
  testFile: string;
  duration: number;
  failedTests: Array<{
    name: string;
    error: string;
    screenshot?: string;
  }>;
  stdout: string;
  stderr: string;
}

export interface FixLoopContext {
  attempt: number;
  maxAttempts: number;
  taskId: string;
  testFile: string;
  lastError: string;
  screenshot?: string;
  trace?: string;
}

const PROJECT_DIR = process.cwd();
const MAX_FIX_ATTEMPTS = 3;

export function runPlaywrightTest(testPattern: string): ValidationResult {
  const startTime = Date.now();
  let stdout = '';
  let stderr = '';
  let passed = true;
  const failedTests: ValidationResult['failedTests'] = [];
  
  try {
    // SECURITY: Use spawnSync with argument array to prevent command injection
    const result = spawnSync(
      "npx",
      ["playwright", "test", "--grep", testPattern, "--reporter=json"],
      { cwd: PROJECT_DIR, encoding: "utf-8", timeout: 120000 }
    );
    stdout = (result.stdout as string) || "";
    stderr = (result.stderr as string) || "";
    if (result.status !== 0) {
      throw { stdout, stderr };
    }
  } catch (error: unknown) {
    const e = error as { stdout?: string; stderr?: string };
    stdout = e.stdout || '';
    stderr = e.stderr || '';
    passed = false;
    
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);
        for (const suite of results.suites || []) {
          for (const spec of suite.specs || []) {
            if (spec.ok === false) {
              failedTests.push({
                name: spec.title,
                error: spec.tests?.[0]?.results?.[0]?.error?.message || 'Unknown error',
                screenshot: findScreenshot(spec.title),
              });
            }
          }
        }
      }
    } catch {
      failedTests.push({
        name: testPattern,
        error: stderr || stdout || 'Test failed',
      });
    }
  }
  
  return {
    passed,
    testFile: testPattern,
    duration: Date.now() - startTime,
    failedTests,
    stdout,
    stderr,
  };
}

function findScreenshot(testName: string): string | undefined {
  const screenshotDir = join(PROJECT_DIR, 'test-results');
  if (!existsSync(screenshotDir)) return undefined;
  
  const sanitizedName = testName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const possiblePaths = [
    join(screenshotDir, `${sanitizedName}-1.png`),
    join(screenshotDir, `${sanitizedName}.png`),
  ];
  
  for (const p of possiblePaths) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export function findTestForTask(taskDescription: string): string | null {
  const testMappings: Record<string, string> = {
    'auth': 'auth.spec.ts',
    'login': 'auth.spec.ts',
    'register': 'auth.spec.ts',
    'dashboard': 'guardian.spec.ts',
    'guardian': 'guardian.spec.ts',
    'builder': 'builders.spec.ts',
    'hook': 'builders.spec.ts',
    'component': 'builders.spec.ts',
    'api': 'api.spec.ts',
    'upload': 'api.spec.ts',
    'home': 'home.spec.ts',
    'protected': 'protected-routes.spec.ts',
  };
  
  const lowerDesc = taskDescription.toLowerCase();
  for (const [keyword, testFile] of Object.entries(testMappings)) {
    if (lowerDesc.includes(keyword)) {
      const fullPath = join(PROJECT_DIR, 'e2e', testFile);
      if (existsSync(fullPath)) return testFile;
    }
  }
  
  return null;
}

export function formatFailureForAgent(result: ValidationResult): string {
  let output = `## ❌ Validation Failed\n\n`;
  output += `**Test:** ${result.testFile}\n`;
  output += `**Duration:** ${result.duration}ms\n\n`;
  
  if (result.failedTests.length > 0) {
    output += `### Failed Tests:\n\n`;
    for (const test of result.failedTests) {
      output += `#### ${test.name}\n`;
      output += `\`\`\`\n${test.error}\n\`\`\`\n\n`;
      if (test.screenshot) {
        output += `📸 Screenshot: ${test.screenshot}\n\n`;
      }
    }
  }
  
  return output;
}

export function validateTaskCompletion(taskId: string, taskDescription: string): {
  canComplete: boolean;
  reason: string;
  fixContext?: FixLoopContext;
} {
  const testFile = findTestForTask(taskDescription);
  
  if (!testFile) {
    return {
      canComplete: true,
      reason: `⚠️ No validation test found for task. Consider adding one.`,
    };
  }
  
  const result = runPlaywrightTest(testFile);
  
  if (result.passed) {
    return {
      canComplete: true,
      reason: `✅ Validation passed: ${testFile}`,
    };
  }
  
  return {
    canComplete: false,
    reason: formatFailureForAgent(result),
    fixContext: {
      attempt: 1,
      maxAttempts: MAX_FIX_ATTEMPTS,
      taskId,
      testFile,
      lastError: result.failedTests[0]?.error || 'Unknown error',
      screenshot: result.failedTests[0]?.screenshot,
    },
  };
}

export function retryValidation(context: FixLoopContext): {
  canComplete: boolean;
  reason: string;
  fixContext?: FixLoopContext;
} {
  if (context.attempt >= context.maxAttempts) {
    return {
      canComplete: false,
      reason: `❌ Max fix attempts (${context.maxAttempts}) reached for ${context.testFile}. Manual intervention required.`,
    };
  }
  
  const result = runPlaywrightTest(context.testFile);
  
  if (result.passed) {
    return {
      canComplete: true,
      reason: `✅ Validation passed on attempt ${context.attempt + 1}: ${context.testFile}`,
    };
  }
  
  return {
    canComplete: false,
    reason: formatFailureForAgent(result),
    fixContext: {
      ...context,
      attempt: context.attempt + 1,
      lastError: result.failedTests[0]?.error || 'Unknown error',
      screenshot: result.failedTests[0]?.screenshot,
    },
  };
}

export function getMaxAttempts(): number {
  return MAX_FIX_ATTEMPTS;
}
