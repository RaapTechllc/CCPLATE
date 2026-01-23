/**
 * Claude Code Pre-Tool-Use Hook
 * Damage control for bash commands
 * 
 * Cross-platform (Windows/Mac/Linux) using Bun
 * Install Bun: curl -fsSL https://bun.sh/install | bash
 * 
 * Exit codes:
 * - 0: Allow the command
 * - 2: Block the command (with reason)
 */

import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const MEMORY_DIR = join(process.env.CLAUDE_PROJECT_DIR || ".", "memory");

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
    operation: `pre-tool-use:${operation}`,
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
    },
    input: input !== undefined ? String(input).slice(0, 500) : undefined,
    severity: "error",
  };
  
  const errorLogPath = join(MEMORY_DIR, "guardian-errors.log");
  try {
    appendFileSync(errorLogPath, JSON.stringify(errorEntry) + "\n");
    console.error(`❌ [Guardian pre-tool-use] ${operation}: ${err.message}`);
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

export type HookResponse = BlockResponse | AllowResponse;

// Dangerous command patterns - add more as you discover them
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Catastrophic deletions
  { pattern: /rm\s+-rf\s+\/(?!\w)/, reason: "Recursive delete at filesystem root" },
  { pattern: /rm\s+-rf\s+~\/?\s*$/, reason: "Recursive delete of home directory" },
  { pattern: /rm\s+--no-preserve-root/, reason: "No-preserve-root flag is dangerous" },
  { pattern: /rm\s+-rf\s+\*/, reason: "Recursive delete with wildcard" },
  
  // Disk operations
  { pattern: />\s*\/dev\/sd[a-z]/, reason: "Writing directly to block device" },
  { pattern: /dd\s+.*of=\/dev\//, reason: "Raw disk write operation" },
  { pattern: /mkfs\./, reason: "Filesystem format operation" },
  { pattern: /fdisk/, reason: "Disk partitioning operation" },
  
  // Fork bombs and resource exhaustion
  { pattern: /:\(\)\s*\{\s*:\|:&\s*\}\s*;?\s*:/, reason: "Fork bomb detected" },
  { pattern: /while\s+true.*do.*done.*&/, reason: "Infinite background loop" },
  
  // Remote code execution
  { pattern: /curl\s+.*\|\s*(ba)?sh/, reason: "Piping remote content to shell" },
  { pattern: /wget\s+.*\|\s*(ba)?sh/, reason: "Piping remote content to shell" },
  { pattern: /curl\s+.*>\s*.*\.sh\s*&&\s*(ba)?sh/, reason: "Download and execute script" },
  
  // Privilege escalation
  { pattern: /sudo\s+su\s*$/, reason: "Unrestricted sudo su" },
  { pattern: /chmod\s+777\s+\//, reason: "World-writable permissions on root paths" },
  { pattern: /chown\s+-R\s+.*\s+\/(?!\w)/, reason: "Recursive chown at root" },
  
  // Git dangers
  { pattern: /git\s+push\s+.*--force\s+.*main/, reason: "Force push to main branch" },
  { pattern: /git\s+push\s+.*--force\s+.*master/, reason: "Force push to master branch" },
  { pattern: /git\s+reset\s+--hard\s+HEAD~\d{2,}/, reason: "Hard reset more than 10 commits" },
  
  // Database dangers
  { pattern: /DROP\s+DATABASE/i, reason: "DROP DATABASE command" },
  { pattern: /DROP\s+TABLE\s+(?!IF\s+EXISTS)/i, reason: "DROP TABLE without IF EXISTS" },
  { pattern: /TRUNCATE\s+TABLE/i, reason: "TRUNCATE TABLE command" },
  { pattern: /DELETE\s+FROM\s+\w+\s*;/i, reason: "DELETE without WHERE clause" },
  
  // Environment destruction
  { pattern: /unset\s+PATH/, reason: "Unsetting PATH variable" },
  { pattern: /export\s+PATH\s*=\s*["']?\s*["']?/, reason: "Clearing PATH variable" },
];

// Paths that should never be accessed
const PROTECTED_PATHS: string[] = [
  "~/.ssh/",
  "~/.aws/",
  "~/.gnupg/",
  "~/.config/gcloud/",
  "/etc/passwd",
  "/etc/shadow",
  "/etc/sudoers",
  ".env",
  "secrets/",
  "*.pem",
  "*.key",
];

// Check if command touches protected paths
function checkProtectedPaths(command: string): string | null {
  const normalizedCommand = command.replace(/~/g, process.env.HOME || "~");
  
  for (const protectedPath of PROTECTED_PATHS) {
    const pathPattern = protectedPath
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/~/g, process.env.HOME || "~");
    
    if (new RegExp(pathPattern).test(normalizedCommand)) {
      return `Protected path access: ${protectedPath}`;
    }
  }
  
  return null;
}

// Check command against dangerous patterns
function checkDangerousPatterns(command: string): string | null {
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return reason;
    }
  }
  return null;
}

// Log blocked commands for learning
async function logBlockedCommand(command: string, reason: string): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    command,
    reason,
    blocked: true,
  };
  
  const logPath = `${process.env.CLAUDE_PROJECT_DIR || "."}/memory/blocked-commands.jsonl`;
  
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
    // Read JSON from stdin
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
    // If we can't parse input, block by default
    const response: BlockResponse = {
      decision: "block",
      reason: "Failed to parse hook input",
    };
    console.log(JSON.stringify(response));
    process.exit(2);
  }
  
  // Only check Bash commands
  if (input.tool_name !== "Bash") {
    const response: AllowResponse = { decision: "approve" };
    console.log(JSON.stringify(response));
    process.exit(0);
  }
  
  const command = (input.tool_input?.command as string) || "";
  
  // Check dangerous patterns
  const patternReason = checkDangerousPatterns(command);
  if (patternReason) {
    await logBlockedCommand(command, patternReason);
    const response: BlockResponse = {
      decision: "block",
      reason: `BLOCKED: ${patternReason}`,
    };
    console.log(JSON.stringify(response));
    process.exit(2);
  }
  
  // Check protected paths
  const pathReason = checkProtectedPaths(command);
  if (pathReason) {
    await logBlockedCommand(command, pathReason);
    const response: BlockResponse = {
      decision: "block",
      reason: `BLOCKED: ${pathReason}`,
    };
    console.log(JSON.stringify(response));
    process.exit(2);
  }
  
  // Allow the command
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
