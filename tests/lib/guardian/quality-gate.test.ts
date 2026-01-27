/**
 * Tests for Quality Gate module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkTypeScript,
  checkLint,
  checkSecurity,
  checkBundleSize,
  runQualityGate,
  runQuickCheck,
  formatQualityGateResult,
  DEFAULT_QUALITY_GATE_CONFIG,
  SECRET_PATTERNS,
  VULNERABILITY_PATTERNS,
  type QualityGateResult,
  type GateCheckResult,
} from "../../../src/lib/guardian/quality-gate";

// Mock child_process
vi.mock("child_process", () => ({
  spawnSync: vi.fn(() => ({
    status: 0,
    stdout: Buffer.from(""),
    stderr: Buffer.from(""),
  })),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ""),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(() => ({ isDirectory: () => false, size: 1000 })),
}));

import { spawnSync } from "child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";

const mockSpawnSync = spawnSync as ReturnType<typeof vi.fn>;
const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockReaddirSync = readdirSync as ReturnType<typeof vi.fn>;
const mockStatSync = statSync as ReturnType<typeof vi.fn>;

describe("Quality Gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("DEFAULT_QUALITY_GATE_CONFIG", () => {
    it("should have all required sections", () => {
      expect(DEFAULT_QUALITY_GATE_CONFIG).toHaveProperty("typescript");
      expect(DEFAULT_QUALITY_GATE_CONFIG).toHaveProperty("lint");
      expect(DEFAULT_QUALITY_GATE_CONFIG).toHaveProperty("coverage");
      expect(DEFAULT_QUALITY_GATE_CONFIG).toHaveProperty("security");
      expect(DEFAULT_QUALITY_GATE_CONFIG).toHaveProperty("bundleSize");
    });

    it("should have reasonable default values", () => {
      expect(DEFAULT_QUALITY_GATE_CONFIG.typescript.enabled).toBe(true);
      expect(DEFAULT_QUALITY_GATE_CONFIG.lint.autoFix).toBe(true);
      expect(DEFAULT_QUALITY_GATE_CONFIG.coverage.minPercent).toBeGreaterThan(0);
      expect(DEFAULT_QUALITY_GATE_CONFIG.security.checkSecrets).toBe(true);
    });
  });

  describe("SECRET_PATTERNS", () => {
    it("should detect AWS access keys", () => {
      const pattern = SECRET_PATTERNS.find(p => p.name === "AWS Access Key");
      expect(pattern).toBeDefined();
      expect(pattern!.pattern.test("AKIAIOSFODNN7EXAMPLE")).toBe(true);
    });

    it("should detect GitHub tokens", () => {
      const pattern = SECRET_PATTERNS.find(p => p.name === "GitHub Token");
      expect(pattern).toBeDefined();
      expect(pattern!.pattern.test("ghp_1234567890abcdefghijklmnopqrstuvwxyz123456")).toBe(true);
    });

    it("should detect OpenAI API keys", () => {
      const pattern = SECRET_PATTERNS.find(p => p.name === "OpenAI API Key");
      expect(pattern).toBeDefined();
      expect(pattern!.pattern.test("sk-" + "a".repeat(48))).toBe(true);
    });

    it("should detect private keys", () => {
      const pattern = SECRET_PATTERNS.find(p => p.name === "Private Key");
      expect(pattern).toBeDefined();
      // Need to reset the regex lastIndex for global patterns
      pattern!.pattern.lastIndex = 0;
      expect(pattern!.pattern.test("-----BEGIN RSA PRIVATE KEY-----")).toBe(true);
      pattern!.pattern.lastIndex = 0;
      expect(pattern!.pattern.test("-----BEGIN PRIVATE KEY-----")).toBe(true);
    });

    it("should have severity levels for all patterns", () => {
      for (const pattern of SECRET_PATTERNS) {
        expect(["high", "medium", "low"]).toContain(pattern.severity);
      }
    });
  });

  describe("VULNERABILITY_PATTERNS", () => {
    it("should detect eval usage", () => {
      const pattern = VULNERABILITY_PATTERNS.find(p => p.name === "Eval Usage");
      expect(pattern).toBeDefined();
      expect(pattern!.pattern.test("eval(userInput)")).toBe(true);
    });

    it("should detect innerHTML usage", () => {
      const pattern = VULNERABILITY_PATTERNS.find(p => p.name === "innerHTML Usage");
      expect(pattern).toBeDefined();
      expect(pattern!.pattern.test("element.innerHTML = data")).toBe(true);
    });

    it("should detect dangerouslySetInnerHTML", () => {
      const pattern = VULNERABILITY_PATTERNS.find(p => p.name === "dangerouslySetInnerHTML");
      expect(pattern).toBeDefined();
      expect(pattern!.pattern.test("dangerouslySetInnerHTML={{ __html: data }}")).toBe(true);
    });
  });

  describe("checkTypeScript", () => {
    it("should return pass when disabled", () => {
      const result = checkTypeScript("/test", { enabled: false, strict: false });
      expect(result.status).toBe("pass");
      expect(result.message).toContain("Skipped");
    });

    it("should return pass when tsc succeeds", () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
      });

      const result = checkTypeScript("/test", { enabled: true, strict: true });
      expect(result.status).toBe("pass");
      expect(result.message).toBe("No type errors");
    });

    it("should return fail when tsc has errors", () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 1,
        stdout: Buffer.from("src/test.ts(5,10): error TS2322: Type 'string' is not assignable to type 'number'."),
        stderr: Buffer.from(""),
      });

      const result = checkTypeScript("/test", { enabled: true, strict: true });
      expect(result.status).toBe("fail");
      expect(result.message).toContain("type error");
    });
  });

  describe("checkLint", () => {
    it("should return pass when disabled", () => {
      const result = checkLint("/test", { enabled: false, autoFix: false });
      expect(result.status).toBe("pass");
      expect(result.message).toContain("Skipped");
    });

    it("should return pass when no issues", () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: Buffer.from("[]"),
        stderr: Buffer.from(""),
      });

      const result = checkLint("/test", { enabled: true, autoFix: true });
      expect(result.status).toBe("pass");
      expect(result.message).toBe("No issues");
    });

    it("should return fail when errors found", () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 1,
        stdout: Buffer.from(JSON.stringify([{ errorCount: 5, warningCount: 2 }])),
        stderr: Buffer.from(""),
      });

      const result = checkLint("/test", { enabled: true, autoFix: true });
      expect(result.status).toBe("fail");
      expect(result.message).toContain("5 error");
    });

    it("should return warn when only warnings", () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: Buffer.from(JSON.stringify([{ errorCount: 0, warningCount: 3 }])),
        stderr: Buffer.from(""),
      });

      const result = checkLint("/test", { enabled: true, autoFix: true });
      expect(result.status).toBe("warn");
      expect(result.message).toContain("3 warning");
    });
  });

  describe("checkSecurity", () => {
    it("should return pass when disabled", () => {
      const result = checkSecurity("/test", {
        enabled: false,
        checkSecrets: false,
        checkVulnerabilities: false,
      });
      expect(result.status).toBe("pass");
      expect(result.message).toContain("Skipped");
    });

    it("should return pass when no issues found", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test.ts"]);
      mockStatSync.mockReturnValue({ isDirectory: () => false, size: 100 });
      mockReadFileSync.mockReturnValue("const x = 1;");

      const result = checkSecurity("/test", {
        enabled: true,
        checkSecrets: true,
        checkVulnerabilities: true,
      });
      expect(result.status).toBe("pass");
    });

    it("should detect secrets in files", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test.ts"]);
      mockStatSync.mockReturnValue({ isDirectory: () => false, size: 100 });
      mockReadFileSync.mockReturnValue("const key = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz123456';");

      const result = checkSecurity("/test", {
        enabled: true,
        checkSecrets: true,
        checkVulnerabilities: false,
      });
      expect(result.status).toBe("fail");
      expect(result.message).toContain("security issue");
    });

    it("should detect vulnerabilities", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test.ts"]);
      mockStatSync.mockReturnValue({ isDirectory: () => false, size: 100 });
      mockReadFileSync.mockReturnValue("element.innerHTML = userInput;");

      const result = checkSecurity("/test", {
        enabled: true,
        checkSecrets: false,
        checkVulnerabilities: true,
      });
      expect(result.status).toBe("warn");
      expect(result.message).toContain("potential issue");
    });
  });

  describe("checkBundleSize", () => {
    it("should return pass when disabled", () => {
      const result = checkBundleSize("/test", {
        enabled: false,
        warnThresholdKb: 0,
        maxPackageKb: 0,
      });
      expect(result.status).toBe("pass");
      expect(result.message).toContain("Skipped");
    });

    it("should return warn when no package.json", () => {
      mockExistsSync.mockReturnValue(false);

      const result = checkBundleSize("/test", {
        enabled: true,
        warnThresholdKb: 500,
        maxPackageKb: 2000,
      });
      expect(result.status).toBe("warn");
      expect(result.message).toContain("No package.json");
    });

    it("should check package sizes", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes("package.json") || path.includes("node_modules");
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { "test-package": "1.0.0" },
      }));
      mockReaddirSync.mockReturnValue(["file.js"]);
      mockStatSync.mockReturnValue({ isDirectory: () => false, size: 100 });

      const result = checkBundleSize("/test", {
        enabled: true,
        warnThresholdKb: 500,
        maxPackageKb: 2000,
      });
      expect(result.status).toBe("pass");
    });
  });

  describe("runQualityGate", () => {
    beforeEach(() => {
      // Reset all mocks for clean state
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from("[]"),
        stderr: Buffer.from(""),
      });
      mockExistsSync.mockReturnValue(false);
    });

    it("should run all enabled checks", () => {
      const result = runQualityGate("/test", {
        typescript: { enabled: true, strict: false },
        lint: { enabled: true, autoFix: false },
        coverage: { enabled: false, minPercent: 0 },
        security: { enabled: true, checkSecrets: false, checkVulnerabilities: false },
        bundleSize: { enabled: false, warnThresholdKb: 0, maxPackageKb: 0 },
      });

      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("overall");
      expect(result).toHaveProperty("blockers");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("totalDuration");
    });

    it("should set overall to pass when all checks pass", () => {
      const result = runQualityGate("/test", {
        typescript: { enabled: false, strict: false },
        lint: { enabled: false, autoFix: false },
        coverage: { enabled: false, minPercent: 0 },
        security: { enabled: false, checkSecrets: false, checkVulnerabilities: false },
        bundleSize: { enabled: false, warnThresholdKb: 0, maxPackageKb: 0 },
      });

      expect(result.overall).toBe("pass");
      expect(result.blockers).toHaveLength(0);
    });

    it("should set overall to fail when blockers exist", () => {
      mockSpawnSync.mockReturnValueOnce({
        status: 1,
        stdout: Buffer.from("error TS2322: Type error"),
        stderr: Buffer.from(""),
      });

      const result = runQualityGate("/test", {
        typescript: { enabled: true, strict: false },
        lint: { enabled: false, autoFix: false },
        coverage: { enabled: false, minPercent: 0 },
        security: { enabled: false, checkSecrets: false, checkVulnerabilities: false },
        bundleSize: { enabled: false, warnThresholdKb: 0, maxPackageKb: 0 },
      });

      expect(result.overall).toBe("fail");
      expect(result.blockers.length).toBeGreaterThan(0);
    });
  });

  describe("runQuickCheck", () => {
    it("should run essential checks only", () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from("[]"),
        stderr: Buffer.from(""),
      });
      mockExistsSync.mockReturnValue(false);

      const result = runQuickCheck("/test");
      expect(result).toHaveProperty("overall");
      // Quick check disables coverage, so it won't appear in results at all
      // (coverage.enabled is false, so checkCoverage isn't called)
      expect(result.blockers.some(p => p.name === "Coverage")).toBe(false);
      expect(result.warnings.some(p => p.name === "Coverage")).toBe(false);
    });
  });

  describe("formatQualityGateResult", () => {
    it("should format pass result", () => {
      const result: QualityGateResult = {
        timestamp: "2026-01-26T12:00:00.000Z",
        overall: "pass",
        blockers: [],
        warnings: [],
        passed: [
          { name: "TypeScript", status: "pass", message: "No errors", duration: 1000 },
        ],
        summary: "All checks passed",
        totalDuration: 1000,
      };

      const formatted = formatQualityGateResult(result);
      expect(formatted).toContain("✅ PASS");
      expect(formatted).toContain("TypeScript");
      expect(formatted).toContain("No errors");
    });

    it("should format fail result with blockers", () => {
      const result: QualityGateResult = {
        timestamp: "2026-01-26T12:00:00.000Z",
        overall: "fail",
        blockers: [
          { name: "TypeScript", status: "fail", message: "5 errors", details: ["error 1", "error 2"] },
        ],
        warnings: [],
        passed: [],
        summary: "1 blocker",
        totalDuration: 1000,
      };

      const formatted = formatQualityGateResult(result);
      expect(formatted).toContain("❌ FAIL");
      expect(formatted).toContain("Blockers");
      expect(formatted).toContain("5 errors");
      expect(formatted).toContain("error 1");
    });

    it("should format warn result", () => {
      const result: QualityGateResult = {
        timestamp: "2026-01-26T12:00:00.000Z",
        overall: "warn",
        blockers: [],
        warnings: [
          { name: "Lint", status: "warn", message: "3 warnings" },
        ],
        passed: [
          { name: "TypeScript", status: "pass", message: "No errors" },
        ],
        summary: "1 warning",
        totalDuration: 1000,
      };

      const formatted = formatQualityGateResult(result);
      expect(formatted).toContain("⚠️ WARN");
      expect(formatted).toContain("Warnings");
      expect(formatted).toContain("3 warnings");
    });

    it("should truncate long detail lists", () => {
      const result: QualityGateResult = {
        timestamp: "2026-01-26T12:00:00.000Z",
        overall: "warn",
        blockers: [],
        warnings: [
          {
            name: "Security",
            status: "warn",
            message: "10 issues",
            details: Array(10).fill(0).map((_, i) => `issue ${i + 1}`),
          },
        ],
        passed: [],
        summary: "10 warnings",
        totalDuration: 1000,
      };

      const formatted = formatQualityGateResult(result);
      expect(formatted).toContain("issue 1");
      expect(formatted).toContain("issue 5");
      expect(formatted).toContain("... and 5 more");
    });
  });
});
