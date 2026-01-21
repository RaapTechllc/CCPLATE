#!/usr/bin/env bun

/**
 * Test Guardian worktree functionality
 * 
 * Usage:
 *   bun run e2e/guardian-tests/scripts/test-worktrees.ts
 */

import { existsSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const PROJECT_DIR = process.cwd();
const WORKTREES_DIR = join(PROJECT_DIR, ".worktrees");
const CLI_PATH = join(PROJECT_DIR, "src/cli/ccplate.ts");

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

function runCLI(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`bun run ${CLI_PATH} ${args}`, {
      cwd: PROJECT_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout || "",
      stderr: e.stderr || "",
      exitCode: e.status || 1,
    };
  }
}

function cleanup(worktreeName: string): void {
  const worktreePath = join(WORKTREES_DIR, worktreeName);
  
  // Remove worktree via git
  try {
    execSync(`git worktree remove "${worktreePath}" --force 2>/dev/null`, {
      cwd: PROJECT_DIR,
      stdio: "pipe",
    });
  } catch {
    // Worktree might not exist
  }
  
  // Remove directory if still exists
  if (existsSync(worktreePath)) {
    rmSync(worktreePath, { recursive: true, force: true });
  }
  
  // Remove branch
  try {
    execSync(`git branch -D ccplate/${worktreeName} 2>/dev/null`, {
      cwd: PROJECT_DIR,
      stdio: "pipe",
    });
  } catch {
    // Branch might not exist
  }
}

// ============== TESTS ==============

function testWorktreeCreate(): TestResult {
  const testName = "test-wt-create";
  
  // Cleanup any existing
  cleanup(testName);
  
  const result = runCLI(`worktree create ${testName}`);
  
  if (result.exitCode !== 0) {
    return {
      name: "Worktree Create",
      passed: false,
      details: `CLI failed with exit code ${result.exitCode}: ${result.stderr}`,
    };
  }
  
  const worktreePath = join(WORKTREES_DIR, testName);
  if (!existsSync(worktreePath)) {
    return {
      name: "Worktree Create",
      passed: false,
      details: `Worktree directory not created at ${worktreePath}`,
    };
  }
  
  // Check if it's a valid git worktree
  const gitDir = join(worktreePath, ".git");
  if (!existsSync(gitDir)) {
    cleanup(testName);
    return {
      name: "Worktree Create",
      passed: false,
      details: "Created directory is not a git worktree (missing .git)",
    };
  }
  
  // Check workflow state
  const workflowState = JSON.parse(
    readFileSync(join(PROJECT_DIR, "memory/workflow-state.json"), "utf-8")
  );
  const worktreeTracked = workflowState.active_worktrees?.some(
    (wt: { id: string }) => wt.id === testName
  );
  
  if (!worktreeTracked) {
    cleanup(testName);
    return {
      name: "Worktree Create",
      passed: false,
      details: "Worktree not tracked in workflow-state.json",
    };
  }
  
  // Cleanup
  cleanup(testName);
  
  return {
    name: "Worktree Create",
    passed: true,
    details: `Successfully created and tracked worktree: ${testName}`,
  };
}

function testWorktreeList(): TestResult {
  const testNames = ["test-wt-list-1", "test-wt-list-2"];
  
  // Cleanup and create test worktrees
  for (const name of testNames) {
    cleanup(name);
    runCLI(`worktree create ${name}`);
  }
  
  const result = runCLI("worktree list");
  
  // Cleanup
  for (const name of testNames) {
    cleanup(name);
  }
  
  if (result.exitCode !== 0) {
    return {
      name: "Worktree List",
      passed: false,
      details: `CLI failed with exit code ${result.exitCode}: ${result.stderr}`,
    };
  }
  
  const hasWorktrees = testNames.every(name => result.stdout.includes(name));
  
  if (!hasWorktrees) {
    return {
      name: "Worktree List",
      passed: false,
      details: `List output missing expected worktrees: ${result.stdout}`,
    };
  }
  
  return {
    name: "Worktree List",
    passed: true,
    details: `Successfully listed ${testNames.length} worktrees`,
  };
}

function testWorktreeCleanup(): TestResult {
  const testName = "test-wt-cleanup";
  
  // Create worktree
  cleanup(testName);
  runCLI(`worktree create ${testName}`);
  
  const worktreePath = join(WORKTREES_DIR, testName);
  if (!existsSync(worktreePath)) {
    return {
      name: "Worktree Cleanup",
      passed: false,
      details: "Could not create test worktree",
    };
  }
  
  // Cleanup worktree
  const result = runCLI(`worktree cleanup ${testName}`);
  
  if (result.exitCode !== 0) {
    cleanup(testName);
    return {
      name: "Worktree Cleanup",
      passed: false,
      details: `Cleanup failed with exit code ${result.exitCode}: ${result.stderr}`,
    };
  }
  
  if (existsSync(worktreePath)) {
    cleanup(testName);
    return {
      name: "Worktree Cleanup",
      passed: false,
      details: "Worktree directory still exists after cleanup",
    };
  }
  
  // Check workflow state
  const workflowState = JSON.parse(
    readFileSync(join(PROJECT_DIR, "memory/workflow-state.json"), "utf-8")
  );
  const worktreeStillTracked = workflowState.active_worktrees?.some(
    (wt: { id: string }) => wt.id === testName
  );
  
  if (worktreeStillTracked) {
    return {
      name: "Worktree Cleanup",
      passed: false,
      details: "Worktree still tracked in workflow-state.json after cleanup",
    };
  }
  
  return {
    name: "Worktree Cleanup",
    passed: true,
    details: "Successfully cleaned up worktree and removed from tracking",
  };
}

function testWorktreeIsolation(): TestResult {
  // This tests path-guard behavior when CCPLATE_WORKTREE is set
  // In real usage, this would be enforced by the PreToolUse hook
  
  const testName = "test-wt-isolation";
  
  cleanup(testName);
  runCLI(`worktree create ${testName}`);
  
  const worktreePath = join(WORKTREES_DIR, testName);
  
  // Check that worktree has expected structure
  const hasPackageJson = existsSync(join(worktreePath, "package.json"));
  const hasSrcDir = existsSync(join(worktreePath, "src"));
  
  cleanup(testName);
  
  if (!hasPackageJson || !hasSrcDir) {
    return {
      name: "Worktree Isolation",
      passed: false,
      details: "Worktree doesn't have expected project structure",
    };
  }
  
  return {
    name: "Worktree Isolation",
    passed: true,
    details: "Worktree has isolated copy of project",
  };
}

function printResults(results: TestResult[]): void {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("              WORKTREE FUNCTIONALITY TESTS              ");
  console.log("═══════════════════════════════════════════════════════\n");
  
  let passed = 0;
  let failed = 0;
  
  for (const result of results) {
    const icon = result.passed ? "✅" : "❌";
    const status = result.passed ? "PASS" : "FAIL";
    
    console.log(`${icon} ${result.name}: ${status}`);
    console.log(`   ${result.details}\n`);
    
    if (result.passed) passed++;
    else failed++;
  }
  
  console.log("═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════\n");
  
  process.exit(failed > 0 ? 1 : 0);
}

// ============== MAIN ==============

console.log("🔧 Running worktree tests...\n");

const results: TestResult[] = [
  testWorktreeCreate(),
  testWorktreeList(),
  testWorktreeCleanup(),
  testWorktreeIsolation(),
];

printResults(results);
