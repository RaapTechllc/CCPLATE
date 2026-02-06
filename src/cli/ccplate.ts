#!/usr/bin/env bun

import { spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { createLSPClient } from "../lsp/sidecar";
import { validateSafeIdentifier } from "../lib/guardian/security";
import { getAllJobs, getJob } from "../lib/guardian/job-queue";
import { processQueue } from "../lib/guardian/job-executor";
import { 
  getPendingHITLRequests, 
  getHITLRequest, 
  resolveHITLRequest,
} from "../lib/guardian/hitl";
import { 
  broadcast, 
  getKnowledge, 
  formatKnowledgeForPrompt,
  type KnowledgeType 
} from "../lib/guardian/knowledge-mesh";
import { runPreflightChecks, autoFixWorktree, formatPreflightResult } from "../lib/guardian/preflight";
import { acquireSchemaLock, releaseSchemaLock, getSchemaLockStatus } from "../lib/guardian/schema-lock";
import { 
  runInteractiveInterview, 
  savePRD, 
  loadPRD, 
  updateWorkflowStateWithPRD,
} from "../lib/guardian/prd";
import {
  runTierAwareInterview,
  type TierInterviewResult,
} from "../lib/guardian/tier-interview";
import {
  captureHITLCheckpoint,
  formatCheckpointSummary,
} from "../lib/guardian/hitl-capture";
import type { PhaseDefinition } from "../lib/guardian/tiers/beginner";
import {
  startHarnessRun,
  pickVariant,
  cleanupHarness,
  showHarnessStatus,
  getHarnessRun,
  saveHarnessReport,
} from "../lib/guardian/harness";
import {
  runPlaywrightTests,
  registerTaskTests,
  checkTaskCanComplete,
  formatValidationStatus,
  startFixLoop,
  endFixLoop,
  getFixLoopContext,
  updateValidationFromTestRun,
} from "../lib/guardian/playwright-validation";
import {
  narrateTaskStart,
  narrateTaskComplete,
  incrementLoop,
  getCurrentLoop,
  clearActivityLog,
} from "../lib/guardian/activity-narrator";
import {
  recordMerge,
  getMergeHistory,
  rollbackMerge,
  formatMergeHistory,
} from "../lib/guardian/merge-ledger";
import {
  getAuditEntries,
  formatAuditEntries,
  type AuditCategory,
} from "../lib/guardian/audit-log";
import {
  analyzeIssue,
  checkParallelSafety,
  formatParallelCheckResult,
  type IssueAnalysis,
} from "../lib/guardian/labeling";
import {
  parseLogEntries,
  formatLogEntries,
  type LogLevel,
} from "../lib/guardian/logger";
import {
  getConflictedFiles,
  analyzeConflict,
  resolveConflicts,
  formatConflictAnalysis,
} from "../lib/guardian/merge-resolver";
import {
  getProfiles,
  getProfile,
  getActiveProfile,
  activateProfile,
  restoreMCPConfig,
  formatProfileList,
  getConfiguredServers,
} from "../lib/guardian/stack-profiles";
import {
  createHandoff,
  hasHandoff,
  loadHandoff,
  clearHandoff,
  formatHandoff,
} from "../lib/guardian/handoff";
import {
  deployToVercel,
  getDeploymentStatus,
  listDeployments,
  validateVercelCredentials,
  formatCredentialValidation,
  formatDeploymentList,
  parseDeployEnv,
  parseProjectName,
} from "../lib/guardian/vercel-deploy";
import {
  RalphEngine,
  loadEvents,
  loadCheckpoint,
  clearEvents,
  clearCheckpoint,
  type WorkflowEvent,
} from "../lib/guardian/ralph-engine";
import {
  progressEmitter,
  loadProgressEvents,
  formatProgressUpdate,
} from "../lib/guardian/progress-emitter";
import {
  TaskOrchestrator,
  generateExecutionPlan,
  formatExecutionPlan,
  formatGraphAsMermaid,
} from "../lib/guardian/task-orchestrator";

const ROOT_DIR = resolve(import.meta.dir, "../..");
const CONFIG_PATH = join(ROOT_DIR, "ccplate.config.json");
const WORKFLOW_STATE_PATH = join(ROOT_DIR, "memory/workflow-state.json");

interface WorktreeConfig {
  baseDir: string;
  branchPrefix: string;
}

interface ActiveWorktree {
  id: string;
  path: string;
  branch: string;
  agent?: string;
  createdAt: string;
  note?: string;
}

interface WorkflowState {
  session_id: string | null;
  current_prp_step: number;
  total_prp_steps: number;
  files_changed: number;
  last_commit_time: string | null;
  last_test_time: string | null;
  context_pressure: number;
  active_worktrees: ActiveWorktree[];
  pending_nudges: string[];
  errors_detected: string[];
  lsp_diagnostics_count: number;
}

function loadConfig(): WorktreeConfig {
  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    return config.worktrees || { baseDir: ".worktrees", branchPrefix: "ccplate/" };
  } catch {
    return { baseDir: ".worktrees", branchPrefix: "ccplate/" };
  }
}

function loadWorkflowState(): WorkflowState {
  try {
    return JSON.parse(readFileSync(WORKFLOW_STATE_PATH, "utf-8"));
  } catch {
    return {
      session_id: null,
      current_prp_step: 0,
      total_prp_steps: 0,
      files_changed: 0,
      last_commit_time: null,
      last_test_time: null,
      context_pressure: 0.0,
      active_worktrees: [],
      pending_nudges: [],
      errors_detected: [],
      lsp_diagnostics_count: 0,
    };
  }
}

function saveWorkflowState(state: WorkflowState): void {
  ensureMemoryDir();
  writeFileSync(WORKFLOW_STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

/**
 * SECURITY: Execute commands using spawnSync with shell: false to prevent command injection.
 * All arguments must be passed as an array.
 */
function exec(command: string, args: string[]): string {
  try {
    const result = spawnSync(command, args, {
      cwd: ROOT_DIR,
      encoding: "utf-8",
      shell: false,
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0 && result.status !== null) {
      throw new Error(result.stderr || `Command failed with exit code ${result.status}`);
    }

    return (result.stdout as string || "").trim();
  } catch (error: unknown) {
    const execError = error as { stderr?: string; message?: string };
    throw new Error(execError.stderr || execError.message || "Command failed");
  }
}

/**
 * SECURITY: Use shared validation for task IDs to prevent command injection
 */
function validateTaskId(taskId: string): void {
  try {
    validateSafeIdentifier(taskId, "task ID");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

/**
 * Fuzzy match worktree ID using prefix > substring > Levenshtein
 * Returns exact match, or best fuzzy match, or null
 */
function resolveWorktreeId(input: string): string | null {
  const state = loadWorkflowState();
  const ids = state.active_worktrees.map(w => w.id);
  
  // Exact match
  if (ids.includes(input)) return input;
  
  // Prefix match
  const prefixMatches = ids.filter(id => id.startsWith(input));
  if (prefixMatches.length === 1) return prefixMatches[0];
  if (prefixMatches.length > 1) {
    console.error(`Ambiguous worktree ID '${input}'. Matches:`);
    prefixMatches.forEach(id => console.error(`  - ${id}`));
    process.exit(1);
  }
  
  // Substring match
  const substringMatches = ids.filter(id => id.includes(input));
  if (substringMatches.length === 1) return substringMatches[0];
  if (substringMatches.length > 1) {
    console.error(`Ambiguous worktree ID '${input}'. Matches:`);
    substringMatches.forEach(id => console.error(`  - ${id}`));
    process.exit(1);
  }
  
  return null;
}

/**
 * Resolve worktree ID with fuzzy matching, exit on failure
 */
function resolveWorktreeIdOrExit(input: string, _commandName: string): string {
  const resolved = resolveWorktreeId(input);
  if (!resolved) {
    console.error(`Error: Worktree '${input}' not found`);
    const state = loadWorkflowState();
    if (state.active_worktrees.length > 0) {
      console.error(`\nAvailable worktrees:`);
      state.active_worktrees.forEach(w => console.error(`  - ${w.id}`));
    }
    process.exit(1);
  }
  if (resolved !== input) {
    console.log(`Resolved '${input}' → '${resolved}'`);
  }
  return resolved;
}

function ensureMemoryDir(): void {
  const memoryDir = join(ROOT_DIR, "memory");
  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true });
  }
}

function createWorktree(taskId: string, options: { note?: string } = {}): void {
  validateTaskId(taskId);
  const config = loadConfig();
  const state = loadWorkflowState();
  
  const worktreePath = join(config.baseDir, taskId);
  const branchName = `${config.branchPrefix}${taskId}`;
  const fullPath = join(ROOT_DIR, worktreePath);

  if (state.active_worktrees.some((w) => w.id === taskId)) {
    console.error(`Error: Worktree '${taskId}' already exists`);
    process.exit(1);
  }

  if (!existsSync(join(ROOT_DIR, config.baseDir))) {
    mkdirSync(join(ROOT_DIR, config.baseDir), { recursive: true });
  }

  try {
    exec("git", ["worktree", "add", fullPath, "-b", branchName]);
    console.log(`✓ Created worktree: ${worktreePath}`);
    console.log(`✓ Created branch: ${branchName}`);

    const worktreeEntry: ActiveWorktree = {
      id: taskId,
      path: worktreePath,
      branch: branchName,
      agent: "implementer",
      createdAt: new Date().toISOString(),
    };
    
    if (options.note) {
      worktreeEntry.note = options.note;
      console.log(`✓ Note: ${options.note}`);
    }

    state.active_worktrees.push(worktreeEntry);
    saveWorkflowState(state);
    console.log(`✓ Updated workflow-state.json`);

    // Run preflight checks
    const preflightResult = runPreflightChecks(fullPath, taskId);
    console.log(formatPreflightResult(preflightResult));
  } catch (error) {
    console.error(`Error creating worktree: ${(error as Error).message}`);
    process.exit(1);
  }
}

function validateWorktree(taskId: string): void {
  const resolvedId = resolveWorktreeIdOrExit(taskId, "validate");
  const state = loadWorkflowState();

  const worktree = state.active_worktrees.find((w) => w.id === resolvedId);
  if (!worktree) {
    console.error(`Error: Worktree '${resolvedId}' not found`);
    process.exit(1);
  }

  const fullPath = join(ROOT_DIR, worktree.path);
  if (!existsSync(fullPath)) {
    console.error(`Error: Worktree path does not exist: ${fullPath}`);
    process.exit(1);
  }

  const result = runPreflightChecks(fullPath, resolvedId);
  console.log(formatPreflightResult(result));
  process.exit(result.passed ? 0 : 1);
}

function fixWorktree(taskId: string): void {
  const resolvedId = resolveWorktreeIdOrExit(taskId, "fix");
  const state = loadWorkflowState();

  const worktree = state.active_worktrees.find((w) => w.id === resolvedId);
  if (!worktree) {
    console.error(`Error: Worktree '${resolvedId}' not found`);
    process.exit(1);
  }

  const fullPath = join(ROOT_DIR, worktree.path);
  if (!existsSync(fullPath)) {
    console.error(`Error: Worktree path does not exist: ${fullPath}`);
    process.exit(1);
  }

  console.log(`🔧 Auto-fixing worktree: ${resolvedId}\n`);
  const fixes = autoFixWorktree(fullPath);
  
  if (fixes.length === 0) {
    console.log("No fixes needed or no auto-fixable issues found.");
  } else {
    for (const fix of fixes) {
      console.log(`   ✓ ${fix}`);
    }
  }

  console.log("\n📋 Running validation...");
  const result = runPreflightChecks(fullPath, resolvedId);
  console.log(formatPreflightResult(result));
}

function openWorktree(taskId: string): void {
  const resolvedId = resolveWorktreeIdOrExit(taskId, "open");
  const state = loadWorkflowState();

  const worktree = state.active_worktrees.find((w) => w.id === resolvedId);
  if (!worktree) {
    console.error(`Error: Worktree '${resolvedId}' not found`);
    process.exit(1);
  }

  const fullPath = join(ROOT_DIR, worktree.path);
  if (!existsSync(fullPath)) {
    console.error(`Error: Worktree path does not exist: ${fullPath}`);
    process.exit(1);
  }

  // Detect editor from environment or default to code
  const editor = process.env.EDITOR || process.env.VISUAL || "code";

  // SECURITY: Use spawnSync with argument array instead of string interpolation
  // This prevents command injection through malicious EDITOR values
  try {
    const result = spawnSync(editor, [fullPath], {
      stdio: "inherit",
      shell: false, // Explicitly disable shell to prevent injection
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0 && result.status !== null) {
      // Some editors return non-zero on success (e.g., when detaching)
      // Only treat as error if it's a clear failure
      console.log(`✓ Opened worktree in ${editor}: ${worktree.path}`);
    } else {
      console.log(`✓ Opened worktree in ${editor}: ${worktree.path}`);
    }
  } catch (error) {
    console.error(`Error opening editor: ${(error as Error).message}`);
    console.log(`\nTry manually: ${editor} "${fullPath}"`);
    process.exit(1);
  }
}

function cleanupOrphanWorktrees(): void {
  const state = loadWorkflowState();
  const orphans: ActiveWorktree[] = [];
  
  // Find worktrees whose paths no longer exist on disk
  for (const wt of state.active_worktrees) {
    const fullPath = join(ROOT_DIR, wt.path);
    if (!existsSync(fullPath)) {
      orphans.push(wt);
    }
  }
  
  if (orphans.length === 0) {
    console.log("No orphaned worktrees found");
    return;
  }
  
  console.log(`Found ${orphans.length} orphaned worktree(s):\n`);
  for (const wt of orphans) {
    console.log(`  - ${wt.id} (${wt.path})`);
  }
  
  console.log("\nRemoving from workflow-state.json...\n");
  
  state.active_worktrees = state.active_worktrees.filter(
    wt => !orphans.some(o => o.id === wt.id)
  );
  saveWorkflowState(state);
  
  for (const wt of orphans) {
    console.log(`✓ Removed: ${wt.id}`);
    
    // Try to delete the branch if it exists
    try {
      exec("git", ["branch", "-d", wt.branch]);
      console.log(`  ✓ Deleted branch: ${wt.branch}`);
    } catch {
      // Branch may already be deleted or not merged
    }
  }
  
  console.log(`\n✓ Cleaned up ${orphans.length} orphaned worktree(s)`);
}

function listWorktrees(): void {
  const state = loadWorkflowState();
  let hasStale = false;

  if (state.active_worktrees.length === 0) {
    console.log("No active worktrees");
    return;
  }

  console.log("Active worktrees:\n");
  for (const wt of state.active_worktrees) {
    const agent = wt.agent ? `(${wt.agent})` : "";
    const fullPath = join(ROOT_DIR, wt.path);
    const status = existsSync(fullPath) ? "" : " [MISSING]";
    if (status) hasStale = true;
    console.log(`${wt.id.padEnd(20)} ${wt.path.padEnd(30)} ${wt.branch.padEnd(25)} ${agent}${status}`);
    if (wt.note) {
      console.log(`${"".padEnd(20)} 📝 ${wt.note}`);
    }
  }
  
  if (hasStale) {
    console.log("\n⚠ Some worktrees are missing on disk. Run 'ccplate worktree cleanup-orphans' to clean up.");
  }
}

function showUnifiedStatus(): void {
  const state = loadWorkflowState();
  
  console.log("\n" + "═".repeat(60));
  console.log("  📊 CCPLATE System Status");
  console.log("═".repeat(60) + "\n");
  
  // Session info
  if (state.session_id) {
    console.log(`Session: ${state.session_id}`);
  }
  console.log(`Context Pressure: ${(state.context_pressure * 100).toFixed(0)}%`);
  if (state.files_changed > 0) {
    console.log(`Files Changed: ${state.files_changed} (uncommitted)`);
  }
  
  // ─── Worktrees ───
  console.log("\n" + "─".repeat(40));
  console.log("🌳 Worktrees");
  console.log("─".repeat(40));
  
  if (state.active_worktrees.length === 0) {
    console.log("  No active worktrees");
  } else {
    let missingCount = 0;
    for (const wt of state.active_worktrees) {
      const fullPath = join(ROOT_DIR, wt.path);
      const missing = !existsSync(fullPath);
      if (missing) missingCount++;
      const status = missing ? "❌" : "✅";
      const agent = wt.agent ? ` (${wt.agent})` : "";
      console.log(`  ${status} ${wt.id}${agent}`);
      if (wt.note) console.log(`     📝 ${wt.note}`);
    }
    if (missingCount > 0) {
      console.log(`\n  ⚠ ${missingCount} orphaned worktree(s). Run: ccplate worktree cleanup-orphans`);
    }
  }
  
  // ─── Jobs ───
  console.log("\n" + "─".repeat(40));
  console.log("📋 Jobs Queue");
  console.log("─".repeat(40));
  
  const jobs = getAllJobs();
  const pendingJobs = jobs.filter(j => j.status === "pending");
  const runningJobs = jobs.filter(j => j.status === "running");
  const completedJobs = jobs.filter(j => j.status === "completed");
  const failedJobs = jobs.filter(j => j.status === "failed");
  
  if (jobs.length === 0) {
    console.log("  No jobs");
  } else {
    if (runningJobs.length > 0) console.log(`  🔄 Running: ${runningJobs.length}`);
    if (pendingJobs.length > 0) console.log(`  ⏳ Pending: ${pendingJobs.length}`);
    if (completedJobs.length > 0) console.log(`  ✅ Completed: ${completedJobs.length}`);
    if (failedJobs.length > 0) console.log(`  ❌ Failed: ${failedJobs.length}`);
  }
  
  // ─── HITL ───
  console.log("\n" + "─".repeat(40));
  console.log("🚨 Human-in-the-Loop Requests");
  console.log("─".repeat(40));
  
  const hitlPending = getPendingHITLRequests();
  if (hitlPending.length === 0) {
    console.log("  No pending requests");
  } else {
    console.log(`  ⚠ ${hitlPending.length} pending request(s):`);
    for (const req of hitlPending.slice(0, 3)) {
      console.log(`    - ${req.id}: ${req.title}`);
    }
    if (hitlPending.length > 3) {
      console.log(`    ... and ${hitlPending.length - 3} more`);
    }
    console.log(`\n  Run: ccplate hitl list`);
  }
  
  // ─── Schema Lock ───
  console.log("\n" + "─".repeat(40));
  console.log("🔒 Schema Lock");
  console.log("─".repeat(40));
  
  const schemaLock = getSchemaLockStatus();
  if (!schemaLock) {
    console.log("  Unlocked");
  } else {
    const remaining = new Date(schemaLock.expiresAt).getTime() - Date.now();
    const minutes = Math.floor(remaining / 60000);
    console.log(`  🔐 Locked by: ${schemaLock.worktreeId}`);
    console.log(`     Operation: ${schemaLock.operation}`);
    console.log(`     Expires in: ${minutes}m`);
  }
  
  // ─── Validation ───
  console.log("\n" + "─".repeat(40));
  console.log("🧪 Playwright Validation");
  console.log("─".repeat(40));
  
  console.log(`  ${formatValidationStatus(ROOT_DIR)}`);
  
  // ─── Activity ───
  console.log("\n" + "─".repeat(40));
  console.log("📝 Activity");
  console.log("─".repeat(40));
  
  const currentLoop = getCurrentLoop(ROOT_DIR);
  console.log(`  Current loop: ${currentLoop}`);
  
  if (state.last_commit_time) {
    const commitAgo = Math.floor((Date.now() - new Date(state.last_commit_time).getTime()) / 60000);
    console.log(`  Last commit: ${commitAgo}m ago`);
  }
  if (state.last_test_time) {
    const testAgo = Math.floor((Date.now() - new Date(state.last_test_time).getTime()) / 60000);
    console.log(`  Last test: ${testAgo}m ago`);
  }
  
  // ─── Errors ───
  if (state.errors_detected.length > 0) {
    console.log("\n" + "─".repeat(40));
    console.log("⚠️  Errors Detected");
    console.log("─".repeat(40));
    for (const err of state.errors_detected.slice(0, 5)) {
      console.log(`  - ${err}`);
    }
    if (state.errors_detected.length > 5) {
      console.log(`  ... and ${state.errors_detected.length - 5} more`);
    }
  }
  
  console.log("\n" + "═".repeat(60) + "\n");
}

function cleanupWorktree(taskId: string, deleteBranch = true): void {
  const resolvedId = resolveWorktreeIdOrExit(taskId, "cleanup");
  const state = loadWorkflowState();

  const worktree = state.active_worktrees.find((w) => w.id === resolvedId);
  if (!worktree) {
    console.error(`Error: Worktree '${resolvedId}' not found in workflow-state.json`);
    process.exit(1);
  }

  const fullPath = join(ROOT_DIR, worktree.path);

  try {
    exec("git", ["worktree", "remove", fullPath]);
    console.log(`✓ Removed worktree: ${worktree.path}`);

    if (deleteBranch) {
      try {
        exec("git", ["branch", "-d", worktree.branch]);
        console.log(`✓ Deleted branch: ${worktree.branch}`);
      } catch {
        console.log(`⚠ Branch ${worktree.branch} not deleted (may not be fully merged)`);
        console.log(`  Use 'git branch -D ${worktree.branch}' to force delete`);
      }
    }

    state.active_worktrees = state.active_worktrees.filter((w) => w.id !== resolvedId);
    saveWorkflowState(state);
    console.log(`✓ Updated workflow-state.json`);
  } catch (error) {
    console.error(`Error cleaning up worktree: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function lspDefinition(location: string): Promise<void> {
  const match = location.match(/^(.+):(\d+):(\d+)$/);
  if (!match) {
    console.error("Error: Invalid location format. Use: file:line:column");
    console.error("Example: ccplate lsp definition src/lib/auth.ts:15:10");
    process.exit(1);
  }

  const [, filePath, lineStr, colStr] = match;
  const line = parseInt(lineStr, 10);
  const column = parseInt(colStr, 10);

  if (!existsSync(join(ROOT_DIR, filePath))) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const client = createLSPClient(ROOT_DIR);
  try {
    await client.start();
    const definitions = await client.getDefinition(filePath, line, column);

    if (definitions.length === 0) {
      console.log("No definition found");
    } else {
      for (const def of definitions) {
        console.log(`${def.file}:${def.line}:${def.column}`);
      }
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await client.stop();
  }
}

async function lspReferences(symbol: string, limit: number): Promise<void> {
  if (!symbol) {
    console.error("Error: Missing symbol name");
    console.error("Usage: ccplate lsp references <symbol> [--limit N]");
    process.exit(1);
  }

  const client = createLSPClient(ROOT_DIR);
  try {
    await client.start();
    const references = await client.getReferences(symbol, limit);

    if (references.length === 0) {
      console.log(`No references found for: ${symbol}`);
    } else {
      for (const ref of references) {
        console.log(`${ref.file}:${ref.line}`);
      }
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await client.stop();
  }
}

async function lspDiagnostics(filePath?: string): Promise<void> {
  if (filePath && !existsSync(join(ROOT_DIR, filePath))) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const client = createLSPClient(ROOT_DIR);
  try {
    await client.start();
    const diagnostics = await client.getDiagnostics(filePath);

    if (diagnostics.length === 0) {
      console.log("No diagnostics found");
    } else {
      for (const diag of diagnostics) {
        const severity = diag.severity === 1 ? "ERROR" : "WARN ";
        console.log(
          `${severity} ${diag.source}:${diag.range.start.line} - ${diag.message}`
        );
      }
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await client.stop();
  }
}

// ==================== BUILDER COMMANDS ====================

async function generateHook(description: string): Promise<void> {
  console.log(`🪝 Generating hook: ${description}`);
  console.log("⚠️  Hook generation requires the dev server running.");
  console.log("   Run: curl -X POST http://localhost:3000/api/hook-builder/generate \\");
  console.log(`        -H 'Content-Type: application/json' \\`);
  console.log(`        -d '{"description": "${description}"}'`);
}

async function generateComponent(description: string): Promise<void> {
  console.log(`🧩 Generating component: ${description}`);
  console.log("⚠️  Component generation requires the dev server running.");
  console.log("   Run: curl -X POST http://localhost:3000/api/component-builder/generate \\");
  console.log(`        -H 'Content-Type: application/json' \\`);
  console.log(`        -d '{"description": "${description}"}'`);
}

async function generateApi(description: string): Promise<void> {
  console.log(`🔌 Generating API: ${description}`);
  console.log("⚠️  API generation requires the dev server running.");
  console.log("   Run: curl -X POST http://localhost:3000/api/api-builder/generate \\");
  console.log(`        -H 'Content-Type: application/json' \\`);
  console.log(`        -d '{"description": "${description}"}'`);
}

// ==================== SCHEMA LOCK COMMANDS ====================

function getCurrentWorktreeId(): string {
  try {
    const gitDir = exec("git", ["rev-parse", "--git-dir"]);
    if (gitDir.includes(".worktrees/")) {
      const match = gitDir.match(/\.worktrees\/([^/]+)/);
      if (match) return match[1];
    }
    return "main";
  } catch {
    return "main";
  }
}

function schemaLock(): void {
  const worktreeId = getCurrentWorktreeId();
  const result = acquireSchemaLock(worktreeId, "edit");
  
  if (result.acquired) {
    console.log(`✓ ${result.message}`);
    console.log(`  Worktree: ${worktreeId}`);
    console.log(`  Expires in 30 minutes`);
  } else {
    console.error(`✗ ${result.message}`);
    if (result.holder) {
      console.error(`  Acquired: ${result.holder.acquiredAt}`);
      console.error(`  Expires: ${result.holder.expiresAt}`);
    }
    process.exit(1);
  }
}

function schemaUnlock(): void {
  const worktreeId = getCurrentWorktreeId();
  const released = releaseSchemaLock(worktreeId);
  
  if (released) {
    console.log(`✓ Schema lock released`);
  } else {
    console.error(`✗ Cannot release lock - held by different worktree`);
    process.exit(1);
  }
}

// ==================== INIT / PRD COMMANDS ====================

async function runInit(options: { force?: boolean; goal?: string; tiered?: boolean }): Promise<void> {
  console.log("\n" + "═".repeat(60));
  console.log("  🎯 CCPLATE Project Discovery");
  console.log("═".repeat(60) + "\n");

  const existingPRD = loadPRD(ROOT_DIR);
  if (existingPRD && !options.force) {
    console.log("⚠️  A frozen PRD already exists:");
    console.log(`   Hash: ${existingPRD.metadata.hash}`);
    console.log(`   Created: ${existingPRD.metadata.createdAt}`);
    console.log(`   Project: ${existingPRD.answers.projectName}\n`);
    console.log("Use --force to overwrite (old PRD will be archived).\n");
    process.exit(1);
  }

  if (existingPRD && options.force) {
    console.log("📦 Existing PRD will be archived before creating new one.\n");
  }

  // Use tier-aware interview by default (or with --tiered flag)
  let answers;
  let tierResult: TierInterviewResult | undefined;

  if (options.tiered !== false) {
    tierResult = await runTierAwareInterview();
    answers = tierResult.derivedPRD;
    
    // Save enhanced metadata for Beginner tier
    if (tierResult.tier === "beginner" && tierResult.enhancedPRD) {
      const enhancedPath = join(ROOT_DIR, "memory", "enhanced-prd.json");
      const memoryDir = join(ROOT_DIR, "memory");
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      writeFileSync(enhancedPath, JSON.stringify({
        tier: tierResult.tier,
        enhancedPRD: tierResult.enhancedPRD,
        phases: tierResult.phases,
        initialState: tierResult.initialState,
        rawAnswers: tierResult.answers,
      }, null, 2));
      console.log(`\n📦 Enhanced PRD saved to: ${enhancedPath}`);
    }
  } else {
    // Legacy interview
    answers = await runInteractiveInterview();
  }

  console.log("\n" + "─".repeat(60));
  console.log("📋 Review your answers:\n");
  console.log(`Project: ${answers.projectName}`);
  console.log(`Tech Stack: ${answers.techStack.frontend} / ${answers.techStack.backend} / ${answers.techStack.database}`);
  console.log(`Success Criteria: ${answers.successCriteria.length} items`);
  console.log(`Critical Paths: ${answers.criticalPaths.length} flows`);
  if (tierResult) {
    console.log(`Tier: ${tierResult.tier}`);
  }
  console.log("─".repeat(60) + "\n");

  const result = savePRD(ROOT_DIR, answers, { force: options.force });

  if (!result.success) {
    console.error(`❌ ${result.message}`);
    process.exit(1);
  }

  const prd = loadPRD(ROOT_DIR);
  if (prd) {
    updateWorkflowStateWithPRD(ROOT_DIR, prd.metadata);
  }

  console.log("✅ PRD created successfully!\n");
  console.log(`   📄 Markdown: ${result.prdPath}`);
  console.log(`   📊 JSON: ${result.jsonPath}`);
  console.log(`   🔒 Hash: ${prd?.metadata.hash}\n`);
  console.log("This PRD is now the 'Success Contract' for autonomous agent work.");
  console.log("Agents will use success criteria and critical paths to validate their work.\n");

  // Show next steps for Beginner tier
  if (tierResult?.tier === "beginner" && tierResult.phases) {
    console.log("🚀 Beginner Mode Ready!");
    console.log("   Guardian will now execute the Ralph Loop autonomously.");
    console.log("   You'll see checkpoints at each phase boundary.\n");
    console.log("   Next: Run 'ccplate ralph start' to begin autonomous building.\n");
  }
}

// ==================== RALPH LOOP COMMANDS ====================

async function runRalphCheckpoint(phaseId: string): Promise<void> {
  // Load enhanced PRD
  const enhancedPath = join(ROOT_DIR, "memory", "enhanced-prd.json");
  if (!existsSync(enhancedPath)) {
    console.error("❌ No enhanced PRD found. Run 'ccplate init' first.");
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(enhancedPath, "utf-8"));
  const phases = data.phases as PhaseDefinition[];
  const phase = phases.find(p => p.id === phaseId);

  if (!phase) {
    console.error(`❌ Phase '${phaseId}' not found.`);
    console.log(`   Available phases: ${phases.map(p => p.id).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n📸 Capturing HITL checkpoint for phase: ${phase.name}...\n`);

  const capture = await captureHITLCheckpoint(phase);
  console.log(formatCheckpointSummary(phase, capture));
}

function showRalphStatus(): void {
  const enhancedPath = join(ROOT_DIR, "memory", "enhanced-prd.json");
  
  if (!existsSync(enhancedPath)) {
    console.log("No Ralph Loop state found. Run 'ccplate init' to create one.");
    return;
  }

  const data = JSON.parse(readFileSync(enhancedPath, "utf-8"));
  const { tier, enhancedPRD, phases, initialState } = data;

  console.log("\n🔄 Ralph Loop Status\n");
  console.log("─".repeat(60));
  console.log(`Tier: ${tier}`);
  console.log(`Project: ${enhancedPRD.projectName}`);
  console.log(`Complexity: ${enhancedPRD.estimatedComplexity}`);
  console.log(`Entities: ${enhancedPRD.keyEntities.join(", ")}`);
  console.log("─".repeat(60));
  
  console.log("\n📋 Phases:\n");
  for (const phase of phases as PhaseDefinition[]) {
    const isComplete = initialState.tasksCompleted.some((t: string) => 
      phase.tasks.some(pt => pt.id === t)
    );
    const status = phase.id === initialState.currentPhase 
      ? "▶️ CURRENT" 
      : isComplete 
        ? "✅ COMPLETE" 
        : "⏳ PENDING";
    
    console.log(`  ${phase.emoji} ${phase.name} [${status}]`);
    console.log(`     ${phase.tasks.length} tasks | Gate: ${phase.transitionGate.type}`);
    console.log(`     Checkpoint: ${phase.hitlCheckpoint.type}`);
  }

  console.log("\n📊 Metrics:\n");
  console.log(`  Iterations: ${initialState.metrics.totalIterations}`);
  console.log(`  Builds: ${initialState.metrics.successfulBuilds} passed / ${initialState.metrics.failedBuilds} failed`);
  console.log(`  Tests: ${initialState.metrics.testsPassed} / ${initialState.metrics.testsRun} passed`);
  console.log(`  Commits: ${initialState.metrics.commitsCreated}`);
  console.log();
}

function showRalphEvents(limit: number = 20): void {
  const events = loadEvents(ROOT_DIR);
  
  if (events.length === 0) {
    console.log("No workflow events found.");
    return;
  }
  
  const recentEvents = events.slice(-limit);
  
  console.log(`\n📜 Recent Workflow Events (${recentEvents.length}/${events.length})\n`);
  console.log("─".repeat(80));
  
  for (const event of recentEvents) {
    const time = new Date(event.timestamp).toLocaleTimeString();
    const emoji = getEventEmoji(event.type);
    const phase = event.phaseId ? ` [${event.phaseId}]` : "";
    const task = event.taskId ? ` (${event.taskId})` : "";
    
    console.log(`${time} ${emoji} ${event.type}${phase}${task}`);
    
    // Show relevant payload info
    if (event.payload.message) {
      console.log(`         ${event.payload.message}`);
    }
    if (event.payload.error) {
      console.log(`         ❌ ${event.payload.error}`);
    }
  }
  console.log();
}

function getEventEmoji(type: string): string {
  const emojis: Record<string, string> = {
    WORKFLOW_STARTED: "🚀",
    WORKFLOW_COMPLETED: "🏁",
    WORKFLOW_FAILED: "💥",
    PHASE_STARTED: "📦",
    PHASE_COMPLETED: "✅",
    PHASE_FAILED: "❌",
    TASK_STARTED: "▶️",
    TASK_COMPLETED: "✅",
    TASK_FAILED: "❌",
    TASK_SKIPPED: "⏭️",
    TASK_RETRIED: "🔄",
    HITL_REQUESTED: "🚧",
    HITL_RESOLVED: "✔️",
    BUILD_OUTPUT: "🔨",
    TEST_RESULT: "🧪",
    ERROR_DETECTED: "⚠️",
    ERROR_FIXED: "🔧",
    CHECKPOINT_CREATED: "💾",
    CHECKPOINT_RESUMED: "♻️",
  };
  return emojis[type] || "📝";
}

function showRalphCheckpointInfo(): void {
  const checkpoint = loadCheckpoint(ROOT_DIR);
  
  if (!checkpoint) {
    console.log("No checkpoint found.");
    return;
  }
  
  console.log("\n💾 Last Checkpoint\n");
  console.log("─".repeat(60));
  console.log(`ID: ${checkpoint.id}`);
  console.log(`Created: ${new Date(checkpoint.timestamp).toLocaleString()}`);
  console.log(`Phase: ${checkpoint.state.currentPhase}`);
  console.log(`Tasks Completed: ${checkpoint.state.tasksCompleted.length}`);
  console.log(`Tasks Failed: ${checkpoint.state.tasksFailed.length}`);
  console.log(`Events Logged: ${checkpoint.metadata.totalEvents}`);
  console.log(`Version: ${checkpoint.metadata.version}`);
  console.log();
}

function showRalphPlan(): void {
  const enhancedPath = join(ROOT_DIR, "memory", "enhanced-prd.json");
  
  if (!existsSync(enhancedPath)) {
    console.log("No Ralph Loop state found. Run 'ccplate init' first.");
    return;
  }
  
  const data = JSON.parse(readFileSync(enhancedPath, "utf-8"));
  const { phases } = data;
  
  const orchestrator = new TaskOrchestrator(phases);
  const plan = generateExecutionPlan(orchestrator.getGraph());
  
  console.log("\n" + formatExecutionPlan(plan));
  console.log();
}

function showRalphGraph(): void {
  const enhancedPath = join(ROOT_DIR, "memory", "enhanced-prd.json");
  
  if (!existsSync(enhancedPath)) {
    console.log("No Ralph Loop state found. Run 'ccplate init' first.");
    return;
  }
  
  const data = JSON.parse(readFileSync(enhancedPath, "utf-8"));
  const { phases } = data;
  
  const orchestrator = new TaskOrchestrator(phases);
  const mermaid = formatGraphAsMermaid(orchestrator.getGraph());
  
  console.log("\n📊 Task Dependency Graph (Mermaid)\n");
  console.log("```mermaid");
  console.log(mermaid);
  console.log("```\n");
}

function clearRalphState(): void {
  clearEvents(ROOT_DIR);
  clearCheckpoint(ROOT_DIR);
  
  console.log("✅ Cleared Ralph engine state (events and checkpoint).");
}

function showRalphProgress(): void {
  const events = loadProgressEvents(ROOT_DIR);
  
  if (events.length === 0) {
    console.log("No progress events found.");
    return;
  }
  
  const recent = events.slice(-30);
  
  console.log("\n📊 Progress Stream (last 30 events)\n");
  console.log("─".repeat(80));
  
  for (const event of recent) {
    console.log(formatProgressUpdate(event));
  }
  console.log();
}

function showPRDStatus(): void {
  const prd = loadPRD(ROOT_DIR);
  
  if (!prd) {
    console.log("No PRD found. Run 'ccplate init' to create one.");
    return;
  }

  console.log("\n📋 PRD Status\n");
  console.log(`Project: ${prd.answers.projectName}`);
  console.log(`Hash: ${prd.metadata.hash}`);
  console.log(`Created: ${prd.metadata.createdAt}`);
  console.log(`Frozen: ${prd.metadata.frozen ? "Yes" : "No"}`);
  console.log(`\nTech Stack:`);
  console.log(`  Frontend: ${prd.answers.techStack.frontend}`);
  console.log(`  Backend: ${prd.answers.techStack.backend}`);
  console.log(`  Database: ${prd.answers.techStack.database}`);
  console.log(`  Auth: ${prd.answers.techStack.auth}`);
  console.log(`  Hosting: ${prd.answers.techStack.hosting}`);
  console.log(`\nSuccess Criteria (${prd.answers.successCriteria.length}):`);
  prd.answers.successCriteria.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  console.log(`\nCritical Paths (${prd.answers.criticalPaths.length}):`);
  prd.answers.criticalPaths.forEach((p) => console.log(`  - ${p}`));
  console.log();
}

function schemaStatus(): void {
  const lock = getSchemaLockStatus();
  
  if (!lock) {
    console.log("Schema is unlocked");
  } else {
    console.log("Schema Lock Status:");
    console.log(`  Worktree: ${lock.worktreeId}`);
    console.log(`  Operation: ${lock.operation}`);
    console.log(`  Acquired: ${lock.acquiredAt}`);
    console.log(`  Expires: ${lock.expiresAt}`);
    
    const remaining = new Date(lock.expiresAt).getTime() - Date.now();
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    console.log(`  Time remaining: ${minutes}m ${seconds}s`);
  }
}

async function lspSymbols(path: string): Promise<void> {
  if (!path) {
    console.error("Error: Missing path");
    console.error("Usage: ccplate lsp symbols <path>");
    process.exit(1);
  }

  if (!existsSync(join(ROOT_DIR, path))) {
    console.error(`Error: Path not found: ${path}`);
    process.exit(1);
  }

  const client = createLSPClient(ROOT_DIR);
  try {
    await client.start();
    const symbols = await client.getSymbols(path);

    if (symbols.length === 0) {
      console.log("No symbols found");
    } else {
      for (const sym of symbols) {
        console.log(`${sym.kind} ${sym.name} (${sym.file}:${sym.line})`);
      }
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await client.stop();
  }
}

function printHelp(): void {
  console.log(`
ccplate - CCPLATE Guardian CLI

Usage:
  ccplate status                      Show unified system dashboard
  
  ccplate init [--force]              Run discovery interview and create PRD
  ccplate init status                 Show current PRD status
  ccplate init-poc [--force]          Alias for 'ccplate init'

  ccplate worktree create <id> [--note "desc"]  Create isolated worktree
  ccplate worktree open <id>          Open worktree in editor (fuzzy match)
  ccplate worktree list               List active worktrees
  ccplate worktree validate <id>      Run preflight checks (fuzzy match)
  ccplate worktree fix <id>           Auto-fix common issues (fuzzy match)
  ccplate worktree cleanup <id>       Remove worktree after merge (fuzzy match)
  ccplate worktree cleanup-orphans    Remove all stale worktree entries

  ccplate schema lock                 Acquire schema lock for current worktree
  ccplate schema unlock               Release schema lock
  ccplate schema status               Show current schema lock status

  ccplate lsp definition <file>:<line>:<column>   Get definition location
  ccplate lsp references <symbol> [--limit N]     Find all references to symbol
  ccplate lsp diagnostics [file]                  Get errors/warnings
  ccplate lsp symbols <path>                      Get symbols in file/directory

  ccplate hook generate <description>             Generate a React hook
  ccplate component generate <description>        Generate a React component
  ccplate api generate <description>              Generate an API route

  ccplate jobs list                               List all Guardian jobs
  ccplate jobs get <job-id>                       Get details of a specific job
  ccplate jobs process                            Process pending jobs

  ccplate mesh broadcast <type> <title> <content> Broadcast knowledge to mesh
  ccplate mesh list [--since <minutes>]           List recent knowledge entries
  ccplate mesh inject                             Output formatted knowledge for prompts

  ccplate hitl list                               List pending HITL requests
  ccplate hitl show <id>                          Show request details
  ccplate hitl approve <id> [--by <name>] [--notes <text>]  Approve a request
  ccplate hitl reject <id> [--by <name>] [--notes <text>]   Reject a request

  ccplate harness --variants <N> --goal "<desc>"  Start POC harness with N variants
  ccplate harness status [run-id]                 Show harness run status
  ccplate harness pick <variant-id>               Select variant to merge
  ccplate harness cleanup [run-id]                Remove non-selected worktrees
  ccplate harness report [run-id]                 Regenerate report
  ccplate harness --parallel                      Run variants in parallel

  ccplate triage <issue-number>                   Analyze issue and suggest labels
  ccplate triage --all                            Triage all unlabeled issues
  ccplate parallel-check <issue1> <issue2> ...    Check if issues can run in parallel

  ccplate log [--namespace <ns>] [--level <lvl>]  View structured logs
  ccplate log --since <minutes> --tail <n>        Filter logs by time and count

  ccplate resolve status                          Show merge conflict status
  ccplate resolve auto                            Auto-resolve simple conflicts
  ccplate resolve analyze <file>                  Analyze conflict in file

  ccplate profile list                            List available MCP profiles
  ccplate profile activate <id>                   Activate a profile
  ccplate profile reset                           Restore original .mcp.json
  ccplate profile wizard                          Run interactive profile wizard
  ccplate profile status                          Show active profile and servers

  ccplate handoff create                          Create manual session handoff
  ccplate handoff show                            Display current handoff
  ccplate handoff archive                         Archive handoff without restoring

  ccplate validate status                         Show Playwright validation status
  ccplate validate run [test-pattern]             Run Playwright tests
  ccplate validate register <task-id> <patterns>  Register tests required for task
  ccplate validate check <task-id>                Check if task can be completed
  ccplate validate fixloop status                 Show fix loop status
  ccplate validate fixloop end                    End active fix loop

  ccplate activity status                         Show current loop number
  ccplate activity start <task>                   Log task start
  ccplate activity complete <task>                Log task completion
  ccplate activity clear                          Clear activity log
  ccplate activity loop                           Increment loop counter

  ccplate web search <query>                      Search web via Google Custom Search
  ccplate web fetch <url>                         Fetch and extract text from URL

  ccplate merge list [--limit N] [--branch name]  Show merge history
  ccplate merge rollback <id> [--reason "text"]   Rollback a merge by ID

  ccplate audit list [--category type] [--limit N] [--since Nm]  Show audit log
  ccplate audit categories                        List available audit categories

  ccplate deploy [--prod] [--name <name>]         Deploy to Vercel
  ccplate deploy status <deployment-id>           Check deployment status
  ccplate deploy list [--limit N]                 List recent deployments
  ccplate deploy validate                         Validate Vercel credentials

Examples:
  ccplate status                              # Unified dashboard

  ccplate init
  ccplate init --force
  ccplate init status

  ccplate worktree create oauth-api --note "OAuth integration"
  ccplate worktree open oauth                 # Fuzzy match opens oauth-api
  ccplate worktree list
  ccplate worktree validate oauth             # Fuzzy match validates oauth-api
  ccplate worktree fix oauth-api
  ccplate worktree cleanup oauth-api
  ccplate worktree cleanup-orphans            # Clean all stale entries

  ccplate schema lock
  ccplate schema status

  ccplate lsp definition src/lib/auth.ts:15:10
  ccplate lsp references signIn --limit 20
  ccplate lsp diagnostics
  ccplate lsp diagnostics src/lib/auth.ts
  ccplate lsp symbols src/lib/

  ccplate hook generate "fetch user data"
  ccplate component generate "modal dialog with close button"
  ccplate api generate "create user endpoint"

  ccplate harness --variants 3 --goal "Auth implementation"
  ccplate harness --names clerk,nextauth,custom --goal "Auth strategy"
  ccplate harness status
  ccplate harness pick variant-1
  ccplate harness cleanup

  ccplate profile list                      # Show available profiles
  ccplate profile activate beginner-light   # Max context savings
  ccplate profile wizard                    # Interactive setup
  ccplate profile status                    # Show current profile
  ccplate profile reset                     # Restore original config

  ccplate handoff create                    # Create session handoff
  ccplate handoff show                      # View current handoff
  ccplate handoff archive                   # Archive without using

  ccplate deploy                            # Deploy to preview
  ccplate deploy --prod                     # Deploy to production
  ccplate deploy status abc123              # Check deployment status
  ccplate deploy list                       # List recent deployments
  ccplate deploy validate                   # Check credentials

Options:
  --help, -h    Show this help message
`);
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const [command, subcommand, taskId] = args;

function parseLimit(args: string[]): number {
  const limitIndex = args.indexOf("--limit");
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    const limit = parseInt(args[limitIndex + 1], 10);
    return isNaN(limit) ? 50 : limit;
  }
  return 50;
}

async function main(): Promise<void> {
  if (command === "status") {
    showUnifiedStatus();
  } else if (command === "init" || command === "init-poc") {
    const force = args.includes("--force");
    const legacy = args.includes("--legacy");
    if (subcommand === "status") {
      showPRDStatus();
    } else {
      await runInit({ force, tiered: !legacy });
    }
  } else if (command === "ralph") {
    switch (subcommand) {
      case "checkpoint":
        if (!taskId) {
          console.error("Error: Missing phase-id\nUsage: ccplate ralph checkpoint <phase-id>");
          process.exit(1);
        }
        await runRalphCheckpoint(taskId);
        break;
      case "status":
        showRalphStatus();
        break;
      case "events": {
        const limitIdx = args.indexOf("--limit");
        const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 20;
        showRalphEvents(limit);
        break;
      }
      case "checkpoint-info":
        showRalphCheckpointInfo();
        break;
      case "plan":
        showRalphPlan();
        break;
      case "graph":
        showRalphGraph();
        break;
      case "progress":
        showRalphProgress();
        break;
      case "clear":
        clearRalphState();
        break;
      case "resume": {
        const engine = RalphEngine.resume(ROOT_DIR);
        if (engine) {
          console.log("✅ Resumed Ralph engine from checkpoint.");
          console.log(`   Phase: ${engine.getState().currentPhase}`);
          console.log(`   Tasks completed: ${engine.getState().tasksCompleted.length}`);
        } else {
          console.log("No checkpoint to resume from.");
        }
        break;
      }
      default:
        console.log("Ralph Loop Commands:");
        console.log("  ccplate ralph status                 Show current Ralph Loop state");
        console.log("  ccplate ralph checkpoint <phase-id>  Capture HITL checkpoint for phase");
        console.log("  ccplate ralph events [--limit N]     Show workflow events (default 20)");
        console.log("  ccplate ralph checkpoint-info        Show last checkpoint details");
        console.log("  ccplate ralph plan                   Show execution plan");
        console.log("  ccplate ralph graph                  Show task dependency graph (Mermaid)");
        console.log("  ccplate ralph progress               Show progress stream events");
        console.log("  ccplate ralph resume                 Resume from last checkpoint");
        console.log("  ccplate ralph clear                  Clear events and checkpoint");
        break;
    }
  } else if (command === "worktree") {
    switch (subcommand) {
      case "create": {
        if (!taskId) {
          console.error("Error: Missing task-id\nUsage: ccplate worktree create <task-id> [--note \"description\"]");
          process.exit(1);
        }
        // Parse --note flag
        const noteIndex = args.indexOf("--note");
        const note = noteIndex !== -1 ? args[noteIndex + 1] : undefined;
        createWorktree(taskId, { note });
        break;
      }
      case "open":
        if (!taskId) {
          console.error("Error: Missing task-id\nUsage: ccplate worktree open <task-id>");
          process.exit(1);
        }
        openWorktree(taskId);
        break;
      case "list":
        listWorktrees();
        break;
      case "validate":
        if (!taskId) {
          console.error("Error: Missing task-id\nUsage: ccplate worktree validate <task-id>");
          process.exit(1);
        }
        validateWorktree(taskId);
        break;
      case "fix":
        if (!taskId) {
          console.error("Error: Missing task-id\nUsage: ccplate worktree fix <task-id>");
          process.exit(1);
        }
        fixWorktree(taskId);
        break;
      case "cleanup":
        if (!taskId) {
          console.error("Error: Missing task-id\nUsage: ccplate worktree cleanup <task-id>");
          process.exit(1);
        }
        cleanupWorktree(taskId);
        break;
      case "cleanup-orphans":
        cleanupOrphanWorktrees();
        break;
      default:
        console.error(`Unknown worktree command: ${subcommand}`);
        printHelp();
        process.exit(1);
    }
  } else if (command === "hook") {
    if (subcommand === "generate" && taskId) {
      await generateHook(args.slice(2).join(" "));
    } else {
      console.error("Usage: ccplate hook generate <description>");
      process.exit(1);
    }
  } else if (command === "component") {
    if (subcommand === "generate" && taskId) {
      await generateComponent(args.slice(2).join(" "));
    } else {
      console.error("Usage: ccplate component generate <description>");
      process.exit(1);
    }
  } else if (command === "api") {
    if (subcommand === "generate" && taskId) {
      await generateApi(args.slice(2).join(" "));
    } else {
      console.error("Usage: ccplate api generate <description>");
      process.exit(1);
    }
  } else if (command === "schema") {
    switch (subcommand) {
      case "lock":
        schemaLock();
        break;
      case "unlock":
        schemaUnlock();
        break;
      case "status":
        schemaStatus();
        break;
      default:
        console.error(`Unknown schema command: ${subcommand}`);
        console.log("Usage: ccplate schema [lock|unlock|status]");
        process.exit(1);
    }
  } else if (command === "lsp") {
    switch (subcommand) {
      case "definition":
        if (!taskId) {
          console.error("Error: Missing location\nUsage: ccplate lsp definition <file>:<line>:<column>");
          process.exit(1);
        }
        await lspDefinition(taskId);
        break;
      case "references":
        if (!taskId) {
          console.error("Error: Missing symbol\nUsage: ccplate lsp references <symbol> [--limit N]");
          process.exit(1);
        }
        await lspReferences(taskId, parseLimit(args));
        break;
      case "diagnostics":
        await lspDiagnostics(taskId);
        break;
      case "symbols":
        if (!taskId) {
          console.error("Error: Missing path\nUsage: ccplate lsp symbols <path>");
          process.exit(1);
        }
        await lspSymbols(taskId);
        break;
      default:
        console.error(`Unknown lsp command: ${subcommand}`);
        printHelp();
        process.exit(1);
    }
  } else if (command === "jobs") {
    switch (subcommand) {
      case "list": {
        const jobs = getAllJobs();
        if (jobs.length === 0) {
          console.log("No jobs found");
        } else {
          console.log("Guardian Jobs:\n");
          for (const job of jobs) {
            const status = job.status.toUpperCase().padEnd(10);
            const source = job.source.type === 'github_issue' 
              ? `issue #${job.source.issueNumber}` 
              : job.source.type === 'github_pr' 
                ? `PR #${job.source.prNumber}` 
                : 'cli';
            console.log(`${job.id.padEnd(30)} ${status} ${job.command.padEnd(12)} ${source}`);
          }
        }
        break;
      }
      case "get": {
        if (!taskId) {
          console.error("Error: Missing job-id\nUsage: ccplate jobs get <job-id>");
          process.exit(1);
        }
        const job = getJob(taskId);
        if (!job) {
          console.error(`Job not found: ${taskId}`);
          process.exit(1);
        }
        console.log(JSON.stringify(job, null, 2));
        break;
      }
      case "process":
        await processQueue();
        break;
      default:
        console.error(`Unknown jobs command: ${subcommand}`);
        printHelp();
        process.exit(1);
    }
  } else if (command === "mesh") {
    switch (subcommand) {
      case "broadcast": {
        const type = taskId as KnowledgeType;
        const validTypes = ['discovery', 'warning', 'pattern', 'dependency', 'blocker', 'resolution'];
        if (!validTypes.includes(type)) {
          console.error(`Error: Invalid type '${type}'`);
          console.error(`Valid types: ${validTypes.join(', ')}`);
          process.exit(1);
        }
        const title = args[3];
        const priorityIndex = args.indexOf('--priority');
        const contentEndIndex = priorityIndex !== -1 ? priorityIndex : args.length;
        const content = args.slice(4, contentEndIndex).join(' ');
        if (!title || !content) {
          console.error("Usage: ccplate mesh broadcast <type> <title> <content> [--priority <level>]");
          console.error("  Types: discovery, warning, pattern, dependency, blocker, resolution");
          console.error("  Priority: low, medium, high, critical (default: medium)");
          process.exit(1);
        }
        const validPriorities = ['low', 'medium', 'high', 'critical'] as const;
        const priorityArg = priorityIndex !== -1 ? args[priorityIndex + 1] : 'medium';
        if (!validPriorities.includes(priorityArg as typeof validPriorities[number])) {
          console.error(`Error: Invalid priority '${priorityArg}'`);
          console.error(`Valid priorities: ${validPriorities.join(', ')}`);
          process.exit(1);
        }
        const priority = priorityArg as 'low' | 'medium' | 'high' | 'critical';
        const worktreeId = process.env.CCPLATE_WORKTREE || 'main';
        const agentName = process.env.CCPLATE_AGENT || 'cli';
        
        const entry = broadcast({
          worktreeId,
          agentName,
          type,
          title,
          content,
          priority,
        });
        console.log(`✓ Broadcasted: ${entry.id}`);
        console.log(`  Type: ${entry.type}, Priority: ${entry.priority}`);
        console.log(`  From: ${entry.worktreeId} (${entry.agentName})`);
        break;
      }
      case "list": {
        const sinceIndex = args.indexOf('--since');
        let since: Date | undefined;
        if (sinceIndex !== -1 && args[sinceIndex + 1]) {
          const minutes = parseInt(args[sinceIndex + 1], 10);
          if (!isNaN(minutes)) {
            since = new Date(Date.now() - minutes * 60 * 1000);
          }
        }
        const entries = getKnowledge({ since });
        if (entries.length === 0) {
          console.log("No knowledge entries found");
        } else {
          console.log(`Knowledge Mesh (${entries.length} entries):\n`);
          for (const e of entries) {
            const time = new Date(e.timestamp).toLocaleTimeString();
            const priority = e.priority === 'critical' ? '🔴' : e.priority === 'high' ? '🟠' : e.priority === 'medium' ? '🟡' : '⚪';
            console.log(`${priority} [${e.type.toUpperCase()}] ${e.title}`);
            console.log(`   ${e.content}`);
            console.log(`   From: ${e.worktreeId} (${e.agentName}) at ${time}\n`);
          }
        }
        break;
      }
      case "inject": {
        const excludeWorktree = process.env.CCPLATE_WORKTREE;
        const entries = getKnowledge({ 
          excludeWorktree,
          minPriority: 'medium' 
        });
        const formatted = formatKnowledgeForPrompt(entries);
        if (formatted) {
          console.log(formatted);
        } else {
          console.log("No knowledge to inject");
        }
        break;
      }
      default:
        console.error(`Unknown mesh command: ${subcommand}`);
        printHelp();
        process.exit(1);
    }
  } else if (command === "hitl") {
    switch (subcommand) {
      case "list": {
        const pending = getPendingHITLRequests();
        if (pending.length === 0) {
          console.log("No pending HITL requests");
        } else {
          console.log(`Pending HITL Requests (${pending.length}):\n`);
          for (const req of pending) {
            const created = new Date(req.createdAt).toLocaleString();
            console.log(`🚨 ${req.id}`);
            console.log(`   Title: ${req.title}`);
            console.log(`   Reason: ${req.reason}`);
            console.log(`   Created: ${created}`);
            if (req.jobId) console.log(`   Job: ${req.jobId}`);
            if (req.worktreeId) console.log(`   Worktree: ${req.worktreeId}`);
            console.log();
          }
        }
        break;
      }
      case "show": {
        if (!taskId) {
          console.error("Error: Missing request ID\nUsage: ccplate hitl show <id>");
          process.exit(1);
        }
        const req = getHITLRequest(taskId);
        if (!req) {
          console.error(`HITL request not found: ${taskId}`);
          process.exit(1);
        }
        console.log(JSON.stringify(req, null, 2));
        break;
      }
      case "approve":
      case "reject": {
        if (!taskId) {
          console.error(`Error: Missing request ID\nUsage: ccplate hitl ${subcommand} <id>`);
          process.exit(1);
        }
        const byIndex = args.indexOf('--by');
        const resolvedBy = byIndex !== -1 && args[byIndex + 1] ? args[byIndex + 1] : 'cli-user';
        const notesIndex = args.indexOf('--notes');
        const notes = notesIndex !== -1 ? args.slice(notesIndex + 1).join(' ') : undefined;
        
        const result = resolveHITLRequest(
          taskId,
          subcommand === 'approve' ? 'approved' : 'rejected',
          resolvedBy,
          notes
        );
        
        if (!result) {
          console.error(`HITL request not found: ${taskId}`);
          process.exit(1);
        }
        
        const emoji = subcommand === 'approve' ? '✅' : '❌';
        console.log(`${emoji} Request ${subcommand}ed: ${taskId}`);
        console.log(`   By: ${resolvedBy}`);
        if (notes) console.log(`   Notes: ${notes}`);
        break;
      }
      default:
        console.error(`Unknown hitl command: ${subcommand}`);
        printHelp();
        process.exit(1);
    }
  } else if (command === "harness") {
    // Parse harness-specific args
    const variantsIndex = args.indexOf('--variants');
    const namesIndex = args.indexOf('--names');
    const goalIndex = args.indexOf('--goal');
    const maxMinutesIndex = args.indexOf('--max-minutes');
    const noPrdIndex = args.indexOf('--no-prd');
    const dryRunIndex = args.indexOf('--dry-run');
    const parallelIndex = args.indexOf('--parallel');
    const maxConcurrentIndex = args.indexOf('--max-concurrent');

    switch (subcommand) {
      case "status": {
        showHarnessStatus(ROOT_DIR, taskId);
        break;
      }
      case "pick": {
        if (!taskId) {
          console.error("Error: Missing variant ID\nUsage: ccplate harness pick <variant-id>");
          process.exit(1);
        }
        await pickVariant(ROOT_DIR, taskId);
        break;
      }
      case "cleanup": {
        await cleanupHarness(ROOT_DIR, taskId);
        break;
      }
      case "report": {
        const run = getHarnessRun(ROOT_DIR, taskId);
        if (!run) {
          console.error("No harness run found");
          process.exit(1);
        }
        const reportPath = saveHarnessReport(ROOT_DIR, run);
        console.log(`Report saved: ${reportPath}`);
        break;
      }
      default: {
        // Start new harness run
        if (variantsIndex === -1 && namesIndex === -1) {
          // No variants specified, show status
          showHarnessStatus(ROOT_DIR);
          break;
        }

        const variantCount = variantsIndex !== -1 
          ? parseInt(args[variantsIndex + 1], 10) 
          : 0;
        const names = namesIndex !== -1 
          ? args[namesIndex + 1]?.split(',').map(n => n.trim()).filter(Boolean)
          : undefined;
        
        if (!names && (isNaN(variantCount) || variantCount < 1)) {
          console.error("Error: --variants must be a positive number, or use --names");
          process.exit(1);
        }

        if (goalIndex === -1) {
          console.error("Error: --goal is required");
          console.error("Usage: ccplate harness --variants <N> --goal \"<description>\"");
          process.exit(1);
        }

        const goal = args[goalIndex + 1];
        if (!goal) {
          console.error("Error: --goal value is required");
          process.exit(1);
        }

        const maxMinutes = maxMinutesIndex !== -1
          ? parseInt(args[maxMinutesIndex + 1], 10)
          : 30;

        const parallel = parallelIndex !== -1;
        const maxConcurrent = maxConcurrentIndex !== -1
          ? parseInt(args[maxConcurrentIndex + 1], 10)
          : 3;

        await startHarnessRun({
          rootDir: ROOT_DIR,
          goal,
          variants: names ? names.length : variantCount,
          names,
          maxMinutes,
          parallel,
          maxConcurrent,
          requirePRD: noPrdIndex === -1,
          dryRun: dryRunIndex !== -1,
        });
        break;
      }
    }
  } else if (command === "validate") {
    switch (subcommand) {
      case "status": {
        console.log(formatValidationStatus(ROOT_DIR));
        break;
      }
      case "run": {
        console.log("🧪 Running Playwright tests...\n");
        const result = runPlaywrightTests(ROOT_DIR, {
          testPattern: taskId,
        });
        
        // Save validation state with test results
        const { shouldStartFixLoop, failedTest } = updateValidationFromTestRun(ROOT_DIR, result);
        
        console.log(`\nResults:`);
        console.log(`  Passed: ${result.passed}`);
        console.log(`  Failed: ${result.failed}`);
        console.log(`  Total: ${result.totalTests}`);
        
        if (result.failed > 0) {
          console.log(`\n❌ ${result.failed} test(s) failed`);
          
          // Show failing test details
          const failures = result.tests.filter(t => t.status === "failed");
          if (failures.length > 0) {
            console.log("\nFailing tests:");
            for (const f of failures.slice(0, 5)) {
              console.log(`  - ${f.testFile}: ${f.testName}`);
              if (f.error) console.log(`    Error: ${f.error.slice(0, 100)}`);
              if (f.screenshotPath) console.log(`    Screenshot: ${f.screenshotPath}`);
            }
          }
          
          // Auto-start fix loop if needed
          if (shouldStartFixLoop && failedTest) {
            startFixLoop(ROOT_DIR, failedTest);
            console.log(`\n🔄 Fix loop started for: ${failedTest.testFile} › ${failedTest.testName}`);
          }
          
          process.exit(1);
        } else {
          console.log(`\n✅ All tests passed`);
        }
        break;
      }
      case "register": {
        if (!taskId) {
          console.error("Error: Missing task ID\nUsage: ccplate validate register <task-id> <pattern1,pattern2,...>");
          process.exit(1);
        }
        const patterns = args.slice(3).join(' ').split(',').map(p => p.trim()).filter(Boolean);
        if (patterns.length === 0) {
          console.error("Error: At least one test pattern is required");
          process.exit(1);
        }
        registerTaskTests(ROOT_DIR, taskId, patterns);
        console.log(`✓ Registered ${patterns.length} test pattern(s) for task '${taskId}'`);
        console.log(`  Patterns: ${patterns.join(', ')}`);
        break;
      }
      case "check": {
        if (!taskId) {
          console.error("Error: Missing task ID\nUsage: ccplate validate check <task-id>");
          process.exit(1);
        }
        const result = checkTaskCanComplete(ROOT_DIR, taskId);
        if (result.canComplete) {
          console.log(`✅ Task '${taskId}' can be marked complete`);
        } else {
          console.log(`⛔ Task '${taskId}' cannot be completed`);
          console.log(`   Reason: ${result.reason}`);
          if (result.failingTests && result.failingTests.length > 0) {
            console.log(`\n   Failing tests:`);
            for (const test of result.failingTests.slice(0, 5)) {
              console.log(`     - ${test}`);
            }
            if (result.failingTests.length > 5) {
              console.log(`     ... and ${result.failingTests.length - 5} more`);
            }
          }
          process.exit(1);
        }
        break;
      }
      case "fixloop": {
        const fixSubCmd = taskId;
        if (fixSubCmd === "status") {
          const context = getFixLoopContext(ROOT_DIR);
          if (context) {
            console.log(context);
          } else {
            console.log("No fix loop active");
          }
        } else if (fixSubCmd === "end") {
          endFixLoop(ROOT_DIR);
          console.log("✓ Fix loop ended");
        } else {
          console.error("Usage: ccplate validate fixloop [status|end]");
          process.exit(1);
        }
        break;
      }
      default:
        console.error(`Unknown validate command: ${subcommand}`);
        printHelp();
        process.exit(1);
    }
  } else if (command === "activity") {
    switch (subcommand) {
      case "status": {
        const loop = getCurrentLoop(ROOT_DIR);
        console.log(`Current loop: ${loop}`);
        break;
      }
      case "start": {
        const taskDesc = args.slice(2).join(' ');
        if (!taskDesc) {
          console.error("Error: Task description required\nUsage: ccplate activity start <task description>");
          process.exit(1);
        }
        narrateTaskStart(ROOT_DIR, taskDesc);
        console.log(`✓ Logged task start: ${taskDesc}`);
        break;
      }
      case "complete": {
        const taskDesc = args.slice(2).join(' ').split('--')[0].trim();
        const remainingIdx = args.indexOf('--remaining');
        const totalIdx = args.indexOf('--total');
        
        if (!taskDesc) {
          console.error("Error: Task description required\nUsage: ccplate activity complete <task> [--remaining N --total M]");
          process.exit(1);
        }
        
        const remaining = remainingIdx !== -1 ? parseInt(args[remainingIdx + 1], 10) : 0;
        const total = totalIdx !== -1 ? parseInt(args[totalIdx + 1], 10) : 1;
        
        if (isNaN(remaining)) {
          console.error("Error: --remaining must be a valid number");
          process.exit(1);
        }
        if (isNaN(total)) {
          console.error("Error: --total must be a valid number");
          process.exit(1);
        }
        
        narrateTaskComplete(ROOT_DIR, taskDesc, remaining, total);
        console.log(`✓ Logged task complete: ${taskDesc}`);
        break;
      }
      case "clear": {
        clearActivityLog(ROOT_DIR);
        console.log("✓ Activity log cleared");
        break;
      }
      case "loop": {
        const newLoop = incrementLoop(ROOT_DIR);
        console.log(`✓ Loop incremented to ${newLoop}`);
        break;
      }
      default:
        console.error(`Unknown activity command: ${subcommand}`);
        printHelp();
        process.exit(1);
    }
  } else if (command === "web") {
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
    
    if (!TAVILY_API_KEY) {
      console.error("❌ Missing Tavily API key");
      console.error("\nSetup:");
      console.error("1. Get API Key: https://tavily.com/");
      console.error("2. Add to .env:");
      console.error("   TAVILY_API_KEY=your-api-key");
      process.exit(1);
    }
    
    switch (subcommand) {
      case "search": {
        const query = args.slice(2).join(" ");
        if (!query) {
          console.error("Usage: ccplate web search <query>");
          process.exit(1);
        }
        
        console.log(`🔍 Searching: ${query}\n`);
        
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query,
            max_results: 5,
          }),
        });
        
        if (!response.ok) {
          console.error(`API Error: ${response.status}`);
          process.exit(1);
        }
        
        const data = await response.json();
        for (const item of data.results || []) {
          console.log(`📄 ${item.title}`);
          console.log(`   ${item.url}`);
          console.log(`   ${item.content?.slice(0, 200)}...\n`);
        }
        break;
      }
      case "fetch": {
        const fetchUrl = taskId;
        if (!fetchUrl) {
          console.error("Usage: ccplate web fetch <url>");
          process.exit(1);
        }
        
        console.log(`📥 Fetching: ${fetchUrl}\n`);
        
        const response = await fetch(fetchUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; CCPLATEBot/1.0)" },
        });
        
        if (!response.ok) {
          console.error(`Fetch Error: ${response.status}`);
          process.exit(1);
        }
        
        let text = await response.text();
        // Basic HTML to text
        text = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000);
        
        console.log(text);
        break;
      }
      default:
        console.error(`Unknown web command: ${subcommand}`);
        console.log("Usage: ccplate web [search|fetch]");
        process.exit(1);
    }
  } else if (command === "merge") {
    switch (subcommand) {
      case "list": {
        const limitIndex = args.indexOf("--limit");
        const branchIndex = args.indexOf("--branch");
        const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 20;
        const branch = branchIndex !== -1 ? args[branchIndex + 1] : undefined;
        
        const records = getMergeHistory(ROOT_DIR, { limit, branch });
        console.log(formatMergeHistory(records));
        break;
      }
      case "rollback": {
        if (!taskId) {
          console.error("Error: Missing merge ID\nUsage: ccplate merge rollback <id> [--reason \"text\"]");
          process.exit(1);
        }
        const reasonIndex = args.indexOf("--reason");
        const reason = reasonIndex !== -1 ? args.slice(reasonIndex + 1).join(" ") : undefined;
        
        const result = rollbackMerge(ROOT_DIR, taskId, { reason });
        if (result.success) {
          console.log(`✅ ${result.message}`);
          if (result.newCommit) {
            console.log(`   New commit: ${result.newCommit}`);
          }
        } else {
          console.error(`❌ ${result.message}`);
          process.exit(1);
        }
        break;
      }
      case "record": {
        // Internal command for recording merges (used by team-coordinator)
        const worktreeId = args[3];
        const branch = args[4];
        const targetBranch = args[5];
        const preMergeCommit = args[6];
        const postMergeCommit = args[7];
        
        if (!worktreeId || !branch || !targetBranch || !preMergeCommit || !postMergeCommit) {
          console.error("Usage: ccplate merge record <worktreeId> <branch> <targetBranch> <preMergeCommit> <postMergeCommit>");
          process.exit(1);
        }
        
        const record = recordMerge(ROOT_DIR, {
          worktreeId,
          branch,
          targetBranch,
          preMergeCommit,
          postMergeCommit,
          mergedBy: process.env.USER || "unknown",
        });
        console.log(`✓ Merge recorded: ${record.id}`);
        break;
      }
      default:
        console.error(`Unknown merge command: ${subcommand}`);
        console.log("Usage: ccplate merge [list|rollback|record]");
        process.exit(1);
    }
  } else if (command === "audit") {
    switch (subcommand) {
      case "list": {
        const limitIndex = args.indexOf("--limit");
        const categoryIndex = args.indexOf("--category");
        const sinceIndex = args.indexOf("--since");

        const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 50;
        const category = categoryIndex !== -1 ? args[categoryIndex + 1] as AuditCategory : undefined;

        let since: Date | undefined;
        if (sinceIndex !== -1 && args[sinceIndex + 1]) {
          const minutes = parseInt(args[sinceIndex + 1], 10);
          if (!isNaN(minutes)) {
            since = new Date(Date.now() - minutes * 60 * 1000);
          }
        }

        const entries = getAuditEntries(ROOT_DIR, { limit, category, since });
        console.log(formatAuditEntries(entries));
        break;
      }
      case "categories": {
        console.log("Audit Categories:\n");
        const categories: AuditCategory[] = [
          "admin_settings",
          "user_management",
          "schema_change",
          "security",
          "hitl",
          "merge",
          "worktree",
          "auth",
          "file_upload",
          "api_access",
        ];
        for (const cat of categories) {
          console.log(`  - ${cat}`);
        }
        break;
      }
      default:
        console.error(`Unknown audit command: ${subcommand}`);
        console.log("Usage: ccplate audit [list|categories]");
        process.exit(1);
    }
  } else if (command === "triage") {
    // Triage issues using the labeling system
    if (subcommand === "--all" || args.includes("--all")) {
      console.log("Triaging all unlabeled issues...");
      console.log("Note: This requires GITHUB_TOKEN environment variable");
      console.log("Implementation pending - use GitHub webhook for auto-triage");
      process.exit(0);
    }

    const issueNumber = parseInt(subcommand, 10);
    if (isNaN(issueNumber)) {
      console.error("Error: Invalid issue number");
      console.error("Usage: ccplate triage <issue-number>");
      console.error("       ccplate triage --all");
      process.exit(1);
    }

    console.log(`\n🔍 Triaging issue #${issueNumber}...\n`);

    // For local triage, we need the issue title and body
    // This is a simplified version - full implementation would fetch from GitHub
    console.log("Note: For full triage, use the GitHub webhook integration.");
    console.log("      Or provide issue content via stdin.\n");

    // Demonstrate with placeholder
    const analysis: IssueAnalysis = analyzeIssue(
      issueNumber,
      "Sample issue title",
      "Sample issue body mentioning src/lib/guardian/worktree.ts"
    );

    console.log(`Issue #${issueNumber}:`);
    console.log(`  Detected files: ${analysis.mentionedFiles.length > 0 ? analysis.mentionedFiles.join(", ") : "(none)"}`);
    console.log(`  Suggested labels:`);
    for (const label of analysis.suggestedLabels) {
      console.log(`    - ${label}`);
    }
    console.log(`  Parallel safe: ${analysis.parallelSafe ? "Yes" : "No"}`);
    console.log(`\nTo apply labels, use the GitHub webhook or gh CLI:`);
    console.log(`  gh issue edit ${issueNumber} --add-label "${analysis.suggestedLabels.join(",")}"`);

  } else if (command === "parallel-check") {
    // Check if issues can run in parallel
    const issueNumbers = args.slice(1).map(n => parseInt(n, 10)).filter(n => !isNaN(n));

    if (issueNumbers.length < 2) {
      console.error("Error: Need at least 2 issue numbers to check");
      console.error("Usage: ccplate parallel-check <issue1> <issue2> [issue3...]");
      process.exit(1);
    }

    console.log(`\n🔍 Checking parallel safety for ${issueNumbers.length} issues...\n`);

    // For demo, create mock issue data
    // Real implementation would fetch from GitHub
    const issues = issueNumbers.map(num => ({
      issueNumber: num,
      labels: [`area:guardian/core`], // Would come from GitHub labels
    }));

    console.log("Note: Using mock labels. For accurate results, fetch from GitHub.\n");

    const result = checkParallelSafety(issues);
    console.log(formatParallelCheckResult(result));

  } else if (command === "log") {
    // View structured logs
    const namespaceIndex = args.indexOf("--namespace");
    const levelIndex = args.indexOf("--level");
    const sinceIndex = args.indexOf("--since");
    const tailIndex = args.indexOf("--tail");

    const namespace = namespaceIndex !== -1 ? args[namespaceIndex + 1] : undefined;
    const level = levelIndex !== -1 ? args[levelIndex + 1] as LogLevel : undefined;
    const limit = tailIndex !== -1 ? parseInt(args[tailIndex + 1], 10) : 50;

    let since: Date | undefined;
    if (sinceIndex !== -1 && args[sinceIndex + 1]) {
      const minutes = parseInt(args[sinceIndex + 1], 10);
      if (!isNaN(minutes)) {
        since = new Date(Date.now() - minutes * 60 * 1000);
      }
    }

    const entries = parseLogEntries(ROOT_DIR, { namespace, level, since, limit });

    if (entries.length === 0) {
      console.log("No log entries found");
      if (!existsSync(join(ROOT_DIR, "memory/guardian.log"))) {
        console.log("Log file does not exist yet. Logs are written as Guardian runs.");
      }
    } else {
      console.log(formatLogEntries(entries));
      console.log(`\n(${entries.length} entries shown)`);
    }

  } else if (command === "resolve") {
    // Merge conflict resolution
    switch (subcommand) {
      case "status": {
        const files = getConflictedFiles(ROOT_DIR);
        if (files.length === 0) {
          console.log("No merge conflicts detected");
        } else {
          console.log(`\n${files.length} file(s) with conflicts:\n`);
          for (const file of files) {
            const analysis = analyzeConflict(file, ROOT_DIR);
            console.log(formatConflictAnalysis(analysis));
            console.log();
          }
        }
        break;
      }
      case "auto": {
        console.log("\n🔧 Auto-resolving merge conflicts...\n");
        const result = await resolveConflicts(ROOT_DIR);

        if (result.resolved.length === 0 && result.escalated.length === 0) {
          console.log("No conflicts to resolve");
        } else {
          if (result.resolved.length > 0) {
            console.log(`✓ Auto-resolved ${result.resolved.length} file(s):`);
            for (const f of result.resolved) {
              console.log(`    ${f}`);
            }
          }
          if (result.escalated.length > 0) {
            console.log(`\n⚠ Escalated ${result.escalated.length} file(s) to HITL:`);
            for (const f of result.escalated) {
              console.log(`    ${f}`);
            }
            if (result.hitlRequestId) {
              console.log(`\nHITL Request: ${result.hitlRequestId}`);
            }
          }
        }
        break;
      }
      case "analyze": {
        if (!taskId) {
          console.error("Error: Missing file path");
          console.error("Usage: ccplate resolve analyze <file>");
          process.exit(1);
        }
        const analysis = analyzeConflict(taskId, ROOT_DIR);
        console.log(formatConflictAnalysis(analysis));
        break;
      }
      default:
        console.error(`Unknown resolve command: ${subcommand}`);
        console.log("Usage: ccplate resolve [status|auto|analyze <file>]");
        process.exit(1);
    }
  } else if (command === "profile") {
    switch (subcommand) {
      case "list": {
        const profiles = getProfiles();
        const active = getActiveProfile(ROOT_DIR);
        console.log(formatProfileList(profiles, active?.profileId));
        break;
      }
      case "activate": {
        if (!taskId) {
          console.error("Error: Missing profile ID");
          console.error("Usage: ccplate profile activate <profile-id>");
          console.error("\nAvailable profiles:");
          getProfiles().forEach(p => console.error(`  - ${p.id}: ${p.name}`));
          process.exit(1);
        }
        const result = activateProfile(ROOT_DIR, taskId);
        if (result.success) {
          console.log(`\n✅ ${result.message}`);
          if (result.changes) {
            if (result.changes.enabled.length > 0) {
              console.log(`   Enabled: ${result.changes.enabled.join(", ")}`);
            }
            if (result.changes.disabled.length > 0) {
              console.log(`   Disabled: ${result.changes.disabled.join(", ")}`);
            }
          }
          console.log("\n💡 Restart Claude Code to apply changes.");
        } else {
          console.error(`\n❌ ${result.message}`);
          process.exit(1);
        }
        break;
      }
      case "reset": {
        const result = restoreMCPConfig(ROOT_DIR);
        if (result.success) {
          console.log(`\n✅ ${result.message}`);
          console.log("\n💡 Restart Claude Code to apply changes.");
        } else {
          console.error(`\n❌ ${result.message}`);
          process.exit(1);
        }
        break;
      }
      case "wizard": {
        // Run the profile wizard script
        const wizardPath = join(ROOT_DIR, "scripts", "profile-wizard.js");
        if (!existsSync(wizardPath)) {
          console.error("Error: Profile wizard script not found");
          process.exit(1);
        }
        try {
          spawnSync("node", [wizardPath], { stdio: "inherit", cwd: ROOT_DIR, shell: false });
        } catch {
          // Wizard handles its own errors
          process.exit(1);
        }
        break;
      }
      case "status": {
        const active = getActiveProfile(ROOT_DIR);
        const servers = getConfiguredServers(ROOT_DIR);

        console.log("\n📊 Profile Status\n");

        if (active) {
          const profile = getProfile(active.profileId);
          console.log(`Active Profile: ${profile?.name || active.profileId}`);
          console.log(`Activated: ${new Date(active.activatedAt).toLocaleString()}`);
        } else {
          console.log("Active Profile: None (using default .mcp.json)");
        }

        console.log(`\nConfigured MCP Servers (${servers.length}):`);
        if (servers.length === 0) {
          console.log("  (none)");
        } else {
          servers.forEach(s => console.log(`  - ${s}`));
        }
        console.log();
        break;
      }
      default:
        console.error(`Unknown profile command: ${subcommand}`);
        console.log("Usage: ccplate profile [list|activate|reset|wizard|status]");
        process.exit(1);
    }
  } else if (command === "handoff") {
    switch (subcommand) {
      case "create": {
        const result = createHandoff(ROOT_DIR, { reason: "manual" });
        if (result.success) {
          console.log(`\n✅ ${result.message}`);
          if (result.paths) {
            console.log(`\n   📄 Markdown: ${result.paths.md}`);
            console.log(`   📊 JSON: ${result.paths.json}`);
          }
          console.log("\n💡 Start a new session to continue from the handoff.");
        } else {
          console.error(`\n❌ ${result.message}`);
          process.exit(1);
        }
        break;
      }
      case "show": {
        if (!hasHandoff(ROOT_DIR)) {
          console.log("\nNo handoff found.");
          console.log("Run `ccplate handoff create` to create one.\n");
          process.exit(0);
        }

        const state = loadHandoff(ROOT_DIR);
        if (state) {
          console.log(formatHandoff(state));

          // Also show the markdown file path
          console.log("\n📄 Full details: memory/HANDOFF.md\n");
        } else {
          console.error("Error: Could not load handoff state.");
          process.exit(1);
        }
        break;
      }
      case "archive": {
        if (!hasHandoff(ROOT_DIR)) {
          console.log("\nNo handoff to archive.\n");
          process.exit(0);
        }

        clearHandoff(ROOT_DIR);
        console.log("\n✅ Handoff archived to memory/handoff-archive/\n");
        break;
      }
      default:
        console.error(`Unknown handoff command: ${subcommand}`);
        console.log("Usage: ccplate handoff [create|show|archive]");
        process.exit(1);
    }
  } else if (command === "deploy") {
    switch (subcommand) {
      case "validate": {
        const result = validateVercelCredentials(ROOT_DIR);
        console.log("\n" + formatCredentialValidation(result) + "\n");
        process.exit(result.valid ? 0 : 1);
        break;
      }
      case "status": {
        if (!taskId) {
          console.error("Error: Missing deployment ID");
          console.error("Usage: ccplate deploy status <deployment-id>");
          process.exit(1);
        }
        const status = getDeploymentStatus(taskId, ROOT_DIR);
        if (!status) {
          console.error(`Deployment not found: ${taskId}`);
          process.exit(1);
        }
        console.log("\nDeployment Status");
        console.log("─".repeat(40));
        console.log(`ID: ${status.id}`);
        console.log(`State: ${status.state}`);
        if (status.url) console.log(`URL: ${status.url}`);
        console.log(`Created: ${status.createdAt}`);
        if (status.readyAt) console.log(`Ready: ${status.readyAt}`);
        if (status.errorMessage) console.log(`Error: ${status.errorMessage}`);
        console.log();
        break;
      }
      case "list": {
        const limitIdx = args.indexOf("--limit");
        const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 10;
        const records = listDeployments(ROOT_DIR, { limit });
        console.log("\n" + formatDeploymentList(records));
        break;
      }
      default: {
        // Default: deploy to Vercel
        const env = parseDeployEnv(args);
        const projectName = parseProjectName(args);
        const force = args.includes("--force");

        console.log(`\n🚀 Deploying to Vercel (${env})...\n`);

        // Validate first
        const validation = validateVercelCredentials(ROOT_DIR);
        if (!validation.valid) {
          console.log(formatCredentialValidation(validation));
          process.exit(1);
        }

        const result = deployToVercel({
          rootDir: ROOT_DIR,
          env,
          projectName,
          force,
        });

        if (result.success) {
          console.log("✅ Deployment successful!\n");
          if (result.deploymentUrl) {
            console.log(`   URL: ${result.deploymentUrl}`);
          }
          if (result.deploymentId) {
            console.log(`   ID: ${result.deploymentId}`);
          }
          console.log();
        } else {
          console.error(`❌ Deployment failed: ${result.error}\n`);
          if (result.logs) {
            console.log("Logs:");
            console.log(result.logs);
          }
          process.exit(1);
        }
        break;
      }
    }
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
