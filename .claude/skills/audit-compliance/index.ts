#!/usr/bin/env node --experimental-strip-types
/**
 * Audit Compliance Skill
 *
 * Automated checks for security, test coverage, and code quality.
 * Prevents regression of issues identified in CCPLATE technical audit.
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

// =============================================================================
// Types
// =============================================================================

interface CheckResult {
  name: string;
  passed: boolean;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  details?: string[];
}

interface AuditOptions {
  mode: "pre-commit" | "full" | "security-only" | "tests-only" | "quality-only";
  fix: boolean;
  verbose: boolean;
}

interface AuditReport {
  passed: boolean;
  summary: string;
  checks: CheckResult[];
  exitCode: number;
}

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  coverageThreshold: 80,
  excludedPaths: ["node_modules", ".next", "out", "build", "src/generated"],
  sensitivePatterns: [
    /sk-[a-zA-Z0-9]{20,}/, // OpenAI keys
    /sk-ant-[a-zA-Z0-9]{20,}/, // Anthropic keys
    /re_[a-zA-Z0-9]{20,}/, // Resend keys
    /tvly-[a-zA-Z0-9]{20,}/, // Tavily keys
    /npg_[a-zA-Z0-9]{20,}/, // Neon keys
  ],
  logPatterns: [
    /console\.(log|warn|error).*\b(password|token|secret|key|api[_-]?key)\b/i,
  ],
};

// =============================================================================
// Security Checks
// =============================================================================

async function checkEnvFilesInGit(): Promise<CheckResult> {
  try {
    const output = execSync("git ls-files | grep -E '\\.env' || true", {
      encoding: "utf-8",
      cwd: process.cwd(),
    });

    const files = output.trim().split("\n").filter(Boolean);
    const violations = files.filter((f) => !f.includes(".env.example"));

    if (violations.length > 0) {
      return {
        name: "No .env files in git",
        passed: false,
        severity: "critical",
        message: `${violations.length} .env file(s) tracked in git`,
        details: violations,
      };
    }

    return {
      name: "No .env files in git",
      passed: true,
      severity: "critical",
      message: "No .env files found in git index",
    };
  } catch (error) {
    return {
      name: "No .env files in git",
      passed: false,
      severity: "critical",
      message: "Failed to check git index",
      details: [String(error)],
    };
  }
}

async function checkApiKeysInSource(): Promise<CheckResult> {
  const violations: string[] = [];
  const sourceDirs = ["src", "e2e", "tests"];

  for (const dir of sourceDirs) {
    if (!existsSync(dir)) continue;
    const files = findFiles(dir, [".ts", ".tsx", ".js", ".jsx"]);

    for (const file of files.slice(0, 100)) {
      // Limit for performance
      try {
        const content = readFileSync(file, "utf-8");

        for (const pattern of CONFIG.sensitivePatterns) {
          if (pattern.test(content)) {
            const relativePath = relative(process.cwd(), file);
            violations.push(`${relativePath}: Potential API key pattern`);
            break; // One violation per file is enough
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  if (violations.length > 0) {
    return {
      name: "No API keys in source",
      passed: false,
      severity: "critical",
      message: `${violations.length} file(s) with potential API key patterns`,
      details: violations.slice(0, 5), // Show first 5
    };
  }

  return {
    name: "No API keys in source",
    passed: true,
    severity: "critical",
    message: "No API key patterns detected in source",
  };
}

async function checkConsoleLogSensitive(): Promise<CheckResult> {
  const violations: string[] = [];
  const files = findFiles("src", [".ts", ".tsx"]);

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        for (const pattern of CONFIG.logPatterns) {
          if (pattern.test(line)) {
            const relativePath = relative(process.cwd(), file);
            violations.push(`${relativePath}:${index + 1}: ${line.trim()}`);
          }
        }
      });
    } catch {
      // Skip
    }
  }

  if (violations.length > 0) {
    return {
      name: "No sensitive console logs",
      passed: false,
      severity: "high",
      message: `${violations.length} console log(s) with sensitive data`,
      details: violations.slice(0, 5),
    };
  }

  return {
    name: "No sensitive console logs",
    passed: true,
    severity: "high",
    message: "No sensitive data in console logs",
  };
}

// =============================================================================
// Test Coverage Checks
// =============================================================================

async function checkE2ETestsExist(): Promise<CheckResult> {
  const e2eDir = "e2e";
  if (!existsSync(e2eDir)) {
    return {
      name: "E2E tests exist",
      passed: false,
      severity: "high",
      message: "No e2e/ directory found",
    };
  }

  const files = findFiles(e2eDir, [".spec.ts"]);
  const testCount = files.length;

  // Count tests in files (rough estimate)
  let totalTests = 0;
  for (const file of files.slice(0, 20)) {
    try {
      const content = readFileSync(file, "utf-8");
      const matches = content.match(/test\(/g);
      if (matches) totalTests += matches.length;
    } catch {
      // Skip
    }
  }

  if (testCount === 0) {
    return {
      name: "E2E tests exist",
      passed: false,
      severity: "high",
      message: "No E2E test files found",
    };
  }

  return {
    name: "E2E tests exist",
    passed: true,
    severity: "high",
    message: `${testCount} E2E files with ~${totalTests} tests`,
  };
}

async function checkUnitTestCoverage(): Promise<CheckResult> {
  try {
    // Run coverage check
    execSync("npm run test:unit:coverage", {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    return {
      name: "Unit test coverage >= 80%",
      passed: true,
      severity: "high",
      message: "Coverage check passed",
    };
  } catch {
    return {
      name: "Unit test coverage >= 80%",
      passed: false,
      severity: "high",
      message: "Coverage below 80% threshold (run npm run test:unit:coverage for details)",
    };
  }
}

// =============================================================================
// Code Quality Checks
// =============================================================================

async function checkEslintPasses(): Promise<CheckResult> {
  try {
    execSync("npm run lint", {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    return {
      name: "ESLint passes",
      passed: true,
      severity: "medium",
      message: "No ESLint errors",
    };
  } catch {
    return {
      name: "ESLint passes",
      passed: false,
      severity: "medium",
      message: "ESLint errors found (run npm run lint for details)",
    };
  }
}

async function checkTypeScriptCompiles(): Promise<CheckResult> {
  try {
    execSync("npx tsc --noEmit", {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    return {
      name: "TypeScript compiles",
      passed: true,
      severity: "high",
      message: "No TypeScript errors",
    };
  } catch {
    return {
      name: "TypeScript compiles",
      passed: false,
      severity: "high",
      message: "TypeScript compilation failed (run npx tsc --noEmit for details)",
    };
  }
}

async function checkNoTodoInProduction(): Promise<CheckResult> {
  const violations: string[] = [];
  const sourceFiles = findFiles("src", [".ts", ".tsx"]);

  for (const file of sourceFiles.slice(0, 100)) {
    try {
      const content = readFileSync(file, "utf-8");
      const todoMatches = content.match(/TODO|FIXME|XXX|HACK/g);

      if (todoMatches && todoMatches.length > 0) {
        const relativePath = relative(process.cwd(), file);
        violations.push(`${relativePath}: ${todoMatches.length} marker(s)`);
      }
    } catch {
      // Skip
    }
  }

  if (violations.length > 10) {
    return {
      name: "Minimal TODOs in production",
      passed: false,
      severity: "low",
      message: `${violations.length} files with TODO/FIXME markers`,
      details: violations.slice(0, 5),
    };
  }

  return {
    name: "Minimal TODOs in production",
    passed: true,
    severity: "low",
    message: `${violations.length} files with TODO markers (acceptable)`,
  };
}

// =============================================================================
// Utilities
// =============================================================================

function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!CONFIG.excludedPaths.some((ex) => path.includes(ex))) {
        files.push(...findFiles(path, extensions));
      }
    } else if (entry.isFile()) {
      if (extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(path);
      }
    }
  }

  return files;
}

function formatResults(results: CheckResult[]): string {
  const lines: string[] = [];
  lines.push("═".repeat(60));
  lines.push("AUDIT COMPLIANCE REPORT");
  lines.push("═".repeat(60));

  const critical = results.filter((r) => r.severity === "critical" && !r.passed);
  const high = results.filter((r) => r.severity === "high" && !r.passed);
  const medium = results.filter((r) => r.severity === "medium" && !r.passed);
  const passed = results.filter((r) => r.passed);

  if (critical.length > 0) {
    lines.push("\n🔴 CRITICAL ISSUES:");
    for (const r of critical) {
      lines.push(`  ✗ ${r.name}: ${r.message}`);
      r.details?.forEach((d) => lines.push(`    - ${d}`));
    }
  }

  if (high.length > 0) {
    lines.push("\n🟠 HIGH PRIORITY:");
    for (const r of high) {
      lines.push(`  ⚠ ${r.name}: ${r.message}`);
    }
  }

  if (medium.length > 0) {
    lines.push("\n🟡 MEDIUM PRIORITY:");
    for (const r of medium) {
      lines.push(`  ○ ${r.name}: ${r.message}`);
    }
  }

  lines.push("\n✅ PASSED:");
  for (const r of passed) {
    lines.push(`  ✓ ${r.name}: ${r.message}`);
  }

  lines.push("\n" + "─".repeat(60));
  const total = results.length;
  const passCount = passed.length;
  lines.push(`SUMMARY: ${passCount}/${total} checks passed`);
  lines.push("═".repeat(60));

  return lines.join("\n");
}

// =============================================================================
// Main
// =============================================================================

export async function runAuditCompliance(
  options: AuditOptions
): Promise<AuditReport> {
  const checks: CheckResult[] = [];

  // Security checks (always run unless tests-only)
  if (options.mode !== "tests-only" && options.mode !== "quality-only") {
    checks.push(await checkEnvFilesInGit());
    checks.push(await checkApiKeysInSource());
    checks.push(await checkConsoleLogSensitive());
  }

  // Test checks (always run unless security-only or quality-only)
  if (options.mode !== "security-only" && options.mode !== "quality-only") {
    checks.push(await checkE2ETestsExist());
    if (options.mode === "full") {
      checks.push(await checkUnitTestCoverage());
    }
  }

  // Quality checks (always run unless security-only or tests-only)
  if (options.mode !== "security-only" && options.mode !== "tests-only") {
    checks.push(await checkEslintPasses());
    checks.push(await checkTypeScriptCompiles());
    checks.push(await checkNoTodoInProduction());
  }

  // Determine exit code
  const criticalFailed = checks.some(
    (r) => r.severity === "critical" && !r.passed
  );
  const highFailed = checks.some((r) => r.severity === "high" && !r.passed);
  const mediumFailed = checks.some(
    (r) => r.severity === "medium" && !r.passed
  );

  let exitCode = 0;
  if (criticalFailed) exitCode = 1;
  else if (highFailed) exitCode = 2;
  else if (mediumFailed) exitCode = 3;

  const passed = exitCode === 0;
  const summary = passed
    ? "All compliance checks passed"
    : `${checks.filter((r) => !r.passed).length} check(s) failed`;

  const report: AuditReport = {
    passed,
    summary,
    checks,
    exitCode,
  };

  // Output
  console.log(formatResults(checks));

  return report;
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const mode =
    (args.find((a) => a.startsWith("--"))?.replace("--", "") as AuditOptions["mode"]) ||
    "pre-commit";
  const fix = args.includes("--fix");
  const verbose = args.includes("--verbose");

  runAuditCompliance({ mode, fix, verbose }).then((report) => {
    process.exit(report.exitCode);
  });
}
