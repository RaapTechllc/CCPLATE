/**
 * Activity Narrator
 * 
 * Appends human-readable lines to memory/ACTIVITY.md
 * Format: "Loop N: <action>; X/Y tasks remain"
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import { join, basename } from "path";

export interface ActivityEntry {
  timestamp: string;
  loop: number;
  status: "start" | "progress" | "error" | "test_fail" | "test_pass" | "complete" | "hitl";
  activity: string;
  worktree?: string;
  tasksRemaining?: number;
  totalTasks?: number;
}

export interface NarratorState {
  currentLoop: number;
  sessionId: string | null;
  lastActivity: string | null;
}

const ACTIVITY_FILE = "ACTIVITY.md";
const NARRATOR_STATE_FILE = "narrator-state.json";

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function loadNarratorState(rootDir: string): NarratorState {
  const path = join(rootDir, "memory", NARRATOR_STATE_FILE);
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf-8"));
    }
  } catch {
    // Fall through
  }
  return {
    currentLoop: 0,
    sessionId: null,
    lastActivity: null,
  };
}

export function saveNarratorState(rootDir: string, state: NarratorState): void {
  const memoryDir = join(rootDir, "memory");
  ensureDir(memoryDir);
  const path = join(memoryDir, NARRATOR_STATE_FILE);
  writeFileSync(path, JSON.stringify(state, null, 2) + "\n");
}

function getStatusEmoji(status: ActivityEntry["status"]): string {
  switch (status) {
    case "start": return "🚀";
    case "progress": return "⏳";
    case "error": return "⚠️";
    case "test_fail": return "❌";
    case "test_pass": return "✅";
    case "complete": return "✅";
    case "hitl": return "🚧";
    default: return "📝";
  }
}

function formatActivityLine(entry: ActivityEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  
  const emoji = getStatusEmoji(entry.status);
  const worktreeTag = entry.worktree ? ` \`${entry.worktree}\` |` : "";
  
  let taskInfo = "";
  if (entry.tasksRemaining !== undefined && entry.totalTasks !== undefined) {
    taskInfo = ` (${entry.totalTasks - entry.tasksRemaining}/${entry.totalTasks} tasks)`;
  }
  
  return `| ${time} | Loop ${entry.loop} | ${emoji} |${worktreeTag} ${entry.activity}${taskInfo} |`;
}

export function appendActivity(rootDir: string, entry: ActivityEntry): void {
  const memoryDir = join(rootDir, "memory");
  ensureDir(memoryDir);
  
  const activityPath = join(memoryDir, ACTIVITY_FILE);
  
  // Create file with header if it doesn't exist
  if (!existsSync(activityPath)) {
    const header = `# Activity Log

> Human-readable log of Guardian activity. Scan this to catch up quickly.

| Time | Loop | Status | Activity |
|------|------|--------|----------|
`;
    writeFileSync(activityPath, header);
  }
  
  const line = formatActivityLine(entry);
  appendFileSync(activityPath, line + "\n");
}

export function narrateToolUse(
  rootDir: string,
  toolName: string,
  toolInput: Record<string, unknown>,
  sessionId: string,
  worktreeId?: string
): void {
  const state = loadNarratorState(rootDir);
  
  // Detect new session
  if (state.sessionId !== sessionId) {
    state.currentLoop = 1;
    state.sessionId = sessionId;
    state.lastActivity = null;
    saveNarratorState(rootDir, state);
  }
  
  // Determine activity description based on tool
  let activity = "";
  let status: ActivityEntry["status"] = "progress";
  
  switch (toolName) {
    case "Write":
    case "create_file": {
      const path = (toolInput.path as string) || "";
      const fileName = basename(path);
      activity = `**Writing file** - ${fileName}`;
      break;
    }
    case "Edit":
    case "edit_file": {
      const path = (toolInput.path as string) || "";
      const fileName = basename(path);
      activity = `**Editing file** - ${fileName}`;
      break;
    }
    case "Read": {
      // Don't log every read - too noisy
      return;
    }
    case "Bash": {
      const command = (toolInput.command as string) || "";
      
      // Detect test commands
      if (/playwright\s+test|npm\s+(run\s+)?test|jest|vitest/.test(command)) {
        activity = `**Running tests**`;
        status = "progress";
      } else if (/git\s+commit/.test(command)) {
        activity = `**Committing changes**`;
        status = "progress";
      } else if (/git\s+push/.test(command)) {
        activity = `**Pushing changes**`;
        status = "progress";
      } else if (/npm\s+(run\s+)?build|next\s+build/.test(command)) {
        activity = `**Building project**`;
        status = "progress";
      } else if (/npm\s+install|pnpm\s+install|yarn\s+install/.test(command)) {
        activity = `**Installing dependencies**`;
        status = "progress";
      } else {
        // Don't log generic bash commands
        return;
      }
      break;
    }
    case "Grep":
    case "glob":
    case "finder":
      // Don't log search operations - too noisy
      return;
    default:
      // Don't log other tools
      return;
  }
  
  // Avoid duplicate consecutive activities
  if (state.lastActivity === activity) {
    return;
  }
  
  state.lastActivity = activity;
  saveNarratorState(rootDir, state);
  
  appendActivity(rootDir, {
    timestamp: new Date().toISOString(),
    loop: state.currentLoop,
    status,
    activity,
    worktree: worktreeId,
  });
}

export function narrateTestResult(
  rootDir: string,
  testFile: string,
  passed: boolean,
  errorMessage?: string
): void {
  const state = loadNarratorState(rootDir);
  const fileName = basename(testFile);
  
  const entry: ActivityEntry = {
    timestamp: new Date().toISOString(),
    loop: state.currentLoop,
    status: passed ? "test_pass" : "test_fail",
    activity: passed 
      ? `**Test passed** - ${fileName}`
      : `**Test failed** - ${fileName}${errorMessage ? ` (${errorMessage.slice(0, 50)})` : ""}`,
  };
  
  appendActivity(rootDir, entry);
  
  state.lastActivity = entry.activity;
  saveNarratorState(rootDir, state);
}

export function narrateTaskStart(
  rootDir: string,
  taskDescription: string,
  worktreeId?: string
): void {
  const state = loadNarratorState(rootDir);
  
  const entry: ActivityEntry = {
    timestamp: new Date().toISOString(),
    loop: state.currentLoop,
    status: "start",
    activity: `**Started task** - ${taskDescription}`,
    worktree: worktreeId,
  };
  
  appendActivity(rootDir, entry);
  
  state.lastActivity = entry.activity;
  saveNarratorState(rootDir, state);
}

export function narrateTaskComplete(
  rootDir: string,
  taskDescription: string,
  tasksRemaining: number,
  totalTasks: number
): void {
  const state = loadNarratorState(rootDir);
  
  const entry: ActivityEntry = {
    timestamp: new Date().toISOString(),
    loop: state.currentLoop,
    status: "complete",
    activity: `**Task complete** - ${taskDescription}`,
    tasksRemaining,
    totalTasks,
  };
  
  appendActivity(rootDir, entry);
  
  state.lastActivity = entry.activity;
  saveNarratorState(rootDir, state);
}

export function narrateHITLRequest(
  rootDir: string,
  title: string
): void {
  const state = loadNarratorState(rootDir);
  
  const entry: ActivityEntry = {
    timestamp: new Date().toISOString(),
    loop: state.currentLoop,
    status: "hitl",
    activity: `**Awaiting HITL** - ${title}`,
  };
  
  appendActivity(rootDir, entry);
  
  state.lastActivity = entry.activity;
  saveNarratorState(rootDir, state);
}

export function narrateError(
  rootDir: string,
  errorDescription: string
): void {
  const state = loadNarratorState(rootDir);
  
  const entry: ActivityEntry = {
    timestamp: new Date().toISOString(),
    loop: state.currentLoop,
    status: "error",
    activity: `**Error** - ${errorDescription.slice(0, 100)}`,
  };
  
  appendActivity(rootDir, entry);
  
  state.lastActivity = entry.activity;
  saveNarratorState(rootDir, state);
}

export function narrateFixAttempt(
  rootDir: string,
  description: string
): void {
  const state = loadNarratorState(rootDir);
  
  const entry: ActivityEntry = {
    timestamp: new Date().toISOString(),
    loop: state.currentLoop,
    status: "progress",
    activity: `**Fix attempt** - ${description}`,
  };
  
  appendActivity(rootDir, entry);
  
  state.lastActivity = entry.activity;
  saveNarratorState(rootDir, state);
}

export function incrementLoop(rootDir: string): number {
  const state = loadNarratorState(rootDir);
  state.currentLoop++;
  saveNarratorState(rootDir, state);
  return state.currentLoop;
}

export function getCurrentLoop(rootDir: string): number {
  const state = loadNarratorState(rootDir);
  return state.currentLoop || 1;
}

export function clearActivityLog(rootDir: string): void {
  const activityPath = join(rootDir, "memory", ACTIVITY_FILE);
  if (existsSync(activityPath)) {
    const header = `# Activity Log

> Human-readable log of Guardian activity. Scan this to catch up quickly.

| Time | Loop | Status | Activity |
|------|------|--------|----------|
`;
    writeFileSync(activityPath, header);
  }
}
