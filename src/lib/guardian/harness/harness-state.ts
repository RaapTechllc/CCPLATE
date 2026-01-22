import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export type VariantStatus = "pending" | "running" | "completed" | "failed" | "timeout";

export interface VariantState {
  id: string;
  name: string;
  worktreePath: string;
  branch: string;
  status: VariantStatus;
  startedAt?: string;
  completedAt?: string;
  exitCode?: number;
  error?: string;
  logPath?: string;
  summary?: string;
}

export interface HarnessRun {
  id: string;
  goal: string;
  prdHash?: string;
  baseBranch: string;
  variants: VariantState[];
  createdAt: string;
  completedAt?: string;
  selectedVariant?: string;
  maxMinutes: number;
  maxIterations: number;
}

export interface HarnessState {
  activeRun?: HarnessRun;
  history: HarnessRun[];
}

const STATE_FILE = "memory/harness-state.json";
const HARNESS_DIR = "memory/harness";

export function getHarnessStatePath(rootDir: string): string {
  return join(rootDir, STATE_FILE);
}

export function getHarnessDir(rootDir: string): string {
  return join(rootDir, HARNESS_DIR);
}

export function loadHarnessState(rootDir: string): HarnessState {
  const statePath = getHarnessStatePath(rootDir);
  if (!existsSync(statePath)) {
    return { history: [] };
  }
  try {
    return JSON.parse(readFileSync(statePath, "utf-8"));
  } catch {
    return { history: [] };
  }
}

export function saveHarnessState(rootDir: string, state: HarnessState): void {
  const statePath = getHarnessStatePath(rootDir);
  const dir = join(rootDir, "memory");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}

export function generateRunId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `harness-${timestamp}-${random}`;
}

export function generateVariantId(name: string, index: number): string {
  if (name) {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, "-").substring(0, 32);
  }
  return `variant-${index + 1}`;
}

export function updateVariantStatus(
  rootDir: string,
  runId: string,
  variantId: string,
  updates: Partial<VariantState>
): void {
  const state = loadHarnessState(rootDir);
  if (!state.activeRun || state.activeRun.id !== runId) {
    return;
  }

  const variant = state.activeRun.variants.find((v) => v.id === variantId);
  if (variant) {
    Object.assign(variant, updates);
    saveHarnessState(rootDir, state);
  }
}

export function completeHarnessRun(rootDir: string, runId: string): void {
  const state = loadHarnessState(rootDir);
  if (!state.activeRun || state.activeRun.id !== runId) {
    return;
  }

  state.activeRun.completedAt = new Date().toISOString();
  state.history.push(state.activeRun);
  state.activeRun = undefined;
  saveHarnessState(rootDir, state);
}

export function setSelectedVariant(rootDir: string, runId: string, variantId: string): void {
  const state = loadHarnessState(rootDir);
  
  // Check active run first
  if (state.activeRun && state.activeRun.id === runId) {
    state.activeRun.selectedVariant = variantId;
    saveHarnessState(rootDir, state);
    return;
  }

  // Check history
  const historyRun = state.history.find((r) => r.id === runId);
  if (historyRun) {
    historyRun.selectedVariant = variantId;
    saveHarnessState(rootDir, state);
  }
}

export function getHarnessRun(rootDir: string, runId?: string): HarnessRun | undefined {
  const state = loadHarnessState(rootDir);
  
  if (!runId) {
    return state.activeRun || state.history[state.history.length - 1];
  }

  if (state.activeRun?.id === runId) {
    return state.activeRun;
  }

  return state.history.find((r) => r.id === runId);
}
