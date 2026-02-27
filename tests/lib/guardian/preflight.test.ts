/**
 * Tests for Preflight module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  runPreflightChecks,
  autoFixWorktree,
  formatPreflightResult,
  type PreflightCheck,
  type PreflightResult,
} from "../../../src/lib/guardian/preflight";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Mock child_process
vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

import { existsSync, readdirSync } from "fs";
import { execSync } from "child_process";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReaddirSync = readdirSync as ReturnType<typeof vi.fn>;
const mockExecSync = execSync as ReturnType<typeof vi.fn>;

describe("Preflight", () => {
  const worktreePath = "/test/worktree";
  const worktreeId = "worktree-123";

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(["hook1.sh", "hook2.sh"]);
    mockExecSync.mockReturnValue("");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("runPreflightChecks", () => {
    it("should pass all checks when worktree is properly configured", () => {
      const result = runPreflightChecks(worktreePath, worktreeId);

      expect(result.passed).toBe(true);
      expect(result.worktreeId).toBe(worktreeId);
      expect(result.worktreePath).toBe(worktreePath);
      expect(result.timestamp).toBeTruthy();
      expect(result.checks).toHaveLength(7);
      expect(result.checks.every(c => c.status === "pass")).toBe(true);
    });

    it("should check for .claude directory", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return !path.includes(".claude");
      });

      const result = runPreflightChecks(worktreePath, worktreeId);

      const claudeCheck = result.checks.find(c => c.name === "Claude Config");
      expect(claudeCheck?.status).toBe("fail");
      expect(claudeCheck?.message).toContain(".claude/ directory missing");
      expect(claudeCheck?.fix).toContain("Copy .claude/");
      expect(result.passed).toBe(false);
    });

    it("should pass Claude Config check when .claude exists", () => {
      const result = runPreflightChecks(worktreePath, worktreeId);

      const claudeCheck = result.checks.find(c => c.name === "Claude Config");
      expect(claudeCheck?.status).toBe("pass");
      expect(claudeCheck?.message).toContain(".claude/ directory exists");
    });

    it("should check for hooks directory", () => {
      mockReaddirSync.mockReturnValue([]);

      const result = runPreflightChecks(worktreePath, worktreeId);

      const hooksCheck = result.checks.find(c => c.name === "Hooks");
      expect(hooksCheck?.status).toBe("warn");
      expect(hooksCheck?.message).toContain("No hooks found");
      expect(hooksCheck?.fix).toBeTruthy();
    });

    it("should pass when hooks are present", () => {
      mockReaddirSync.mockReturnValue(["pre-commit", "post-commit"]);

      const result = runPreflightChecks(worktreePath, worktreeId);

      const hooksCheck = result.checks.find(c => c.name === "Hooks");
      expect(hooksCheck?.status).toBe("pass");
      expect(hooksCheck?.message).toContain("Hooks directory populated");
    });

    it("should check for node_modules", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return !path.includes("node_modules");
      });

      const result = runPreflightChecks(worktreePath, worktreeId);

      const depsCheck = result.checks.find(c => c.name === "Dependencies");
      expect(depsCheck?.status).toBe("fail");
      expect(depsCheck?.message).toContain("node_modules missing");
      expect(depsCheck?.fix).toContain("npm install");
      expect(result.passed).toBe(false);
    });

    it("should pass when node_modules exists", () => {
      const result = runPreflightChecks(worktreePath, worktreeId);

      const depsCheck = result.checks.find(c => c.name === "Dependencies");
      expect(depsCheck?.status).toBe("pass");
    });

    it("should check for environment files", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return !path.includes(".env");
      });

      const result = runPreflightChecks(worktreePath, worktreeId);

      const envCheck = result.checks.find(c => c.name === "Environment");
      expect(envCheck?.status).toBe("warn");
      expect(envCheck?.message).toContain("No .env file found");
      expect(envCheck?.fix).toBeTruthy();
    });

    it("should pass when .env exists", () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes(".env") && !path.includes(".env.local")) return true;
        return true;
      });

      const result = runPreflightChecks(worktreePath, worktreeId);

      const envCheck = result.checks.find(c => c.name === "Environment");
      expect(envCheck?.status).toBe("pass");
    });

    it("should pass when .env.local exists", () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes(".env.local")) return true;
        if (path.includes(".env")) return false;
        return true;
      });

      const result = runPreflightChecks(worktreePath, worktreeId);

      const envCheck = result.checks.find(c => c.name === "Environment");
      expect(envCheck?.status).toBe("pass");
    });

    it("should check TypeScript compilation", () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes("tsc")) {
          throw new Error("TypeScript errors");
        }
        return "";
      });

      const result = runPreflightChecks(worktreePath, worktreeId);

      const tsCheck = result.checks.find(c => c.name === "TypeScript");
      expect(tsCheck?.status).toBe("warn");
      expect(tsCheck?.message).toContain("TypeScript has errors");
    });

    it("should pass when TypeScript compiles", () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes("tsc")) return "";
        return "";
      });

      const result = runPreflightChecks(worktreePath, worktreeId);

      const tsCheck = result.checks.find(c => c.name === "TypeScript");
      expect(tsCheck?.status).toBe("pass");
      expect(tsCheck?.message).toContain("TypeScript compiles");
    });

    it("should check Prisma client generation", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return !path.includes("generated/prisma");
      });

      const result = runPreflightChecks(worktreePath, worktreeId);

      const prismaCheck = result.checks.find(c => c.name === "Prisma Client");
      expect(prismaCheck?.status).toBe("fail");
      expect(prismaCheck?.message).toContain("Prisma client not generated");
      expect(prismaCheck?.fix).toContain("db:generate");
      expect(result.passed).toBe(false);
    });

    it("should pass when Prisma client exists", () => {
      const result = runPreflightChecks(worktreePath, worktreeId);

      const prismaCheck = result.checks.find(c => c.name === "Prisma Client");
      expect(prismaCheck?.status).toBe("pass");
    });

    it("should check memory directory", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return !path.includes("memory");
      });

      const result = runPreflightChecks(worktreePath, worktreeId);

      const memoryCheck = result.checks.find(c => c.name === "Memory Dir");
      expect(memoryCheck?.status).toBe("warn");
      expect(memoryCheck?.message).toContain("memory/ directory missing");
      expect(memoryCheck?.fix).toContain("Will be created on first use");
    });

    it("should pass when memory directory exists", () => {
      const result = runPreflightChecks(worktreePath, worktreeId);

      const memoryCheck = result.checks.find(c => c.name === "Memory Dir");
      expect(memoryCheck?.status).toBe("pass");
    });

    it("should mark as not passed if any check fails", () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes("node_modules")) return false;
        return true;
      });

      const result = runPreflightChecks(worktreePath, worktreeId);

      expect(result.passed).toBe(false);
    });

    it("should pass even with warnings", () => {
      mockReaddirSync.mockReturnValue([]); // No hooks (warning)

      const result = runPreflightChecks(worktreePath, worktreeId);

      expect(result.passed).toBe(true); // Warnings don't fail
      const hooksCheck = result.checks.find(c => c.name === "Hooks");
      expect(hooksCheck?.status).toBe("warn");
    });

    it("should include timestamp", () => {
      const before = new Date().getTime();
      const result = runPreflightChecks(worktreePath, worktreeId);
      const after = new Date().getTime();

      const timestamp = new Date(result.timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before - 100); // Allow 100ms tolerance
      expect(timestamp).toBeLessThanOrEqual(after + 100);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("autoFixWorktree", () => {
    it("should install dependencies if missing", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return !path.includes("node_modules");
      });
      mockExecSync.mockReturnValue("");

      const fixes = autoFixWorktree(worktreePath);

      expect(fixes).toContain("Installed npm dependencies");
      expect(mockExecSync).toHaveBeenCalledWith(
        "npm install",
        expect.objectContaining({ cwd: worktreePath })
      );
    });

    it("should skip installing if dependencies exist", () => {
      mockExistsSync.mockReturnValue(true);

      const fixes = autoFixWorktree(worktreePath);

      expect(fixes).not.toContain("Installed npm dependencies");
      expect(mockExecSync).not.toHaveBeenCalledWith(
        "npm install",
        expect.any(Object)
      );
    });

    it("should handle npm install failure", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return !path.includes("node_modules");
      });
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === "npm install") {
          throw new Error("Install failed");
        }
        return "";
      });

      const fixes = autoFixWorktree(worktreePath);

      expect(fixes).toContain("Failed to install dependencies");
    });

    it("should generate Prisma client if missing", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return !path.includes("generated/prisma");
      });
      mockExecSync.mockReturnValue("");

      const fixes = autoFixWorktree(worktreePath);

      expect(fixes).toContain("Generated Prisma client");
      expect(mockExecSync).toHaveBeenCalledWith(
        "npm run db:generate",
        expect.objectContaining({ cwd: worktreePath })
      );
    });

    it("should skip generating Prisma client if exists", () => {
      mockExistsSync.mockReturnValue(true);

      const fixes = autoFixWorktree(worktreePath);

      expect(fixes).not.toContain("Generated Prisma client");
    });

    it("should handle Prisma generation failure", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return !path.includes("generated/prisma");
      });
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === "npm run db:generate") {
          throw new Error("Generation failed");
        }
        return "";
      });

      const fixes = autoFixWorktree(worktreePath);

      expect(fixes).toContain("Failed to generate Prisma client");
    });

    it("should apply multiple fixes", () => {
      mockExistsSync.mockReturnValue(false); // Both missing
      mockExecSync.mockReturnValue("");

      const fixes = autoFixWorktree(worktreePath);

      expect(fixes).toHaveLength(2);
      expect(fixes).toContain("Installed npm dependencies");
      expect(fixes).toContain("Generated Prisma client");
    });

    it("should return empty array if nothing to fix", () => {
      mockExistsSync.mockReturnValue(true); // Everything exists

      const fixes = autoFixWorktree(worktreePath);

      expect(fixes).toEqual([]);
    });
  });

  describe("formatPreflightResult", () => {
    it("should format passing result", () => {
      const result: PreflightResult = {
        worktreeId: "worktree-123",
        worktreePath: "/test/path",
        passed: true,
        checks: [
          { name: "Check 1", status: "pass", message: "All good" },
          { name: "Check 2", status: "pass", message: "OK" },
        ],
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      const output = formatPreflightResult(result);

      expect(output).toContain("worktree-123");
      expect(output).toContain("/test/path");
      expect(output).toContain("✅ READY");
      expect(output).toContain("Check 1");
      expect(output).toContain("All good");
      expect(output).toContain("✅");
    });

    it("should format failing result", () => {
      const result: PreflightResult = {
        worktreeId: "worktree-123",
        worktreePath: "/test/path",
        passed: false,
        checks: [
          { name: "Check 1", status: "fail", message: "Failed", fix: "Run fix command" },
          { name: "Check 2", status: "pass", message: "OK" },
        ],
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      const output = formatPreflightResult(result);

      expect(output).toContain("❌ NOT READY");
      expect(output).toContain("Check 1");
      expect(output).toContain("Failed");
      expect(output).toContain("Fix: Run fix command");
      expect(output).toContain("❌");
    });

    it("should show warnings", () => {
      const result: PreflightResult = {
        worktreeId: "worktree-123",
        worktreePath: "/test/path",
        passed: true,
        checks: [
          { name: "Check 1", status: "warn", message: "Warning", fix: "Optional fix" },
        ],
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      const output = formatPreflightResult(result);

      expect(output).toContain("⚠️");
      expect(output).toContain("Warning");
      expect(output).toContain("Fix: Optional fix");
    });

    it("should omit fix when not present", () => {
      const result: PreflightResult = {
        worktreeId: "worktree-123",
        worktreePath: "/test/path",
        passed: true,
        checks: [
          { name: "Check 1", status: "pass", message: "OK" },
        ],
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      const output = formatPreflightResult(result);

      expect(output).not.toContain("Fix:");
    });

    it("should format multiple checks with different statuses", () => {
      const result: PreflightResult = {
        worktreeId: "worktree-123",
        worktreePath: "/test/path",
        passed: false,
        checks: [
          { name: "Check 1", status: "pass", message: "Pass" },
          { name: "Check 2", status: "warn", message: "Warn", fix: "Fix warn" },
          { name: "Check 3", status: "fail", message: "Fail", fix: "Fix fail" },
        ],
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      const output = formatPreflightResult(result);

      expect(output).toContain("✅ Check 1");
      expect(output).toContain("⚠️ Check 2");
      expect(output).toContain("❌ Check 3");
      expect(output).toContain("Fix: Fix warn");
      expect(output).toContain("Fix: Fix fail");
    });
  });
});
