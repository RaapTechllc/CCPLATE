/**
 * Quality Gate - Pre-commit Validation System
 * 
 * Ensures code quality before commits with:
 * - TypeScript check (tsc --noEmit)
 * - Lint check (eslint --fix with auto-fix count)
 * - Test coverage check (vitest --coverage)
 * - Security scan (detect secrets, common vulnerabilities)
 * - Bundle size analysis (warn on large deps)
 */

import { spawnSync, type SpawnSyncReturns } from "child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

// ============================================================================
// TYPES
// ============================================================================

export type GateStatus = "pass" | "warn" | "fail";

export interface GateCheckResult {
  name: string;
  status: GateStatus;
  message: string;
  details?: string[];
  duration?: number;
  autoFixed?: number;
}

export interface QualityGateResult {
  timestamp: string;
  overall: GateStatus;
  blockers: GateCheckResult[];
  warnings: GateCheckResult[];
  passed: GateCheckResult[];
  summary: string;
  totalDuration: number;
}

export interface QualityGateConfig {
  typescript: {
    enabled: boolean;
    strict: boolean;
  };
  lint: {
    enabled: boolean;
    autoFix: boolean;
  };
  coverage: {
    enabled: boolean;
    minPercent: number;
  };
  security: {
    enabled: boolean;
    checkSecrets: boolean;
    checkVulnerabilities: boolean;
  };
  bundleSize: {
    enabled: boolean;
    warnThresholdKb: number;
    maxPackageKb: number;
  };
}

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: "high" | "medium" | "low";
}

export interface CoverageData {
  lines: { total: number; covered: number; percent: number };
  statements: { total: number; covered: number; percent: number };
  functions: { total: number; covered: number; percent: number };
  branches: { total: number; covered: number; percent: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_QUALITY_GATE_CONFIG: QualityGateConfig = {
  typescript: {
    enabled: true,
    strict: true,
  },
  lint: {
    enabled: true,
    autoFix: true,
  },
  coverage: {
    enabled: true,
    minPercent: 60, // Lowered for MVP
  },
  security: {
    enabled: true,
    checkSecrets: true,
    checkVulnerabilities: true,
  },
  bundleSize: {
    enabled: true,
    warnThresholdKb: 500,
    maxPackageKb: 2000,
  },
};

// Secret patterns to detect (high severity = blocker)
export const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: "high",
  },
  {
    name: "AWS Secret Key",
    pattern: /[0-9a-zA-Z/+]{40}/g,
    severity: "medium", // Too many false positives for high
  },
  {
    name: "GitHub Token",
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    severity: "high",
  },
  {
    name: "OpenAI API Key",
    pattern: /sk-[A-Za-z0-9]{48,}/g,
    severity: "high",
  },
  {
    name: "Stripe Key",
    pattern: /sk_live_[A-Za-z0-9]{24,}/g,
    severity: "high",
  },
  {
    name: "Private Key",
    pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: "high",
  },
  {
    name: "Generic API Key",
    pattern: /api[_-]?key['":\s]*[=:]\s*['"][A-Za-z0-9]{20,}['"]/gi,
    severity: "medium",
  },
  {
    name: "Generic Secret",
    pattern: /secret['":\s]*[=:]\s*['"][A-Za-z0-9]{16,}['"]/gi,
    severity: "medium",
  },
  {
    name: "Password in Code",
    pattern: /password\s*[=:]\s*['"][^'"]{8,}['"]/gi,
    severity: "medium",
  },
  {
    name: "JWT Token",
    pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
    severity: "low",
  },
];

// Vulnerability patterns
export const VULNERABILITY_PATTERNS = [
  {
    name: "SQL Injection Risk",
    pattern: /`.*\$\{.*\}.*`.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/gi,
    message: "Potential SQL injection - use parameterized queries",
  },
  {
    name: "Command Injection Risk",
    pattern: /exec\s*\(\s*[`"'].*\$\{/g,
    message: "Potential command injection - use spawn with array args",
  },
  {
    name: "Eval Usage",
    pattern: /\beval\s*\(/g,
    message: "Avoid eval() - security risk",
  },
  {
    name: "innerHTML Usage",
    pattern: /\.innerHTML\s*=/g,
    message: "Avoid innerHTML - use textContent or sanitize",
  },
  {
    name: "dangerouslySetInnerHTML",
    pattern: /dangerouslySetInnerHTML/g,
    message: "Ensure sanitization before using dangerouslySetInnerHTML",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): { success: boolean; stdout: string; stderr: string; duration: number } {
  const start = Date.now();
  
  const result: SpawnSyncReturns<Buffer> = spawnSync(command, args, {
    cwd,
    encoding: "buffer",
    shell: false,
    timeout: 120000, // 2 minute timeout
  });
  
  const duration = Date.now() - start;
  
  return {
    success: result.status === 0,
    stdout: result.stdout?.toString("utf-8") || "",
    stderr: result.stderr?.toString("utf-8") || "",
    duration,
  };
}

function findSourceFiles(dir: string, extensions: string[] = [".ts", ".tsx", ".js", ".jsx"]): string[] {
  const files: string[] = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    
    // Skip node_modules, .next, dist, coverage
    if (["node_modules", ".next", "dist", "coverage", ".git", ".worktrees"].includes(entry)) {
      continue;
    }
    
    try {
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...findSourceFiles(fullPath, extensions));
      } else if (extensions.some(ext => entry.endsWith(ext))) {
        files.push(fullPath);
      }
    } catch {
      // Skip files we can't stat
    }
  }
  
  return files;
}

// ============================================================================
// QUALITY CHECKS
// ============================================================================

/**
 * Run TypeScript type check
 */
export function checkTypeScript(rootDir: string, config: QualityGateConfig["typescript"]): GateCheckResult {
  if (!config.enabled) {
    return {
      name: "TypeScript",
      status: "pass",
      message: "Skipped (disabled)",
    };
  }
  
  const args = ["--noEmit"];
  if (config.strict) {
    args.push("--strict");
  }
  
  const result = runCommand("npx", ["tsc", ...args], rootDir);
  
  if (result.success) {
    return {
      name: "TypeScript",
      status: "pass",
      message: "No type errors",
      duration: result.duration,
    };
  }
  
  // Parse errors from output
  const errorLines = result.stdout
    .split("\n")
    .filter(line => line.includes("error TS"));
  
  return {
    name: "TypeScript",
    status: "fail",
    message: `${errorLines.length} type error(s)`,
    details: errorLines.slice(0, 10),
    duration: result.duration,
  };
}

/**
 * Run ESLint check with optional auto-fix
 */
export function checkLint(rootDir: string, config: QualityGateConfig["lint"]): GateCheckResult {
  if (!config.enabled) {
    return {
      name: "Lint",
      status: "pass",
      message: "Skipped (disabled)",
    };
  }
  
  const args = ["eslint", ".", "--ext", ".ts,.tsx,.js,.jsx"];
  if (config.autoFix) {
    args.push("--fix");
  }
  args.push("--format", "json");
  
  const result = runCommand("npx", args, rootDir);
  
  try {
    const lintResults = JSON.parse(result.stdout || "[]");
    
    let errorCount = 0;
    let warningCount = 0;
    let fixableCount = 0;
    
    for (const file of lintResults) {
      errorCount += file.errorCount || 0;
      warningCount += file.warningCount || 0;
      fixableCount += (file.fixableErrorCount || 0) + (file.fixableWarningCount || 0);
    }
    
    if (errorCount > 0) {
      return {
        name: "Lint",
        status: "fail",
        message: `${errorCount} error(s), ${warningCount} warning(s)`,
        autoFixed: config.autoFix ? fixableCount : undefined,
        duration: result.duration,
      };
    }
    
    if (warningCount > 0) {
      return {
        name: "Lint",
        status: "warn",
        message: `${warningCount} warning(s)`,
        autoFixed: config.autoFix ? fixableCount : undefined,
        duration: result.duration,
      };
    }
    
    return {
      name: "Lint",
      status: "pass",
      message: "No issues",
      autoFixed: config.autoFix ? fixableCount : undefined,
      duration: result.duration,
    };
  } catch {
    // Fallback to simple parsing
    if (result.success) {
      return {
        name: "Lint",
        status: "pass",
        message: "No issues",
        duration: result.duration,
      };
    }
    
    return {
      name: "Lint",
      status: "warn",
      message: "Could not parse lint output",
      details: [result.stderr.slice(0, 500)],
      duration: result.duration,
    };
  }
}

/**
 * Run test coverage check
 */
export function checkCoverage(rootDir: string, config: QualityGateConfig["coverage"]): GateCheckResult {
  if (!config.enabled) {
    return {
      name: "Coverage",
      status: "pass",
      message: "Skipped (disabled)",
    };
  }
  
  const result = runCommand(
    "npx",
    ["vitest", "run", "--coverage", "--coverage.reporter=json", "--reporter=json"],
    rootDir,
  );
  
  // Try to read coverage summary
  const coveragePath = join(rootDir, "coverage", "coverage-summary.json");
  
  if (existsSync(coveragePath)) {
    try {
      const coverageData = JSON.parse(readFileSync(coveragePath, "utf-8"));
      const total = coverageData.total;
      
      const linePercent = total?.lines?.pct || 0;
      const stmtPercent = total?.statements?.pct || 0;
      const funcPercent = total?.functions?.pct || 0;
      const branchPercent = total?.branches?.pct || 0;
      
      const avgPercent = (linePercent + stmtPercent + funcPercent + branchPercent) / 4;
      
      if (avgPercent < config.minPercent) {
        return {
          name: "Coverage",
          status: "fail",
          message: `${avgPercent.toFixed(1)}% coverage (min: ${config.minPercent}%)`,
          details: [
            `Lines: ${linePercent.toFixed(1)}%`,
            `Statements: ${stmtPercent.toFixed(1)}%`,
            `Functions: ${funcPercent.toFixed(1)}%`,
            `Branches: ${branchPercent.toFixed(1)}%`,
          ],
          duration: result.duration,
        };
      }
      
      return {
        name: "Coverage",
        status: "pass",
        message: `${avgPercent.toFixed(1)}% coverage`,
        details: [
          `Lines: ${linePercent.toFixed(1)}%`,
          `Statements: ${stmtPercent.toFixed(1)}%`,
          `Functions: ${funcPercent.toFixed(1)}%`,
          `Branches: ${branchPercent.toFixed(1)}%`,
        ],
        duration: result.duration,
      };
    } catch {
      // Fall through to basic check
    }
  }
  
  // Basic check: did tests pass?
  if (result.success) {
    return {
      name: "Coverage",
      status: "warn",
      message: "Tests passed (coverage data unavailable)",
      duration: result.duration,
    };
  }
  
  return {
    name: "Coverage",
    status: "fail",
    message: "Tests failed",
    details: [result.stderr.slice(0, 500)],
    duration: result.duration,
  };
}

/**
 * Scan for secrets and vulnerabilities
 */
export function checkSecurity(rootDir: string, config: QualityGateConfig["security"]): GateCheckResult {
  if (!config.enabled) {
    return {
      name: "Security",
      status: "pass",
      message: "Skipped (disabled)",
    };
  }
  
  const start = Date.now();
  const issues: string[] = [];
  let hasBlocker = false;
  
  const srcDir = join(rootDir, "src");
  const sourceFiles = findSourceFiles(srcDir);
  
  for (const filePath of sourceFiles) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const relativePath = relative(rootDir, filePath);
      
      // Check for secrets
      if (config.checkSecrets) {
        for (const pattern of SECRET_PATTERNS) {
          const matches = content.match(pattern.pattern);
          if (matches) {
            const issue = `${relativePath}: ${pattern.name} detected`;
            issues.push(issue);
            if (pattern.severity === "high") {
              hasBlocker = true;
            }
          }
        }
      }
      
      // Check for vulnerabilities
      if (config.checkVulnerabilities) {
        for (const vuln of VULNERABILITY_PATTERNS) {
          if (vuln.pattern.test(content)) {
            issues.push(`${relativePath}: ${vuln.message}`);
          }
        }
      }
    } catch {
      // Skip files we can't read
    }
  }
  
  const duration = Date.now() - start;
  
  if (hasBlocker) {
    return {
      name: "Security",
      status: "fail",
      message: `${issues.length} security issue(s) found`,
      details: issues.slice(0, 10),
      duration,
    };
  }
  
  if (issues.length > 0) {
    return {
      name: "Security",
      status: "warn",
      message: `${issues.length} potential issue(s)`,
      details: issues.slice(0, 10),
      duration,
    };
  }
  
  return {
    name: "Security",
    status: "pass",
    message: `Scanned ${sourceFiles.length} files`,
    duration,
  };
}

/**
 * Analyze bundle size
 */
export function checkBundleSize(rootDir: string, config: QualityGateConfig["bundleSize"]): GateCheckResult {
  if (!config.enabled) {
    return {
      name: "Bundle Size",
      status: "pass",
      message: "Skipped (disabled)",
    };
  }
  
  const start = Date.now();
  const packageJsonPath = join(rootDir, "package.json");
  
  if (!existsSync(packageJsonPath)) {
    return {
      name: "Bundle Size",
      status: "warn",
      message: "No package.json found",
    };
  }
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    const largeDeps: string[] = [];
    const nodeModulesPath = join(rootDir, "node_modules");
    
    for (const [name] of Object.entries(deps)) {
      const depPath = join(nodeModulesPath, name);
      
      if (existsSync(depPath)) {
        try {
          const size = getDirectorySize(depPath);
          const sizeKb = Math.round(size / 1024);
          
          if (sizeKb > config.maxPackageKb) {
            largeDeps.push(`${name}: ${sizeKb}KB (max: ${config.maxPackageKb}KB)`);
          } else if (sizeKb > config.warnThresholdKb) {
            largeDeps.push(`${name}: ${sizeKb}KB`);
          }
        } catch {
          // Skip packages we can't analyze
        }
      }
    }
    
    const duration = Date.now() - start;
    
    if (largeDeps.length > 0) {
      return {
        name: "Bundle Size",
        status: "warn",
        message: `${largeDeps.length} large package(s)`,
        details: largeDeps.slice(0, 10),
        duration,
      };
    }
    
    return {
      name: "Bundle Size",
      status: "pass",
      message: `${Object.keys(deps).length} dependencies checked`,
      duration,
    };
  } catch {
    return {
      name: "Bundle Size",
      status: "warn",
      message: "Could not analyze packages",
      duration: Date.now() - start,
    };
  }
}

function getDirectorySize(dirPath: string): number {
  let size = 0;
  
  try {
    const entries = readdirSync(dirPath);
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        size += getDirectorySize(fullPath);
      } else {
        size += stat.size;
      }
    }
  } catch {
    // Ignore errors
  }
  
  return size;
}

// ============================================================================
// MAIN QUALITY GATE FUNCTION
// ============================================================================

/**
 * Run all quality gate checks
 */
export function runQualityGate(
  rootDir: string,
  config: Partial<QualityGateConfig> = {},
): QualityGateResult {
  const fullConfig: QualityGateConfig = {
    ...DEFAULT_QUALITY_GATE_CONFIG,
    ...config,
    typescript: { ...DEFAULT_QUALITY_GATE_CONFIG.typescript, ...config.typescript },
    lint: { ...DEFAULT_QUALITY_GATE_CONFIG.lint, ...config.lint },
    coverage: { ...DEFAULT_QUALITY_GATE_CONFIG.coverage, ...config.coverage },
    security: { ...DEFAULT_QUALITY_GATE_CONFIG.security, ...config.security },
    bundleSize: { ...DEFAULT_QUALITY_GATE_CONFIG.bundleSize, ...config.bundleSize },
  };
  
  const startTime = Date.now();
  
  // Run all checks
  const results: GateCheckResult[] = [
    checkTypeScript(rootDir, fullConfig.typescript),
    checkLint(rootDir, fullConfig.lint),
    checkSecurity(rootDir, fullConfig.security),
    checkBundleSize(rootDir, fullConfig.bundleSize),
  ];
  
  // Coverage is slow, run last
  if (fullConfig.coverage.enabled) {
    results.push(checkCoverage(rootDir, fullConfig.coverage));
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Categorize results
  const blockers = results.filter(r => r.status === "fail");
  const warnings = results.filter(r => r.status === "warn");
  const passed = results.filter(r => r.status === "pass");
  
  // Determine overall status
  let overall: GateStatus = "pass";
  if (blockers.length > 0) {
    overall = "fail";
  } else if (warnings.length > 0) {
    overall = "warn";
  }
  
  // Generate summary
  let summary: string;
  if (overall === "pass") {
    summary = `✅ All ${results.length} quality checks passed`;
  } else if (overall === "warn") {
    summary = `⚠️ ${passed.length} passed, ${warnings.length} warning(s)`;
  } else {
    summary = `❌ ${blockers.length} blocker(s), ${warnings.length} warning(s)`;
  }
  
  return {
    timestamp: new Date().toISOString(),
    overall,
    blockers,
    warnings,
    passed,
    summary,
    totalDuration,
  };
}

/**
 * Format quality gate result for display
 */
export function formatQualityGateResult(result: QualityGateResult): string {
  const lines: string[] = [
    `# Quality Gate Results`,
    ``,
    `**Status:** ${result.overall === "pass" ? "✅ PASS" : result.overall === "warn" ? "⚠️ WARN" : "❌ FAIL"}`,
    `**Time:** ${result.timestamp}`,
    `**Duration:** ${(result.totalDuration / 1000).toFixed(1)}s`,
    ``,
    `## Summary`,
    ``,
    result.summary,
    ``,
  ];
  
  if (result.blockers.length > 0) {
    lines.push(`## ❌ Blockers (${result.blockers.length})`);
    lines.push(``);
    for (const check of result.blockers) {
      lines.push(`### ${check.name}`);
      lines.push(`- **Status:** FAIL`);
      lines.push(`- **Message:** ${check.message}`);
      if (check.duration) {
        lines.push(`- **Duration:** ${(check.duration / 1000).toFixed(1)}s`);
      }
      if (check.details && check.details.length > 0) {
        lines.push(`- **Details:**`);
        for (const detail of check.details) {
          lines.push(`  - ${detail}`);
        }
      }
      lines.push(``);
    }
  }
  
  if (result.warnings.length > 0) {
    lines.push(`## ⚠️ Warnings (${result.warnings.length})`);
    lines.push(``);
    for (const check of result.warnings) {
      lines.push(`### ${check.name}`);
      lines.push(`- **Status:** WARN`);
      lines.push(`- **Message:** ${check.message}`);
      if (check.duration) {
        lines.push(`- **Duration:** ${(check.duration / 1000).toFixed(1)}s`);
      }
      if (check.details && check.details.length > 0) {
        lines.push(`- **Details:**`);
        for (const detail of check.details.slice(0, 5)) {
          lines.push(`  - ${detail}`);
        }
        if (check.details.length > 5) {
          lines.push(`  - ... and ${check.details.length - 5} more`);
        }
      }
      lines.push(``);
    }
  }
  
  if (result.passed.length > 0) {
    lines.push(`## ✅ Passed (${result.passed.length})`);
    lines.push(``);
    for (const check of result.passed) {
      lines.push(`- **${check.name}:** ${check.message}${check.duration ? ` (${(check.duration / 1000).toFixed(1)}s)` : ""}`);
    }
  }
  
  return lines.join("\n");
}

/**
 * Quick check for pre-commit hook (faster, essential checks only)
 */
export function runQuickCheck(rootDir: string): QualityGateResult {
  return runQualityGate(rootDir, {
    typescript: { enabled: true, strict: false },
    lint: { enabled: true, autoFix: false },
    coverage: { enabled: false, minPercent: 0 },
    security: { enabled: true, checkSecrets: true, checkVulnerabilities: false },
    bundleSize: { enabled: false, warnThresholdKb: 0, maxPackageKb: 0 },
  });
}
