#!/usr/bin/env bun

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { LSPClient, createLSPClient } from "../lsp/sidecar";
import { getAllJobs, getJob } from "../lib/guardian/job-queue";
import { processQueue } from "../lib/guardian/job-executor";
import { 
  getPendingHITLRequests, 
  getHITLRequest, 
  resolveHITLRequest, 
  getAllHITLRequests 
} from "../lib/guardian/hitl";
import { 
  broadcast, 
  getKnowledge, 
  formatKnowledgeForPrompt,
  type KnowledgeType 
} from "../lib/guardian/knowledge-mesh";
import { runPreflightChecks, autoFixWorktree, formatPreflightResult } from "../lib/guardian/preflight";
import { acquireSchemaLock, releaseSchemaLock, getSchemaLockStatus } from "../lib/guardian/schema-lock";

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

function exec(cmd: string): string {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, encoding: "utf-8" }).trim();
  } catch (error: unknown) {
    const execError = error as { stderr?: string; message?: string };
    throw new Error(execError.stderr || execError.message || "Command failed");
  }
}

function validateTaskId(taskId: string): void {
  // Only allow safe characters: lowercase alphanumeric, dots, underscores, hyphens
  // Must start with alphanumeric, max 64 chars
  const validPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
  if (!validPattern.test(taskId)) {
    console.error(`Error: Invalid task ID '${taskId}'`);
    console.error("Task ID must:");
    console.error("  - Start with lowercase letter or number");
    console.error("  - Contain only lowercase letters, numbers, dots, underscores, hyphens");
    console.error("  - Be 1-64 characters long");
    process.exit(1);
  }
}

function ensureMemoryDir(): void {
  const memoryDir = join(ROOT_DIR, "memory");
  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true });
  }
}

function createWorktree(taskId: string): void {
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
    exec(`git worktree add "${fullPath}" -b "${branchName}"`);
    console.log(`✓ Created worktree: ${worktreePath}`);
    console.log(`✓ Created branch: ${branchName}`);

    state.active_worktrees.push({
      id: taskId,
      path: worktreePath,
      branch: branchName,
      agent: "implementer",
      createdAt: new Date().toISOString(),
    });
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
  validateTaskId(taskId);
  const state = loadWorkflowState();

  const worktree = state.active_worktrees.find((w) => w.id === taskId);
  if (!worktree) {
    console.error(`Error: Worktree '${taskId}' not found`);
    process.exit(1);
  }

  const fullPath = join(ROOT_DIR, worktree.path);
  if (!existsSync(fullPath)) {
    console.error(`Error: Worktree path does not exist: ${fullPath}`);
    process.exit(1);
  }

  const result = runPreflightChecks(fullPath, taskId);
  console.log(formatPreflightResult(result));
  process.exit(result.passed ? 0 : 1);
}

function fixWorktree(taskId: string): void {
  validateTaskId(taskId);
  const state = loadWorkflowState();

  const worktree = state.active_worktrees.find((w) => w.id === taskId);
  if (!worktree) {
    console.error(`Error: Worktree '${taskId}' not found`);
    process.exit(1);
  }

  const fullPath = join(ROOT_DIR, worktree.path);
  if (!existsSync(fullPath)) {
    console.error(`Error: Worktree path does not exist: ${fullPath}`);
    process.exit(1);
  }

  console.log(`🔧 Auto-fixing worktree: ${taskId}\n`);
  const fixes = autoFixWorktree(fullPath);
  
  if (fixes.length === 0) {
    console.log("No fixes needed or no auto-fixable issues found.");
  } else {
    for (const fix of fixes) {
      console.log(`   ✓ ${fix}`);
    }
  }

  console.log("\n📋 Running validation...");
  const result = runPreflightChecks(fullPath, taskId);
  console.log(formatPreflightResult(result));
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
  }
  
  if (hasStale) {
    console.log("\n⚠ Some worktrees are missing on disk. Run 'ccplate worktree cleanup <id>' to remove stale entries.");
  }
}

function cleanupWorktree(taskId: string, deleteBranch = true): void {
  validateTaskId(taskId);
  const config = loadConfig();
  const state = loadWorkflowState();

  const worktree = state.active_worktrees.find((w) => w.id === taskId);
  if (!worktree) {
    console.error(`Error: Worktree '${taskId}' not found in workflow-state.json`);
    process.exit(1);
  }

  const fullPath = join(ROOT_DIR, worktree.path);

  try {
    exec(`git worktree remove "${fullPath}"`);
    console.log(`✓ Removed worktree: ${worktree.path}`);

    if (deleteBranch) {
      try {
        exec(`git branch -d "${worktree.branch}"`);
        console.log(`✓ Deleted branch: ${worktree.branch}`);
      } catch {
        console.log(`⚠ Branch ${worktree.branch} not deleted (may not be fully merged)`);
        console.log(`  Use 'git branch -D ${worktree.branch}' to force delete`);
      }
    }

    state.active_worktrees = state.active_worktrees.filter((w) => w.id !== taskId);
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
    const gitDir = execSync("git rev-parse --git-dir", { cwd: ROOT_DIR, encoding: "utf-8" }).trim();
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
  ccplate worktree create <task-id>   Create isolated worktree for a task
  ccplate worktree list               List active worktrees
  ccplate worktree validate <task-id> Run preflight checks on worktree
  ccplate worktree fix <task-id>      Auto-fix common worktree issues
  ccplate worktree cleanup <task-id>  Remove worktree after merge

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

Examples:
  ccplate worktree create oauth-api
  ccplate worktree list
  ccplate worktree validate oauth-api
  ccplate worktree fix oauth-api
  ccplate worktree cleanup oauth-api

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
  if (command === "worktree") {
    switch (subcommand) {
      case "create":
        if (!taskId) {
          console.error("Error: Missing task-id\nUsage: ccplate worktree create <task-id>");
          process.exit(1);
        }
        createWorktree(taskId);
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
      default:
        console.error(`Unknown worktree command: ${subcommand}`);
        printHelp();
        process.exit(1);
    }
  } else if (command === "hook") {
    if (subcommand === "generate" && taskId) {
      await generateHook(args.slice(2).join(" "));
    } else {
      console.log("Usage: ccplate hook generate <description>");
    }
  } else if (command === "component") {
    if (subcommand === "generate" && taskId) {
      await generateComponent(args.slice(2).join(" "));
    } else {
      console.log("Usage: ccplate component generate <description>");
    }
  } else if (command === "api") {
    if (subcommand === "generate" && taskId) {
      await generateApi(args.slice(2).join(" "));
    } else {
      console.log("Usage: ccplate api generate <description>");
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
        const priority = priorityIndex !== -1 ? args[priorityIndex + 1] as 'low' | 'medium' | 'high' | 'critical' : 'medium';
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
