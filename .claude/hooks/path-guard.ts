/**
 * Claude Code Path Guard Hook
 * Protects sensitive files from Write/Edit operations
 * 
 * Cross-platform (Windows/Mac/Linux) using Bun
 * 
 * Exit codes:
 * - 0: Allow the operation
 * - 2: Block the operation (with reason)
 */

import * as path from "path";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";

const MEMORY_DIR = path.join(process.env.CLAUDE_PROJECT_DIR || ".", "memory");
const WATCHDOG_STATE_PATH = path.join(MEMORY_DIR, "watchdog-state.json");

function ensureDir(dir: string): void {
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Silently fail
  }
}

function logHookError(
  operation: string,
  error: Error | unknown,
  input?: unknown
): void {
  ensureDir(MEMORY_DIR);
  const err = error instanceof Error ? error : new Error(String(error));
  
  const errorEntry = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source: "claude_hook",
    operation: `path-guard:${operation}`,
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
    },
    input: input !== undefined ? String(input).slice(0, 500) : undefined,
    severity: "error",
  };
  
  const errorLogPath = path.join(MEMORY_DIR, "guardian-errors.log");
  try {
    appendFileSync(errorLogPath, JSON.stringify(errorEntry) + "\n");
    console.error(`❌ [Guardian path-guard] ${operation}: ${err.message}`);
  } catch {
    // Can't write log
  }
}

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id: string;
  cwd: string;
}

interface BlockResponse {
  decision: "block";
  reason: string;
}

interface AllowResponse {
  decision: "approve";
}

// Paths that are always allowed (worktrees, memory, agents, skills, rules)
const ALWAYS_ALLOW: string[] = [
  ".worktrees/",
  "memory/",
  ".claude/agents/",
  ".claude/skills/",
  ".claude/rules/",
];

// Worktree isolation paths (used when CCPLATE_WORKTREE is set)
const WORKTREE_SHARED_PATHS: string[] = [
  "memory/",
  ".claude/agents/",
  ".claude/skills/",
  ".claude/rules/",
];

// Files that should NEVER be written to
const NEVER_WRITE: string[] = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "secrets/",
  "*.pem",
  "*.key",
  "*.p12",
  "*.pfx",
  "id_rsa",
  "id_ed25519",
  "credentials.json",
  "service-account.json",
];

// Files that require explicit confirmation (logged but allowed)
const SENSITIVE_WRITE: string[] = [
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
  "requirements.txt",
  "pyproject.toml",
  ".gitignore",
  "tsconfig.json",
  "next.config.js",
  "next.config.ts",
  "vite.config.ts",
  "tailwind.config.js",
  "tailwind.config.ts",
];

// System paths that should never be modified
const SYSTEM_PATHS: string[] = [
  "/etc/",
  "/usr/",
  "/bin/",
  "/sbin/",
  "/var/",
  "C:\\Windows\\",
  "C:\\Program Files\\",
];

function normalizePath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/~/g, process.env.HOME || "~");
}

function matchesPattern(filePath: string, pattern: string): boolean {
  const normalizedPath = normalizePath(filePath);
  const normalizedPattern = normalizePath(pattern);
  
  // Handle glob patterns
  if (normalizedPattern.includes("*")) {
    // Convert glob pattern to anchored regex
    let regexStr = normalizedPattern
      .replace(/\./g, "\\.")              // Escape dots
      .replace(/\*\*/g, "{{GLOBSTAR}}")   // Temp placeholder for **
      .replace(/\*/g, "[^/]*")            // * matches anything except /
      .replace(/{{GLOBSTAR}}/g, ".*");    // ** matches anything including /
    
    regexStr = "^" + regexStr + "$";      // Anchor the pattern
    
    return new RegExp(regexStr).test(normalizedPath);
  }
  
  // Handle directory patterns (ending with /)
  if (normalizedPattern.endsWith("/")) {
    return normalizedPath.startsWith(normalizedPattern) ||
           normalizedPath.includes(`/${normalizedPattern}`);
  }
  
  // Exact match or filename match
  return normalizedPath === normalizedPattern ||
         normalizedPath.endsWith(`/${normalizedPattern}`) ||
         normalizedPath.endsWith(normalizedPattern);
}

function isWithinDir(targetAbs: string, dirAbs: string): boolean {
  const t = targetAbs.replace(/\\/g, "/");
  const d = dirAbs.replace(/\\/g, "/").replace(/\/$/, "");
  // Exact match OR target starts with dir + "/" (prevents prefix escape)
  return t === d || t.startsWith(d + "/");
}

function isAlwaysAllowed(filePath: string, cwd: string): boolean {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || cwd || ".";
  
  // Resolve to absolute path to prevent traversal attacks
  const absPath = path.resolve(projectDir, filePath);
  
  for (const allowedPath of ALWAYS_ALLOW) {
    const allowedAbs = path.resolve(projectDir, allowedPath);
    if (isWithinDir(absPath, allowedAbs)) {
      return true;
    }
  }
  return false;
}

/**
 * Validates worktree access when CCPLATE_WORKTREE env var is set.
 * Restricts writes to the assigned worktree directory and shared paths.
 */
function validateWorktreeAccess(filePath: string, assignedWorktree: string, cwd: string): boolean {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || cwd || ".";
  
  // Resolve to absolute path to prevent traversal attacks
  const absPath = path.resolve(projectDir, filePath);
  
  // Check if path is within the assigned worktree
  const worktreeAbs = path.resolve(projectDir, `.worktrees/${assignedWorktree}`);
  if (isWithinDir(absPath, worktreeAbs)) {
    return true;
  }
  
  // Check shared paths (memory/, .claude/agents/)
  for (const sharedPath of WORKTREE_SHARED_PATHS) {
    const sharedAbs = path.resolve(projectDir, sharedPath);
    if (isWithinDir(absPath, sharedAbs)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Gets the assigned worktree from environment variable.
 * Returns null if no worktree isolation is active.
 */
function getAssignedWorktree(): string | null {
  return process.env.CCPLATE_WORKTREE || null;
}

/**
 * Watchdog state interface
 */
interface WatchdogState {
  severity: "normal" | "warning" | "orange" | "critical" | "force";
  contextPressure: number;
  blocking: boolean;
  message: string;
}

/**
 * Check if context watchdog is blocking writes
 */
function isWatchdogBlocking(): { blocking: boolean; message: string } {
  try {
    if (!existsSync(WATCHDOG_STATE_PATH)) {
      return { blocking: false, message: "" };
    }

    const state: WatchdogState = JSON.parse(
      readFileSync(WATCHDOG_STATE_PATH, "utf-8")
    );

    if (state.blocking) {
      const pct = Math.round(state.contextPressure * 100);
      return {
        blocking: true,
        message: `Context at ${pct}%! Write operations paused. Run: ccplate handoff create`,
      };
    }

    return { blocking: false, message: "" };
  } catch {
    return { blocking: false, message: "" };
  }
}

function checkNeverWrite(filePath: string, cwd: string): string | null {
  // Skip check if path is always allowed (with traversal protection)
  if (isAlwaysAllowed(filePath, cwd)) {
    return null;
  }
  
  for (const pattern of NEVER_WRITE) {
    if (matchesPattern(filePath, pattern)) {
      return `Protected file: ${pattern} cannot be modified`;
    }
  }
  return null;
}

function checkSystemPaths(filePath: string): string | null {
  const normalizedPath = normalizePath(filePath);
  for (const systemPath of SYSTEM_PATHS) {
    if (normalizedPath.startsWith(normalizePath(systemPath))) {
      return `System path: ${systemPath} cannot be modified`;
    }
  }
  return null;
}

function isSensitiveFile(filePath: string): boolean {
  for (const pattern of SENSITIVE_WRITE) {
    if (matchesPattern(filePath, pattern)) {
      return true;
    }
  }
  return false;
}

// Log sensitive file modifications for review
async function logSensitiveModification(
  filePath: string,
  toolName: string
): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    file: filePath,
    tool: toolName,
    action: "sensitive_file_modified",
  };
  
  const logPath = `${process.env.CLAUDE_PROJECT_DIR || "."}/memory/file-modifications.jsonl`;
  
  try {
    await Bun.write(
      Bun.file(logPath),
      JSON.stringify(logEntry) + "\n",
      { append: true }
    );
  } catch {
    // Silently fail if logging doesn't work
  }
}

async function main(): Promise<void> {
  let input: HookInput;
  
  try {
    const text = await Bun.stdin.text();
    
    if (!text || text.trim() === "") {
      logHookError("input_read", new Error("Empty stdin received"));
      const response: BlockResponse = {
        decision: "block",
        reason: "Empty hook input",
      };
      console.log(JSON.stringify(response));
      process.exit(2);
    }
    
    input = JSON.parse(text) as HookInput;
  } catch (error) {
    logHookError("input_parse", error);
    const response: BlockResponse = {
      decision: "block",
      reason: "Failed to parse hook input",
    };
    console.log(JSON.stringify(response));
    process.exit(2);
  }
  
  // Only check Write and Edit tools
  if (input.tool_name !== "Write" && input.tool_name !== "Edit") {
    const response: AllowResponse = { decision: "approve" };
    console.log(JSON.stringify(response));
    process.exit(0);
  }

  // Check context watchdog blocking FIRST (before other checks)
  const watchdogCheck = isWatchdogBlocking();
  if (watchdogCheck.blocking) {
    // Allow writes to memory/ even when watchdog is blocking
    // (needed for handoff creation)
    const filePath = (input.tool_input?.file_path as string) ||
                     (input.tool_input?.path as string) ||
                     "";
    const normalizedPath = filePath.replace(/\\/g, "/");

    // Allow memory/, handoff files, and watchdog state
    const allowedPaths = ["memory/", "HANDOFF.md", "handoff-state.json", "watchdog-state.json"];
    const isAllowed = allowedPaths.some(p =>
      normalizedPath.includes(p) || normalizedPath.endsWith(p)
    );

    if (!isAllowed) {
      const response: BlockResponse = {
        decision: "block",
        reason: `BLOCKED: ${watchdogCheck.message}`,
      };
      console.log(JSON.stringify(response));
      process.exit(2);
    }
  }
  
  // Get the file path from tool input
  const filePath = (input.tool_input?.file_path as string) ||
                   (input.tool_input?.path as string) ||
                   "";
  
  if (!filePath) {
    // No file path found, allow (might be a different operation)
    const response: AllowResponse = { decision: "approve" };
    console.log(JSON.stringify(response));
    process.exit(0);
  }
  
  // Check against never-write list
  const neverWriteReason = checkNeverWrite(filePath, input.cwd);
  if (neverWriteReason) {
    const response: BlockResponse = {
      decision: "block",
      reason: `BLOCKED: ${neverWriteReason}`,
    };
    console.log(JSON.stringify(response));
    process.exit(2);
  }
  
  // Check against system paths
  const systemPathReason = checkSystemPaths(filePath);
  if (systemPathReason) {
    const response: BlockResponse = {
      decision: "block",
      reason: `BLOCKED: ${systemPathReason}`,
    };
    console.log(JSON.stringify(response));
    process.exit(2);
  }
  
  // Log sensitive file modifications (but allow)
  if (isSensitiveFile(filePath)) {
    await logSensitiveModification(filePath, input.tool_name);
  }
  
  // Check worktree isolation (opt-in via CCPLATE_WORKTREE env var)
  const assignedWorktree = getAssignedWorktree();
  if (assignedWorktree) {
    if (!validateWorktreeAccess(filePath, assignedWorktree, input.cwd)) {
      const response: BlockResponse = {
        decision: "block",
        reason: `BLOCKED: Worktree isolation - agent assigned to "${assignedWorktree}" cannot write to ${filePath}. Allowed: .worktrees/${assignedWorktree}/**, memory/**, .claude/agents/**`,
      };
      console.log(JSON.stringify(response));
      process.exit(2);
    }
  }
  
  // Allow the operation
  const response: AllowResponse = { decision: "approve" };
  console.log(JSON.stringify(response));
  process.exit(0);
}

main().catch((error) => {
  logHookError("unhandled", error);
  const response: BlockResponse = {
    decision: "block",
    reason: `Hook error: ${error instanceof Error ? error.message : "Unknown error"}`,
  };
  console.log(JSON.stringify(response));
  process.exit(2);
});
