/**
 * CCPLATE Guardian Tick Hook
 * Evaluates workflow state after each tool use and emits nudges
 * 
 * Nudge types:
 * - commit: Too many files changed without commit
 * - test: New code without recent tests
 * - error: Errors detected in output
 * - context: Context pressure too high
 * - playwright: Playwright test failures blocking task completion
 * 
 * Features:
 * - Activity Narrator: Logs human-readable activity to memory/ACTIVITY.md
 * - Playwright Validation Loop: Blocks task completion until tests pass
 * 
 * Exit codes:
 * - 0: Success (nudge may or may not be emitted)
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from "fs";
import { join, basename } from "path";

function ensureDir(dir: string): void {
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Silently fail
  }
}

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output?: string;
  session_id: string;
  cwd: string;
}

interface WorkflowState {
  session_id: string | null;
  current_prp_step: number;
  total_prp_steps: number;
  files_changed: number;
  last_commit_time: string | null;
  last_test_time: string | null;
  context_pressure: number;
  active_worktrees: Array<{ id: string; branch: string; agent: string }>;
  pending_nudges: string[];
  errors_detected: string[];
  lsp_diagnostics_count: number;
  playwright_last_run?: {
    timestamp: string;
    passed: number;
    failed: number;
    total: number;
  };
  playwright_blocked_tasks?: string[];
  fix_loop_active?: boolean;
  fix_loop_attempts?: number;
  watchdog_blocking?: boolean;
  watchdog_severity?: "normal" | "warning" | "orange" | "critical" | "force";
}

interface NudgeCooldown {
  type: string;
  last_triggered: string;
  tool_uses_since: number;
}

interface LSPDiagnostic {
  file: string;
  line: number;
  severity: "error" | "warning" | "info";
  message: string;
}

interface LSPDiagnosticsResult {
  count: number;
  errors: number;
  warnings: number;
  diagnostics: LSPDiagnostic[];
}

interface GuardianState {
  cooldowns: NudgeCooldown[];
  total_tool_uses: number;
  muted_nudges: string[];
  last_lsp_check?: string;
}

interface WatchdogThresholds {
  warning: number;
  orange: number;
  critical: number;
  forceHandoff: number;
}

interface WatchdogConfig {
  enabled: boolean;
  thresholds: WatchdogThresholds;
  blockWritesAtCritical: boolean;
}

interface GuardianConfig {
  guardian: {
    enabled: boolean;
    nudges: {
      commit: { enabled: boolean; filesThreshold: number; minutesThreshold: number };
      test: { enabled: boolean };
      progress: { enabled: boolean };
      context: { enabled: boolean; threshold: number; watchdog?: WatchdogConfig };
      error: { enabled: boolean };
      playwright: { enabled: boolean };
    };
    cooldown: { minutes: number; toolUses: number };
    narrator: { enabled: boolean };
  };
  lsp?: {
    enabled: boolean;
    languages?: string[];
  };
}

interface NudgeEntry {
  timestamp: string;
  type: string;
  message: string;
  tool_trigger: string;
  session_id: string;
}

interface ContextLedgerConsultation {
  timestamp: string;
  query: string;
  sources_checked: Array<{
    type: string;
    pattern?: string;
    files_matched?: number;
    action?: string;
    symbol?: string;
    count?: number;
    file?: string;
    lines?: string;
  }>;
  key_findings: string[];
}

interface ContextLedger {
  session_id: string;
  consultations: ContextLedgerConsultation[];
}

// Used for context pressure tracking (future expansion)
// interface ContextPressureStats {
//   consultations: number;
//   totalExcerpts: number;
//   toolUses: number;
// }

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || ".";
const MEMORY_DIR = join(PROJECT_DIR, "memory");
const WORKFLOW_STATE_PATH = join(MEMORY_DIR, "workflow-state.json");
const GUARDIAN_STATE_PATH = join(MEMORY_DIR, "guardian-state.json");
const NUDGES_LOG_PATH = join(MEMORY_DIR, "guardian-nudges.jsonl");
const NUDGE_LAST_PATH = join(MEMORY_DIR, "guardian-last.txt");
const CONFIG_PATH = join(PROJECT_DIR, "ccplate.config.json");
const CONTEXT_LEDGER_PATH = join(MEMORY_DIR, "context-ledger.json");
const ACTIVITY_LOG_PATH = join(MEMORY_DIR, "ACTIVITY.md");
const NARRATOR_STATE_PATH = join(MEMORY_DIR, "narrator-state.json");
const VALIDATION_STATE_PATH = join(MEMORY_DIR, "playwright-validation.json");
const HANDOFF_PATH = join(MEMORY_DIR, "HANDOFF.md");

function deepMerge<T extends object>(defaults: T, overrides: Partial<T>): T {
  const result = { ...defaults } as Record<string, unknown>;
  for (const key in overrides) {
    const val = overrides[key];
    const defaultVal = (defaults as Record<string, unknown>)[key];
    if (val !== undefined && val !== null) {
      if (typeof val === "object" && !Array.isArray(val) && typeof defaultVal === "object") {
        result[key] = deepMerge(defaultVal as object, val as Partial<object>);
      } else {
        result[key] = val;
      }
    }
  }
  return result as T;
}

function loadJSON<T extends object>(path: string, defaultValue: T): T {
  try {
    if (existsSync(path)) {
      const loaded = JSON.parse(readFileSync(path, "utf-8"));
      return deepMerge(defaultValue, loaded);
    }
  } catch {
    // Fall through to default
  }
  return defaultValue;
}

function saveJSON(path: string, data: unknown): void {
  try {
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  } catch {
    // Silently fail
  }
}

function appendJSONL(path: string, entry: unknown): void {
  try {
    appendFileSync(path, JSON.stringify(entry) + "\n");
  } catch {
    // Silently fail
  }
}

function minutesSince(isoDate: string | null): number {
  if (!isoDate) return Infinity;
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60);
}

function getDefaultGuardianState(): GuardianState {
  return {
    cooldowns: [],
    total_tool_uses: 0,
    muted_nudges: [],
    last_lsp_check: undefined,
  };
}

const LSP_COOLDOWN_MS = 60_000; // 1 minute cooldown for LSP checks

// ============================================================================
// Activity Narrator
// ============================================================================

interface NarratorState {
  currentLoop: number;
  sessionId: string | null;
  lastActivity: string | null;
}

interface ActivityEntry {
  timestamp: string;
  loop: number;
  status: "start" | "progress" | "error" | "test_fail" | "test_pass" | "complete" | "hitl";
  activity: string;
  worktree?: string;
  tasksRemaining?: number;
  totalTasks?: number;
}

function loadNarratorState(): NarratorState {
  return loadJSON<NarratorState>(NARRATOR_STATE_PATH, {
    currentLoop: 1,
    sessionId: null,
    lastActivity: null,
  });
}

function saveNarratorState(state: NarratorState): void {
  saveJSON(NARRATOR_STATE_PATH, state);
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

function ensureActivityLogExists(): void {
  if (!existsSync(ACTIVITY_LOG_PATH)) {
    const header = `# Activity Log

> Human-readable log of Guardian activity. Scan this to catch up quickly.

| Time | Loop | Status | Activity |
|------|------|--------|----------|
`;
    writeFileSync(ACTIVITY_LOG_PATH, header);
  }
}

function appendActivityEntry(entry: ActivityEntry): void {
  ensureActivityLogExists();
  const line = formatActivityLine(entry);
  appendFileSync(ACTIVITY_LOG_PATH, line + "\n");
}

function narrateToolUse(
  toolName: string,
  toolInput: Record<string, unknown>,
  toolOutput: string,
  sessionId: string,
  narratorState: NarratorState
): { activity: string; status: ActivityEntry["status"] } | null {
  // Detect new session
  if (narratorState.sessionId !== sessionId) {
    narratorState.currentLoop = 1;
    narratorState.sessionId = sessionId;
    narratorState.lastActivity = null;
  }
  
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
    case "Read":
    case "Grep":
    case "glob":
    case "finder":
      // Don't log search/read operations - too noisy
      return null;
    case "Bash": {
      const command = (toolInput.command as string) || "";
      
      // Detect Playwright test runs
      if (/playwright\s+test/.test(command)) {
        // Check output for pass/fail
        if (/\d+\s+passed/.test(toolOutput) && !/\d+\s+failed/.test(toolOutput)) {
          activity = `**Tests passed** - Playwright`;
          status = "test_pass";
        } else if (/\d+\s+failed/.test(toolOutput)) {
          const failMatch = toolOutput.match(/(\d+)\s+failed/);
          const failCount = failMatch ? failMatch[1] : "?";
          activity = `**Tests failed** - Playwright (${failCount} failed)`;
          status = "test_fail";
        } else {
          activity = `**Running tests** - Playwright`;
        }
      } else if (/npm\s+(run\s+)?test|jest|vitest/.test(command)) {
        activity = `**Running tests**`;
      } else if (/git\s+commit/.test(command)) {
        activity = `**Committing changes**`;
      } else if (/git\s+push/.test(command)) {
        activity = `**Pushing changes**`;
      } else if (/npm\s+(run\s+)?build|next\s+build/.test(command)) {
        activity = `**Building project**`;
      } else if (/npm\s+install|pnpm\s+install|yarn\s+install/.test(command)) {
        activity = `**Installing dependencies**`;
      } else {
        // Don't log generic bash commands
        return null;
      }
      break;
    }
    default:
      return null;
  }
  
  // Avoid duplicate consecutive activities
  if (narratorState.lastActivity === activity) {
    return null;
  }
  
  narratorState.lastActivity = activity;
  return { activity, status };
}

// ============================================================================
// Playwright Validation
// ============================================================================

interface PlaywrightTestResult {
  passed: number;
  failed: number;
  total: number;
  failedTests: Array<{ file: string; name: string; error?: string }>;
}

interface ValidationState {
  lastRun?: {
    timestamp: string;
    passed: number;
    failed: number;
    total: number;
  };
  blockedTasks: string[];
  fixLoopActive: boolean;
  fixLoopAttempts: number;
  fixLoopTarget?: {
    testFile: string;
    testName: string;
    error: string;
  };
}

function loadValidationState(): ValidationState {
  return loadJSON<ValidationState>(VALIDATION_STATE_PATH, {
    blockedTasks: [],
    fixLoopActive: false,
    fixLoopAttempts: 0,
  });
}

function saveValidationState(state: ValidationState): void {
  saveJSON(VALIDATION_STATE_PATH, state);
}

function parsePlaywrightOutput(output: string): PlaywrightTestResult | null {
  // Parse standard Playwright output
  // Look for summary: "  X passed" or "  X failed"
  const passedMatch = output.match(/(\d+)\s+passed/);
  const failedMatch = output.match(/(\d+)\s+failed/);
  
  if (!passedMatch && !failedMatch) {
    return null;
  }
  
  const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
  const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
  const total = passed + failed;
  
  // Parse failed test details
  // Format: "  ✘  2 [chromium] › auth.spec.ts:17:3 › Auth › Login › should show error (5.2s)"
  const failedTests: Array<{ file: string; name: string; error?: string }> = [];
  const testLinePattern = /✘\s+\d+\s+\[.+?\]\s+›\s+(.+?):[\d:]+\s+›\s+(.+?)(?:\s+\(|$)/gm;
  
  let match;
  while ((match = testLinePattern.exec(output)) !== null) {
    failedTests.push({
      file: match[1],
      name: match[2].trim(),
    });
  }
  
  return { passed, failed, total, failedTests };
}

function detectPlaywrightRun(
  toolName: string,
  toolInput: Record<string, unknown>,
  toolOutput: string
): PlaywrightTestResult | null {
  if (toolName !== "Bash") {
    return null;
  }
  
  const command = (toolInput.command as string) || "";
  
  if (!/playwright\s+test/.test(command)) {
    return null;
  }
  
  return parsePlaywrightOutput(toolOutput);
}

function loadContextLedger(): ContextLedger {
  return loadJSON<ContextLedger>(CONTEXT_LEDGER_PATH, {
    session_id: "",
    consultations: [],
  });
}

// ============================================================================
// Context Watchdog
// ============================================================================

type WatchdogSeverity = "normal" | "warning" | "orange" | "critical" | "force";

interface WatchdogEvaluation {
  severity: WatchdogSeverity;
  blocking: boolean;
  message: string;
}

interface WatchdogStateData {
  severity: WatchdogSeverity;
  contextPressure: number;
  blocking: boolean;
  message: string;
}

const WATCHDOG_STATE_PATH = join(MEMORY_DIR, "watchdog-state.json");

function evaluateContextWatchdog(
  contextPressure: number,
  config: WatchdogConfig
): WatchdogEvaluation {
  const { thresholds, blockWritesAtCritical } = config;

  let severity: WatchdogSeverity = "normal";
  let blocking = false;
  let message = "";

  const pct = Math.round(contextPressure * 100);

  if (contextPressure >= thresholds.forceHandoff) {
    severity = "force";
    blocking = true;
    message = `⛔ Context at ${pct}%! Auto-creating handoff...`;
  } else if (contextPressure >= thresholds.critical) {
    severity = "critical";
    blocking = blockWritesAtCritical;
    message = blocking
      ? `🔴 Context at ${pct}%! Writes blocked. Run: ccplate handoff create`
      : `🔴 Context at ${pct}%! Create a handoff soon.`;
  } else if (contextPressure >= thresholds.orange) {
    severity = "orange";
    message = `🟠 Context at ${pct}%. Consider wrapping up.`;
  } else if (contextPressure >= thresholds.warning) {
    severity = "warning";
    message = `🟡 Context at ${pct}%. Doing great!`;
  }

  return { severity, blocking, message };
}

function saveWatchdogState(state: WatchdogStateData): void {
  try {
    writeFileSync(WATCHDOG_STATE_PATH, JSON.stringify(state, null, 2) + "\n");
  } catch {
    // Silently fail
  }
}

function loadWatchdogState(): WatchdogStateData | null {
  try {
    if (existsSync(WATCHDOG_STATE_PATH)) {
      return JSON.parse(readFileSync(WATCHDOG_STATE_PATH, "utf-8"));
    }
  } catch {
    // Ignore
  }
  return null;
}

function calculateContextPressure(ledger: ContextLedger, toolUses: number): number {
  const consultations = ledger.consultations.length;
  
  let totalExcerpts = 0;
  for (const c of ledger.consultations) {
    // Guard against missing sources_checked array
    if (c.sources_checked && Array.isArray(c.sources_checked)) {
      for (const source of c.sources_checked) {
        if (source.files_matched) {
          totalExcerpts += source.files_matched;
        }
        if (source.count) {
          totalExcerpts += source.count;
        }
        if (source.file) {
          totalExcerpts += 1;
        }
      }
    }
    // Guard against missing key_findings array
    if (c.key_findings && Array.isArray(c.key_findings)) {
      totalExcerpts += c.key_findings.length;
    }
  }
  
  const pressure = (consultations * 0.05) + (totalExcerpts * 0.01) + (toolUses * 0.002);
  return Math.min(1.0, pressure);
}

function shouldRunLSPCheck(guardianState: GuardianState, toolName: string): boolean {
  const writeTools = ["Write", "Edit", "create_file", "edit_file"];
  if (!writeTools.includes(toolName)) {
    return false;
  }
  
  if (!guardianState.last_lsp_check) {
    return true;
  }
  
  const elapsed = Date.now() - new Date(guardianState.last_lsp_check).getTime();
  return elapsed >= LSP_COOLDOWN_MS;
}

async function getLSPDiagnostics(projectDir: string): Promise<LSPDiagnosticsResult> {
  const emptyResult: LSPDiagnosticsResult = { count: 0, errors: 0, warnings: 0, diagnostics: [] };
  
  try {
    const proc = Bun.spawn(["npx", "tsc", "--noEmit", "--pretty", "false"], {
      cwd: projectDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    
    if (exitCode === 0) {
      return emptyResult;
    }
    
    const diagnostics: LSPDiagnostic[] = [];
    const lines = stdout.split("\n").filter(Boolean);
    
    // Parse tsc output format: file(line,col): error TS####: message
    const tscPattern = /^(.+?)\((\d+),\d+\):\s*(error|warning)\s+TS\d+:\s*(.+)$/;
    
    for (const line of lines) {
      const match = line.match(tscPattern);
      if (match) {
        diagnostics.push({
          file: match[1],
          line: parseInt(match[2], 10),
          severity: match[3] as "error" | "warning",
          message: match[4],
        });
      }
    }
    
    const errors = diagnostics.filter(d => d.severity === "error").length;
    const warnings = diagnostics.filter(d => d.severity === "warning").length;
    
    return {
      count: diagnostics.length,
      errors,
      warnings,
      diagnostics: diagnostics.slice(0, 10), // Keep top 10
    };
  } catch {
    return emptyResult;
  }
}

function getDefaultConfig(): GuardianConfig {
  return {
    guardian: {
      enabled: true,
      nudges: {
        commit: { enabled: true, filesThreshold: 5, minutesThreshold: 15 },
        test: { enabled: true },
        progress: { enabled: true },
        context: { enabled: true, threshold: 0.8 },
        error: { enabled: true },
        playwright: { enabled: true },
      },
      cooldown: { minutes: 10, toolUses: 5 },
      narrator: { enabled: true },
    },
  };
}

function isOnCooldown(
  guardianState: GuardianState,
  nudgeType: string,
  config: GuardianConfig
): boolean {
  const cooldown = guardianState.cooldowns.find((c) => c.type === nudgeType);
  if (!cooldown) return false;

  const { minutes, toolUses } = config.guardian.cooldown;
  const minutesElapsed = minutesSince(cooldown.last_triggered);
  // Guard against negative delta from state reset
  const toolUsesSince = Math.max(0, guardianState.total_tool_uses - cooldown.tool_uses_since);

  // Both conditions must be met to come off cooldown
  return minutesElapsed < minutes || toolUsesSince < toolUses;
}

function updateCooldown(
  guardianState: GuardianState,
  nudgeType: string
): void {
  const existing = guardianState.cooldowns.find((c) => c.type === nudgeType);
  if (existing) {
    existing.last_triggered = new Date().toISOString();
    existing.tool_uses_since = guardianState.total_tool_uses;
  } else {
    guardianState.cooldowns.push({
      type: nudgeType,
      last_triggered: new Date().toISOString(),
      tool_uses_since: guardianState.total_tool_uses,
    });
  }
}

function resetWorkflowStateForNewSession(state: WorkflowState, sessionId: string): void {
  state.session_id = sessionId;
  state.files_changed = 0;
  state.last_commit_time = null;
  state.last_test_time = null;
  state.errors_detected = [];
  state.current_prp_step = 0;
  state.total_prp_steps = 0;
  state.context_pressure = 0;
  state.watchdog_blocking = false;
  state.watchdog_severity = "normal";
}

/**
 * Check for existing handoff on session start
 */
function checkForHandoff(): string | null {
  if (!existsSync(HANDOFF_PATH)) {
    return null;
  }

  try {
    const handoffJsonPath = join(MEMORY_DIR, "handoff-state.json");
    if (existsSync(handoffJsonPath)) {
      const state = JSON.parse(readFileSync(handoffJsonPath, "utf-8"));
      const pct = Math.round((state.metadata?.contextPressure || 0) * 100);
      const reason = state.metadata?.reason || "unknown";
      const task = state.currentTask?.description || "ongoing work";

      return `📋 HANDOFF DETECTED (${reason}, ${pct}% context)
   Task: ${task}
   Read: memory/HANDOFF.md to continue`;
    }

    return `📋 HANDOFF DETECTED - Read memory/HANDOFF.md to continue`;
  } catch {
    return `📋 HANDOFF DETECTED - Read memory/HANDOFF.md to continue`;
  }
}

function updateWorkflowStateFromTool(
  state: WorkflowState,
  input: HookInput
): void {
  // Handle session change - reset session-specific state
  if (state.session_id && state.session_id !== input.session_id) {
    resetWorkflowStateForNewSession(state, input.session_id);
  } else if (!state.session_id) {
    state.session_id = input.session_id;
  }

  const toolName = input.tool_name;
  const toolOutput = input.tool_output || "";

  // Track file changes from Write/Edit tools
  if (toolName === "Write" || toolName === "Edit" || 
      toolName === "create_file" || toolName === "edit_file") {
    state.files_changed++;
  }

  // Track commits (improved regex matching)
  if (toolName === "Bash") {
    const command = (input.tool_input?.command as string) || "";
    
    // Match git commit commands
    if (/\bgit\s+commit\b/.test(command)) {
      state.last_commit_time = new Date().toISOString();
      state.files_changed = 0; // Reset after commit
    }
    
    // Match test commands more precisely
    const testPatterns = [
      /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b/,
      /\b(npx|bunx|pnpm\s+exec)\s+(jest|vitest|playwright)\b/,
      /\bjest\b.*\.(test|spec)\./,
      /\bvitest\b/,
      /\bplaywright\s+test\b/,
    ];
    if (testPatterns.some(p => p.test(command))) {
      state.last_test_time = new Date().toISOString();
    }
  }

  // Detect errors in output
  const errorPatterns = [
    /error:/i,
    /Error:/,
    /ERR!/,
    /failed/i,
    /TypeError:/,
    /SyntaxError:/,
    /ReferenceError:/,
  ];
  
  for (const pattern of errorPatterns) {
    if (pattern.test(toolOutput)) {
      const errorSnippet = toolOutput.slice(0, 200);
      if (!state.errors_detected.includes(errorSnippet)) {
        state.errors_detected.push(errorSnippet);
        // Keep only last 5 errors
        if (state.errors_detected.length > 5) {
          state.errors_detected.shift();
        }
      }
      break;
    }
  }

  // Update session if not set
  if (!state.session_id) {
    state.session_id = input.session_id;
  }
}

function evaluateNudges(
  workflowState: WorkflowState,
  guardianState: GuardianState,
  config: GuardianConfig,
  input: HookInput,
  lspResult?: LSPDiagnosticsResult
): { type: string; message: string } | null {
  const nudgeConfig = config.guardian.nudges;

  // Check if nudge type is muted
  const isMuted = (type: string) => guardianState.muted_nudges.includes(type);

  // 1. Commit nudge
  if (
    nudgeConfig.commit.enabled &&
    !isMuted("commit") &&
    !isOnCooldown(guardianState, "commit", config)
  ) {
    const filesThreshold = nudgeConfig.commit.filesThreshold;
    const minutesThreshold = nudgeConfig.commit.minutesThreshold;
    const minutesSinceCommit = minutesSince(workflowState.last_commit_time);

    if (
      workflowState.files_changed >= filesThreshold &&
      minutesSinceCommit >= minutesThreshold
    ) {
      return {
        type: "commit",
        message: `💡 ${workflowState.files_changed} files changed, no commit in ${Math.round(minutesSinceCommit)}min. Checkpoint?`,
      };
    }
  }

  // 2. Test nudge
  if (
    nudgeConfig.test.enabled &&
    !isMuted("test") &&
    !isOnCooldown(guardianState, "test", config)
  ) {
    const minutesSinceTest = minutesSince(workflowState.last_test_time);
    // Nudge if files changed and no recent tests (>30 min or never)
    if (workflowState.files_changed >= 3 && minutesSinceTest > 30) {
      return {
        type: "test",
        message: `💡 ${workflowState.files_changed} files modified without running tests. Run tests?`,
      };
    }
  }

  // 3. Error nudge - prefer LSP diagnostics over regex-based detection
  if (
    nudgeConfig.error.enabled &&
    !isMuted("error") &&
    !isOnCooldown(guardianState, "error", config)
  ) {
    // LSP diagnostics take priority if available
    if (lspResult && lspResult.errors > 0) {
      const topError = lspResult.diagnostics.find(d => d.severity === "error");
      const filePath = topError?.file.split("/").pop() || "unknown";
      const fileInfo = lspResult.diagnostics.length === 1 
        ? `in ${filePath}` 
        : `(${filePath} +${lspResult.diagnostics.length - 1} more)`;
      
      return {
        type: "error",
        message: `💡 ${lspResult.errors} TypeScript error${lspResult.errors > 1 ? "s" : ""} ${fileInfo}. Fix before continuing?`,
      };
    }
    
    // Fall back to regex-based detection
    if (workflowState.errors_detected.length > 0) {
      const errorCount = workflowState.errors_detected.length;
      return {
        type: "error",
        message: `💡 ${errorCount} error(s) detected in recent output. Address before continuing?`,
      };
    }
  }

  // 4. Context pressure nudge (enhanced with watchdog)
  if (
    nudgeConfig.context.enabled &&
    !isMuted("context") &&
    !isOnCooldown(guardianState, "context", config)
  ) {
    const watchdogConfig = nudgeConfig.context.watchdog;

    // Use watchdog if enabled, otherwise fall back to simple threshold
    if (watchdogConfig?.enabled && workflowState.watchdog_severity) {
      const severity = workflowState.watchdog_severity;
      const pct = Math.round(workflowState.context_pressure * 100);

      // Only nudge for warning and above
      if (severity !== "normal") {
        let emoji = "🟡";
        let suggestion = "";

        switch (severity) {
          case "warning":
            emoji = "🟡";
            suggestion = "Continue working, context looks good.";
            break;
          case "orange":
            emoji = "🟠";
            suggestion = "Good time to checkpoint or prepare a handoff.";
            break;
          case "critical":
            emoji = "🔴";
            suggestion = workflowState.watchdog_blocking
              ? "Write operations paused. Run: ccplate handoff create"
              : "Run: ccplate handoff create";
            break;
          case "force":
            emoji = "⛔";
            suggestion = "Auto-creating handoff. Session will transfer.";
            break;
        }

        return {
          type: "context",
          message: `${emoji} Context at ${pct}%. ${suggestion}`,
        };
      }
    } else if (workflowState.context_pressure >= nudgeConfig.context.threshold) {
      // Fallback to simple threshold
      const pct = Math.round(workflowState.context_pressure * 100);
      const suggestion = pct >= 85
        ? " Use Handoff tool to pass context to a fresh session."
        : "";
      return {
        type: "context",
        message: `💡 Context ${pct}% full. Consider handoff or summarizing recent work?${suggestion}`,
      };
    }
  }

  // 5. Playwright validation nudge
  if (
    nudgeConfig.playwright.enabled &&
    !isMuted("playwright") &&
    !isOnCooldown(guardianState, "playwright", config)
  ) {
    // Check for failing Playwright tests
    if (workflowState.playwright_last_run?.failed && workflowState.playwright_last_run.failed > 0) {
      const { failed, total } = workflowState.playwright_last_run;
      
      // If fix loop is active, show attempt count
      if (workflowState.fix_loop_active) {
        const attempts = workflowState.fix_loop_attempts || 0;
        if (attempts >= 3) {
          return {
            type: "playwright",
            message: `🔄 Fix loop attempt ${attempts + 1}: ${failed}/${total} tests still failing. Consider checking test expectations or debugging locally.`,
          };
        }
        return {
          type: "playwright",
          message: `🔄 Fix loop active: ${failed}/${total} Playwright tests failing. Fix the failing tests to continue.`,
        };
      }
      
      return {
        type: "playwright",
        message: `🧪 ${failed}/${total} Playwright tests failing. Task cannot be marked complete until tests pass.`,
      };
    }
    
    // Check for blocked tasks
    if (workflowState.playwright_blocked_tasks && workflowState.playwright_blocked_tasks.length > 0) {
      return {
        type: "playwright",
        message: `⛔ ${workflowState.playwright_blocked_tasks.length} task(s) blocked by failing Playwright tests. Run tests to verify fixes.`,
      };
    }
  }

  return null;
}

/**
 * Log errors to guardian-errors.log in standardized format
 */
function logHookError(
  source: string,
  operation: string,
  error: Error | unknown,
  input?: unknown
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  
  const errorEntry = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source: "claude_hook",
    operation: `${source}:${operation}`,
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
    console.error(`❌ [Guardian ${source}] ${operation}: ${err.message}`);
  } catch {
    // Can't write log
  }
}

async function main(): Promise<void> {
  // Ensure memory directory exists
  ensureDir(MEMORY_DIR);

  let input: HookInput;

  try {
    const text = await Bun.stdin.text();
    
    if (!text || text.trim() === "") {
      logHookError("guardian-tick", "input_read", new Error("Empty stdin received"));
      process.exit(0);
    }
    
    input = JSON.parse(text) as HookInput;
    
    // Validate required fields
    if (!input.tool_name) {
      logHookError("guardian-tick", "input_validate", new Error("Missing tool_name"), text.slice(0, 200));
      process.exit(0);
    }
  } catch (error) {
    logHookError("guardian-tick", "input_parse", error);
    process.exit(0);
  }

  // Load config
  const config = loadJSON<GuardianConfig>(CONFIG_PATH, getDefaultConfig());

  // Check if Guardian is enabled
  if (!config.guardian.enabled) {
    process.exit(0);
  }

  // Load states
  const workflowState = loadJSON<WorkflowState>(WORKFLOW_STATE_PATH, {
    session_id: null,
    current_prp_step: 0,
    total_prp_steps: 0,
    files_changed: 0,
    last_commit_time: null,
    last_test_time: null,
    context_pressure: 0,
    active_worktrees: [],
    pending_nudges: [],
    errors_detected: [],
    lsp_diagnostics_count: 0,
  });

  const guardianState = loadJSON<GuardianState>(
    GUARDIAN_STATE_PATH,
    getDefaultGuardianState()
  );

  // Load narrator and validation states
  const narratorState = loadNarratorState();
  const validationState = loadValidationState();

  // Increment tool use counter
  guardianState.total_tool_uses++;

  // Update workflow state based on tool
  updateWorkflowStateFromTool(workflowState, input);

  // ========================================================================
  // Handoff Detection - Check for existing handoff on first tool use
  // ========================================================================
  if (guardianState.total_tool_uses === 1) {
    const handoffMessage = checkForHandoff();
    if (handoffMessage) {
      console.error("\n" + "=".repeat(50));
      console.error(handoffMessage);
      console.error("=".repeat(50) + "\n");
    }
  }

  // Calculate context pressure from ledger and tool uses
  const contextLedger = loadContextLedger();
  workflowState.context_pressure = calculateContextPressure(
    contextLedger,
    guardianState.total_tool_uses
  );

  // ========================================================================
  // Context Watchdog - Evaluate escalation level
  // ========================================================================
  const watchdogConfig = config.guardian.nudges.context?.watchdog;
  if (watchdogConfig?.enabled) {
    const evaluation = evaluateContextWatchdog(
      workflowState.context_pressure,
      watchdogConfig
    );

    workflowState.watchdog_blocking = evaluation.blocking;
    workflowState.watchdog_severity = evaluation.severity;

    // Save watchdog state for path-guard to read
    saveWatchdogState({
      severity: evaluation.severity,
      contextPressure: workflowState.context_pressure,
      blocking: evaluation.blocking,
      message: evaluation.message,
    });
  }

  // ========================================================================
  // Activity Narrator - Log significant tool uses
  // ========================================================================
  if (config.guardian.narrator?.enabled !== false) {
    const toolOutput = input.tool_output || "";
    const narrateResult = narrateToolUse(
      input.tool_name,
      input.tool_input,
      toolOutput,
      input.session_id,
      narratorState
    );
    
    if (narrateResult) {
      appendActivityEntry({
        timestamp: new Date().toISOString(),
        loop: narratorState.currentLoop,
        status: narrateResult.status,
        activity: narrateResult.activity,
      });
    }
    
    // Save narrator state (may have been updated)
    saveNarratorState(narratorState);
  }

  // ========================================================================
  // Playwright Validation - Detect test runs and update state
  // ========================================================================
  const playwrightResult = detectPlaywrightRun(
    input.tool_name,
    input.tool_input,
    input.tool_output || ""
  );
  
  if (playwrightResult) {
    // Update workflow state with Playwright results
    workflowState.playwright_last_run = {
      timestamp: new Date().toISOString(),
      passed: playwrightResult.passed,
      failed: playwrightResult.failed,
      total: playwrightResult.total,
    };
    
    // Update validation state
    validationState.lastRun = workflowState.playwright_last_run;
    
    if (playwrightResult.failed > 0) {
      // Start or continue fix loop
      if (!validationState.fixLoopActive) {
        validationState.fixLoopActive = true;
        validationState.fixLoopAttempts = 0;
        
        // Set first failed test as target
        if (playwrightResult.failedTests.length > 0) {
          const firstFailed = playwrightResult.failedTests[0];
          validationState.fixLoopTarget = {
            testFile: firstFailed.file,
            testName: firstFailed.name,
            error: firstFailed.error || "Test failed",
          };
        }
      } else {
        // Increment fix loop attempts
        validationState.fixLoopAttempts++;
      }
      
      workflowState.fix_loop_active = true;
      workflowState.fix_loop_attempts = validationState.fixLoopAttempts;
    } else {
      // All tests passed - end fix loop
      validationState.fixLoopActive = false;
      validationState.fixLoopAttempts = 0;
      validationState.fixLoopTarget = undefined;
      validationState.blockedTasks = [];
      
      workflowState.fix_loop_active = false;
      workflowState.fix_loop_attempts = 0;
      workflowState.playwright_blocked_tasks = [];
    }
    
    saveValidationState(validationState);
  }

  // Run LSP diagnostics if enabled and appropriate
  let lspResult: LSPDiagnosticsResult | undefined;
  if (config.lsp?.enabled && shouldRunLSPCheck(guardianState, input.tool_name)) {
    lspResult = await getLSPDiagnostics(PROJECT_DIR);
    guardianState.last_lsp_check = new Date().toISOString();
    workflowState.lsp_diagnostics_count = lspResult.errors;
  }

  // Evaluate nudges
  const nudge = evaluateNudges(workflowState, guardianState, config, input, lspResult);

  if (nudge) {
    // Update cooldown
    updateCooldown(guardianState, nudge.type);

    // Log nudge
    const nudgeEntry: NudgeEntry = {
      timestamp: new Date().toISOString(),
      type: nudge.type,
      message: nudge.message,
      tool_trigger: input.tool_name,
      session_id: input.session_id,
    };
    appendJSONL(NUDGES_LOG_PATH, nudgeEntry);

    // Write to guardian-last.txt for potential injection
    writeFileSync(NUDGE_LAST_PATH, nudge.message + "\n");

    // Clear errors after error nudge (so we don't keep nudging)
    if (nudge.type === "error") {
      workflowState.errors_detected = [];
    }

    // Output nudge to stderr (visible but non-blocking)
    console.error(`\n${nudge.message}\n`);
  }

  // Save updated states
  saveJSON(WORKFLOW_STATE_PATH, workflowState);
  saveJSON(GUARDIAN_STATE_PATH, guardianState);

  process.exit(0);
}

main().catch((error) => {
  logHookError("guardian-tick", "unhandled", error);
  process.exit(0);
});
