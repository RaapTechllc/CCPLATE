/**
 * CCPLATE Guardian Tick Hook
 * Evaluates workflow state after each tool use and emits nudges
 * 
 * Nudge types:
 * - commit: Too many files changed without commit
 * - test: New code without recent tests
 * - error: Errors detected in output
 * - context: Context pressure too high
 * 
 * Exit codes:
 * - 0: Success (nudge may or may not be emitted)
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from "fs";
import { join } from "path";

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

interface GuardianConfig {
  guardian: {
    enabled: boolean;
    nudges: {
      commit: { enabled: boolean; filesThreshold: number; minutesThreshold: number };
      test: { enabled: boolean };
      progress: { enabled: boolean };
      context: { enabled: boolean; threshold: number };
      error: { enabled: boolean };
    };
    cooldown: { minutes: number; toolUses: number };
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

function loadContextLedger(): ContextLedger {
  return loadJSON<ContextLedger>(CONTEXT_LEDGER_PATH, {
    session_id: "",
    consultations: [],
  });
}

function calculateContextPressure(ledger: ContextLedger, toolUses: number): number {
  const consultations = ledger.consultations.length;
  
  let totalExcerpts = 0;
  for (const c of ledger.consultations) {
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
    totalExcerpts += c.key_findings.length;
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
      },
      cooldown: { minutes: 10, toolUses: 5 },
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

  // 4. Context pressure nudge
  if (
    nudgeConfig.context.enabled &&
    !isMuted("context") &&
    !isOnCooldown(guardianState, "context", config)
  ) {
    if (workflowState.context_pressure >= nudgeConfig.context.threshold) {
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

  return null;
}

async function main(): Promise<void> {
  // Ensure memory directory exists
  ensureDir(MEMORY_DIR);

  let input: HookInput;

  try {
    const text = await Bun.stdin.text();
    input = JSON.parse(text) as HookInput;
  } catch {
    // Can't parse input, just exit silently
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

  // Increment tool use counter
  guardianState.total_tool_uses++;

  // Update workflow state based on tool
  updateWorkflowStateFromTool(workflowState, input);

  // Calculate context pressure from ledger and tool uses
  const contextLedger = loadContextLedger();
  workflowState.context_pressure = calculateContextPressure(
    contextLedger,
    guardianState.total_tool_uses
  );

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

main().catch(() => {
  process.exit(0);
});
