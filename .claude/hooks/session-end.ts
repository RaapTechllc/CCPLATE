/**
 * CCPLATE Session End Hook (Stop)
 *
 * Triggers when the Claude Code session ends.
 * Creates automatic handoff if context pressure is at force threshold.
 *
 * Exit codes:
 * - 0: Success (hook completed)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, renameSync } from "fs";
import { join, basename } from "path";
import { execSync } from "child_process";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || ".";
const MEMORY_DIR = join(PROJECT_DIR, "memory");
const WORKFLOW_STATE_PATH = join(MEMORY_DIR, "workflow-state.json");
const WATCHDOG_STATE_PATH = join(MEMORY_DIR, "watchdog-state.json");
const HANDOFF_MD_PATH = join(MEMORY_DIR, "HANDOFF.md");
const HANDOFF_JSON_PATH = join(MEMORY_DIR, "handoff-state.json");
const HANDOFF_ARCHIVE_DIR = join(MEMORY_DIR, "handoff-archive");

// ============================================================================
// Types
// ============================================================================

interface StopHookInput {
  stop_hook_active: boolean;
  session_id: string;
}

interface WorkflowState {
  session_id: string | null;
  files_changed: number;
  context_pressure: number;
  errors_detected: string[];
  current_prp_step: number;
  total_prp_steps: number;
  pending_nudges: string[];
  playwright_last_run?: {
    passed: number;
    failed: number;
    total: number;
  };
  [key: string]: unknown;
}

interface WatchdogState {
  severity: "normal" | "warning" | "orange" | "critical" | "force";
  contextPressure: number;
  blocking: boolean;
  message: string;
}

interface HandoffMetadata {
  createdAt: string;
  reason: string;
  contextPressure: number;
  sessionId?: string;
  branch?: string;
  commit?: string;
}

interface HandoffState {
  metadata: HandoffMetadata;
  currentTask: { description: string; status: string; remainingSteps: string[] } | null;
  recentDecisions: Array<{ description: string; timestamp: string }>;
  criticalFiles: Array<{ path: string; reason: string }>;
  nextActions: string[];
  workflowState: Record<string, unknown>;
}

// ============================================================================
// Helpers
// ============================================================================

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadJSON<T>(path: string, defaultValue: T): T {
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf-8"));
    }
  } catch {
    // Ignore
  }
  return defaultValue;
}

function getCurrentBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: PROJECT_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function getCurrentCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: PROJECT_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function getRecentFiles(limit = 5): Array<{ path: string; reason: string }> {
  try {
    const output = execSync("git diff --name-only HEAD~3 HEAD 2>/dev/null || echo ''", {
      cwd: PROJECT_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return output
      .split("\n")
      .filter(Boolean)
      .slice(0, limit)
      .map(path => ({ path, reason: "Recently modified" }));
  } catch {
    return [];
  }
}

function archiveExistingHandoff(): void {
  if (!existsSync(HANDOFF_MD_PATH)) {
    return;
  }

  ensureDir(HANDOFF_ARCHIVE_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  try {
    if (existsSync(HANDOFF_MD_PATH)) {
      renameSync(HANDOFF_MD_PATH, join(HANDOFF_ARCHIVE_DIR, `HANDOFF-${timestamp}.md`));
    }
    if (existsSync(HANDOFF_JSON_PATH)) {
      renameSync(HANDOFF_JSON_PATH, join(HANDOFF_ARCHIVE_DIR, `handoff-state-${timestamp}.json`));
    }
  } catch {
    // Silently fail
  }
}

function logHookError(operation: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const errorEntry = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source: "session_end_hook",
    operation,
    error: {
      message: err.message,
      name: err.name,
    },
  };

  try {
    const errorLogPath = join(MEMORY_DIR, "guardian-errors.log");
    appendFileSync(errorLogPath, JSON.stringify(errorEntry) + "\n");
  } catch {
    // Can't write log
  }
}

// ============================================================================
// Handoff Creation
// ============================================================================

function createAutoHandoff(
  workflowState: WorkflowState,
  watchdogState: WatchdogState
): void {
  const contextPressure = watchdogState.contextPressure || workflowState.context_pressure || 0;

  // Build next actions
  const nextActions: string[] = [];
  if (workflowState.files_changed > 0) {
    nextActions.push(`Commit ${workflowState.files_changed} uncommitted file(s)`);
  }
  if (workflowState.errors_detected?.length > 0) {
    nextActions.push(`Address ${workflowState.errors_detected.length} detected error(s)`);
  }
  if (workflowState.playwright_last_run?.failed) {
    nextActions.push(`Fix ${workflowState.playwright_last_run.failed} failing test(s)`);
  }

  // Build handoff state
  const handoffState: HandoffState = {
    metadata: {
      createdAt: new Date().toISOString(),
      reason: watchdogState.severity === "force" ? "context_forced" : "session_end",
      contextPressure,
      sessionId: workflowState.session_id || undefined,
      branch: getCurrentBranch(),
      commit: getCurrentCommit(),
    },
    currentTask: workflowState.pending_nudges?.length > 0
      ? {
          description: "Ongoing work (check recent activity)",
          status: "in_progress",
          remainingSteps: workflowState.pending_nudges,
        }
      : null,
    recentDecisions: [],
    criticalFiles: getRecentFiles(5),
    nextActions,
    workflowState: {
      files_changed: workflowState.files_changed,
      current_prp_step: workflowState.current_prp_step,
      total_prp_steps: workflowState.total_prp_steps,
      errors_detected: workflowState.errors_detected,
    },
  };

  // Generate markdown
  const markdown = generateHandoffMarkdown(handoffState);

  // Archive existing and save new
  archiveExistingHandoff();
  writeFileSync(HANDOFF_MD_PATH, markdown);
  writeFileSync(HANDOFF_JSON_PATH, JSON.stringify(handoffState, null, 2) + "\n");

  console.error("\n📋 AUTO-HANDOFF CREATED");
  console.error(`   Context was at ${Math.round(contextPressure * 100)}%`);
  console.error("   Read memory/HANDOFF.md to continue in a new session.\n");
}

function generateHandoffMarkdown(state: HandoffState): string {
  const { metadata, currentTask, criticalFiles, nextActions } = state;

  const reasonText: Record<string, string> = {
    context_forced: "Context pressure forced",
    session_end: "Session ended",
    manual: "Manual handoff",
    context_critical: "Context pressure critical",
    user_request: "User requested",
  };

  let md = `# Session Handoff

> Generated: ${new Date(metadata.createdAt).toLocaleString()}
> Reason: ${reasonText[metadata.reason] || metadata.reason}
> Context Used: ${Math.round(metadata.contextPressure * 100)}%

## Current State

**Branch:** ${metadata.branch}
**Commit:** ${metadata.commit}

`;

  if (currentTask) {
    md += `## Active Task

${currentTask.description}

**Status:** ${currentTask.status}

`;
    if (currentTask.remainingSteps.length > 0) {
      md += "### Remaining Steps\n";
      currentTask.remainingSteps.forEach((step, i) => {
        md += `${i + 1}. ${step}\n`;
      });
      md += "\n";
    }
  }

  if (nextActions.length > 0) {
    md += "## Next Actions\n\n";
    nextActions.forEach((action, i) => {
      md += `${i + 1}. ${action}\n`;
    });
    md += "\n";
  }

  if (criticalFiles.length > 0) {
    md += "## Critical Files\n\n";
    md += "| File | Reason |\n";
    md += "|------|--------|\n";
    criticalFiles.forEach(file => {
      md += `| ${file.path} | ${file.reason} |\n`;
    });
    md += "\n";
  }

  md += `---
*Read this file to continue where you left off.*
`;

  return md;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  ensureDir(MEMORY_DIR);

  let input: StopHookInput;

  try {
    const text = await Bun.stdin.text();

    if (!text || text.trim() === "") {
      // No input, might be a signal-based stop
      input = { stop_hook_active: true, session_id: "" };
    } else {
      input = JSON.parse(text) as StopHookInput;
    }
  } catch (error) {
    logHookError("input_parse", error);
    process.exit(0);
  }

  // Load states
  const workflowState = loadJSON<WorkflowState>(WORKFLOW_STATE_PATH, {
    session_id: null,
    files_changed: 0,
    context_pressure: 0,
    errors_detected: [],
    current_prp_step: 0,
    total_prp_steps: 0,
    pending_nudges: [],
  });

  const watchdogState = loadJSON<WatchdogState>(WATCHDOG_STATE_PATH, {
    severity: "normal",
    contextPressure: 0,
    blocking: false,
    message: "",
  });

  // Check if we should create an auto-handoff
  const shouldAutoHandoff =
    watchdogState.severity === "force" ||
    watchdogState.contextPressure >= 0.95 ||
    (watchdogState.severity === "critical" && workflowState.files_changed > 0);

  if (shouldAutoHandoff) {
    try {
      createAutoHandoff(workflowState, watchdogState);
    } catch (error) {
      logHookError("create_handoff", error);
    }
  }

  // Clear watchdog blocking state for next session
  try {
    const clearedWatchdog: WatchdogState = {
      severity: "normal",
      contextPressure: 0,
      blocking: false,
      message: "",
    };
    writeFileSync(WATCHDOG_STATE_PATH, JSON.stringify(clearedWatchdog, null, 2) + "\n");
  } catch {
    // Silently fail
  }

  process.exit(0);
}

main().catch((error) => {
  logHookError("unhandled", error);
  process.exit(0);
});
