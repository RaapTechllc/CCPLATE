/**
 * Relay Race Protocol - Session Handoff System
 *
 * Provides automated session handoff to preserve state between sessions.
 * Creates human-readable HANDOFF.md and machine-readable handoff-state.json.
 */

import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { join, basename } from "path";

// ============================================================================
// Types
// ============================================================================

export interface HandoffMetadata {
  createdAt: string;
  reason: HandoffReason;
  contextPressure: number;
  sessionId?: string;
  branch?: string;
  commit?: string;
}

export type HandoffReason =
  | "manual"
  | "context_critical"
  | "context_forced"
  | "session_end"
  | "user_request";

export interface TaskState {
  description: string;
  status: "in_progress" | "blocked" | "pending";
  remainingSteps: string[];
}

export interface HandoffDecision {
  description: string;
  timestamp: string;
}

export interface CriticalFile {
  path: string;
  reason: string;
}

export interface HandoffState {
  metadata: HandoffMetadata;
  currentTask: TaskState | null;
  recentDecisions: HandoffDecision[];
  criticalFiles: CriticalFile[];
  nextActions: string[];
  workflowState?: Record<string, unknown>;
}

// ============================================================================
// Paths
// ============================================================================

function getPaths(rootDir: string) {
  return {
    handoffMd: join(rootDir, "memory", "HANDOFF.md"),
    handoffJson: join(rootDir, "memory", "handoff-state.json"),
    workflowState: join(rootDir, "memory", "workflow-state.json"),
    activityLog: join(rootDir, "memory", "ACTIVITY.md"),
    archive: join(rootDir, "memory", "handoff-archive"),
  };
}

// ============================================================================
// Git Helpers
// ============================================================================

function getCurrentBranch(rootDir: string): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: rootDir,
      encoding: "utf-8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function getCurrentCommit(rootDir: string): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: rootDir,
      encoding: "utf-8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function getRecentChangedFiles(rootDir: string, limit = 10): string[] {
  try {
    const output = execSync("git diff --name-only HEAD~5 HEAD 2>/dev/null || git diff --name-only", {
      cwd: rootDir,
      encoding: "utf-8",
    });
    return output.split("\n").filter(Boolean).slice(0, limit);
  } catch {
    return [];
  }
}

// ============================================================================
// State Loading
// ============================================================================

function loadWorkflowState(rootDir: string): Record<string, unknown> {
  const paths = getPaths(rootDir);

  if (!existsSync(paths.workflowState)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(paths.workflowState, "utf-8"));
  } catch {
    return {};
  }
}

function extractRecentActivity(rootDir: string, lines = 10): string[] {
  const paths = getPaths(rootDir);

  if (!existsSync(paths.activityLog)) {
    return [];
  }

  try {
    const content = readFileSync(paths.activityLog, "utf-8");
    const activityLines = content.split("\n").filter(line =>
      line.startsWith("|") && !line.includes("Time") && !line.includes("---")
    );
    return activityLines.slice(-lines);
  } catch {
    return [];
  }
}

// ============================================================================
// Handoff Creation
// ============================================================================

/**
 * Create a session handoff
 */
export function createHandoff(
  rootDir: string,
  options: {
    reason?: HandoffReason;
    currentTask?: TaskState;
    nextActions?: string[];
    criticalFiles?: CriticalFile[];
    decisions?: HandoffDecision[];
  } = {}
): { success: boolean; message: string; paths?: { md: string; json: string } } {
  const paths = getPaths(rootDir);

  // Ensure memory directory exists
  if (!existsSync(join(rootDir, "memory"))) {
    mkdirSync(join(rootDir, "memory"), { recursive: true });
  }

  // Load current state
  const workflowState = loadWorkflowState(rootDir);
  const contextPressure = (workflowState.context_pressure as number) || 0;

  // Determine reason
  const reason = options.reason || "manual";

  // Build handoff state
  const state: HandoffState = {
    metadata: {
      createdAt: new Date().toISOString(),
      reason,
      contextPressure,
      sessionId: workflowState.session_id as string | undefined,
      branch: getCurrentBranch(rootDir),
      commit: getCurrentCommit(rootDir),
    },
    currentTask: options.currentTask || extractCurrentTask(workflowState),
    recentDecisions: options.decisions || [],
    criticalFiles: options.criticalFiles || extractCriticalFiles(rootDir),
    nextActions: options.nextActions || extractNextActions(workflowState),
    workflowState: {
      files_changed: workflowState.files_changed,
      current_prp_step: workflowState.current_prp_step,
      total_prp_steps: workflowState.total_prp_steps,
      errors_detected: workflowState.errors_detected,
    },
  };

  // Archive existing handoff if present
  if (existsSync(paths.handoffMd)) {
    archiveHandoff(rootDir);
  }

  // Generate markdown
  const markdown = generateHandoffMarkdown(state, rootDir);

  // Save files
  try {
    writeFileSync(paths.handoffMd, markdown);
    writeFileSync(paths.handoffJson, JSON.stringify(state, null, 2) + "\n");

    return {
      success: true,
      message: `Handoff created: ${basename(paths.handoffMd)}`,
      paths: { md: paths.handoffMd, json: paths.handoffJson },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create handoff: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Extract current task from workflow state
 */
function extractCurrentTask(workflowState: Record<string, unknown>): TaskState | null {
  // Try to extract from pending nudges or other state
  const pendingNudges = workflowState.pending_nudges as string[] | undefined;

  if (pendingNudges && pendingNudges.length > 0) {
    return {
      description: "Ongoing work (check recent activity)",
      status: "in_progress",
      remainingSteps: pendingNudges,
    };
  }

  return null;
}

/**
 * Extract critical files from recent changes
 */
function extractCriticalFiles(rootDir: string): CriticalFile[] {
  const changedFiles = getRecentChangedFiles(rootDir, 5);

  return changedFiles.map(file => ({
    path: file,
    reason: "Recently modified",
  }));
}

/**
 * Extract next actions from workflow state
 */
function extractNextActions(workflowState: Record<string, unknown>): string[] {
  const actions: string[] = [];

  // Check for uncommitted files
  const filesChanged = workflowState.files_changed as number | undefined;
  if (filesChanged && filesChanged > 0) {
    actions.push(`Commit ${filesChanged} uncommitted file(s)`);
  }

  // Check for errors
  const errors = workflowState.errors_detected as string[] | undefined;
  if (errors && errors.length > 0) {
    actions.push(`Address ${errors.length} detected error(s)`);
  }

  // Check for test failures
  const playwrightRun = workflowState.playwright_last_run as { failed?: number } | undefined;
  if (playwrightRun?.failed && playwrightRun.failed > 0) {
    actions.push(`Fix ${playwrightRun.failed} failing test(s)`);
  }

  return actions;
}

/**
 * Generate handoff markdown
 */
function generateHandoffMarkdown(state: HandoffState, rootDir: string): string {
  const { metadata, currentTask, recentDecisions, criticalFiles, nextActions } = state;

  const reasonText = {
    manual: "Manual handoff",
    context_critical: "Context pressure critical",
    context_forced: "Context pressure forced",
    session_end: "Session ended",
    user_request: "User requested",
  }[metadata.reason];

  let md = `# Session Handoff

> Generated: ${new Date(metadata.createdAt).toLocaleString()}
> Reason: ${reasonText}
> Context Used: ${Math.round(metadata.contextPressure * 100)}%

## Current State

**Branch:** ${metadata.branch}
**Commit:** ${metadata.commit}

`;

  // Current Task
  if (currentTask) {
    md += `## Active Task

${currentTask.description}

**Status:** ${currentTask.status}

`;

    if (currentTask.remainingSteps.length > 0) {
      md += `### Remaining Steps
`;
      currentTask.remainingSteps.forEach((step, i) => {
        md += `${i + 1}. ${step}\n`;
      });
      md += "\n";
    }
  }

  // Next Actions
  if (nextActions.length > 0) {
    md += `## Next Actions

`;
    nextActions.forEach((action, i) => {
      md += `${i + 1}. ${action}\n`;
    });
    md += "\n";
  }

  // Recent Decisions
  if (recentDecisions.length > 0) {
    md += `## Key Decisions

`;
    recentDecisions.forEach(decision => {
      md += `- ${decision.description}\n`;
    });
    md += "\n";
  }

  // Critical Files
  if (criticalFiles.length > 0) {
    md += `## Critical Files

| File | Reason |
|------|--------|
`;
    criticalFiles.forEach(file => {
      md += `| ${file.path} | ${file.reason} |\n`;
    });
    md += "\n";
  }

  // Recent Activity
  const recentActivity = extractRecentActivity(rootDir, 5);
  if (recentActivity.length > 0) {
    md += `## Recent Activity

| Time | Loop | Status | Activity |
|------|------|--------|----------|
`;
    recentActivity.forEach(line => {
      md += `${line}\n`;
    });
    md += "\n";
  }

  md += `---
*Read this file to continue where you left off.*
`;

  return md;
}

/**
 * Archive existing handoff
 */
function archiveHandoff(rootDir: string): void {
  const paths = getPaths(rootDir);

  if (!existsSync(paths.archive)) {
    mkdirSync(paths.archive, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  try {
    if (existsSync(paths.handoffMd)) {
      renameSync(paths.handoffMd, join(paths.archive, `HANDOFF-${timestamp}.md`));
    }
    if (existsSync(paths.handoffJson)) {
      renameSync(paths.handoffJson, join(paths.archive, `handoff-state-${timestamp}.json`));
    }
  } catch {
    // Silently fail
  }
}

// ============================================================================
// Handoff Detection
// ============================================================================

/**
 * Check if a handoff file exists
 */
export function hasHandoff(rootDir: string): boolean {
  const paths = getPaths(rootDir);
  return existsSync(paths.handoffMd);
}

/**
 * Load existing handoff state
 */
export function loadHandoff(rootDir: string): HandoffState | null {
  const paths = getPaths(rootDir);

  if (!existsSync(paths.handoffJson)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(paths.handoffJson, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Get handoff detection message for session start
 */
export function getHandoffDetectionMessage(rootDir: string): string | null {
  if (!hasHandoff(rootDir)) {
    return null;
  }

  const state = loadHandoff(rootDir);
  if (!state) {
    return `📋 HANDOFF DETECTED - Read memory/HANDOFF.md to continue`;
  }

  const pct = Math.round(state.metadata.contextPressure * 100);
  const taskInfo = state.currentTask
    ? ` Task: ${state.currentTask.description}`
    : "";

  return `📋 HANDOFF DETECTED (${state.metadata.reason}, ${pct}% context)${taskInfo}
   Read: memory/HANDOFF.md`;
}

/**
 * Clear handoff after restoration
 */
export function clearHandoff(rootDir: string): void {
  archiveHandoff(rootDir);
}

/**
 * Format handoff for display
 */
export function formatHandoff(state: HandoffState): string {
  let output = `\n📋 Session Handoff\n${"─".repeat(40)}\n`;

  output += `Created: ${new Date(state.metadata.createdAt).toLocaleString()}\n`;
  output += `Reason: ${state.metadata.reason}\n`;
  output += `Context: ${Math.round(state.metadata.contextPressure * 100)}%\n`;
  output += `Branch: ${state.metadata.branch}\n`;

  if (state.currentTask) {
    output += `\nCurrent Task: ${state.currentTask.description}\n`;
    output += `Status: ${state.currentTask.status}\n`;
  }

  if (state.nextActions.length > 0) {
    output += `\nNext Actions:\n`;
    state.nextActions.forEach((action, i) => {
      output += `  ${i + 1}. ${action}\n`;
    });
  }

  if (state.criticalFiles.length > 0) {
    output += `\nCritical Files:\n`;
    state.criticalFiles.forEach(file => {
      output += `  - ${file.path}\n`;
    });
  }

  output += `${"─".repeat(40)}\n`;
  return output;
}
