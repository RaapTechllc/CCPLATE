/**
 * Context Watchdog - Escalating Warnings for Context Management
 *
 * Monitors context pressure and provides escalating warnings:
 * - Warning (50%): Informational nudge
 * - Orange (70%): Suggest handoff
 * - Critical (85%): Block writes, recommend handoff
 * - Force (95%): Auto-create handoff, block all writes
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// ============================================================================
// Types
// ============================================================================

export type WatchdogSeverity = "normal" | "warning" | "orange" | "critical" | "force";

export interface WatchdogThresholds {
  warning: number;
  orange: number;
  critical: number;
  forceHandoff: number;
}

export interface WatchdogConfig {
  enabled: boolean;
  thresholds: WatchdogThresholds;
  blockWritesAtCritical: boolean;
}

export interface WatchdogState {
  severity: WatchdogSeverity;
  contextPressure: number;
  blocking: boolean;
  lastEscalation: string | null;
  escalationCount: number;
}

export interface WatchdogEvaluation {
  severity: WatchdogSeverity;
  blocking: boolean;
  message: string;
  suggestion: string;
  shouldAutoHandoff: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_WATCHDOG_CONFIG: WatchdogConfig = {
  enabled: true,
  thresholds: {
    warning: 0.5,
    orange: 0.7,
    critical: 0.85,
    forceHandoff: 0.95,
  },
  blockWritesAtCritical: true,
};

// ============================================================================
// Watchdog State Management
// ============================================================================

function getWatchdogStatePath(rootDir: string): string {
  return join(rootDir, "memory", "watchdog-state.json");
}

export function loadWatchdogState(rootDir: string): WatchdogState {
  const statePath = getWatchdogStatePath(rootDir);

  if (!existsSync(statePath)) {
    return {
      severity: "normal",
      contextPressure: 0,
      blocking: false,
      lastEscalation: null,
      escalationCount: 0,
    };
  }

  try {
    return JSON.parse(readFileSync(statePath, "utf-8"));
  } catch {
    return {
      severity: "normal",
      contextPressure: 0,
      blocking: false,
      lastEscalation: null,
      escalationCount: 0,
    };
  }
}

export function saveWatchdogState(rootDir: string, state: WatchdogState): void {
  const statePath = getWatchdogStatePath(rootDir);
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}

// ============================================================================
// Watchdog Evaluation
// ============================================================================

/**
 * Get severity level emoji for display
 */
export function getSeverityEmoji(severity: WatchdogSeverity): string {
  switch (severity) {
    case "normal": return "🟢";
    case "warning": return "🟡";
    case "orange": return "🟠";
    case "critical": return "🔴";
    case "force": return "⛔";
  }
}

/**
 * Get severity level color code for terminal output
 */
export function getSeverityColor(severity: WatchdogSeverity): string {
  switch (severity) {
    case "normal": return "\x1b[32m"; // Green
    case "warning": return "\x1b[33m"; // Yellow
    case "orange": return "\x1b[38;5;208m"; // Orange (256-color)
    case "critical": return "\x1b[31m"; // Red
    case "force": return "\x1b[35m"; // Magenta
  }
}

/**
 * Evaluate context pressure and determine watchdog response
 */
export function evaluateWatchdog(
  contextPressure: number,
  config: WatchdogConfig
): WatchdogEvaluation {
  const { thresholds, blockWritesAtCritical } = config;

  // Determine severity level
  let severity: WatchdogSeverity = "normal";
  let blocking = false;
  let message = "";
  let suggestion = "";
  let shouldAutoHandoff = false;

  if (contextPressure >= thresholds.forceHandoff) {
    severity = "force";
    blocking = true;
    message = `Context at ${Math.round(contextPressure * 100)}%! Auto-creating handoff...`;
    suggestion = "Session will be handed off automatically.";
    shouldAutoHandoff = true;
  } else if (contextPressure >= thresholds.critical) {
    severity = "critical";
    blocking = blockWritesAtCritical;
    message = `Context at ${Math.round(contextPressure * 100)}%! ${blocking ? "Write operations blocked." : ""}`;
    suggestion = "Run: ccplate handoff create";
  } else if (contextPressure >= thresholds.orange) {
    severity = "orange";
    message = `Context at ${Math.round(contextPressure * 100)}%. Consider wrapping up.`;
    suggestion = "Good time to checkpoint or create a handoff.";
  } else if (contextPressure >= thresholds.warning) {
    severity = "warning";
    message = `Context at ${Math.round(contextPressure * 100)}%. Doing great!`;
    suggestion = "Continue working, but be mindful of context usage.";
  } else {
    message = `Context at ${Math.round(contextPressure * 100)}%. Plenty of room.`;
    suggestion = "";
  }

  return {
    severity,
    blocking,
    message,
    suggestion,
    shouldAutoHandoff,
  };
}

/**
 * Update watchdog state based on evaluation
 */
export function updateWatchdogState(
  rootDir: string,
  contextPressure: number,
  evaluation: WatchdogEvaluation
): WatchdogState {
  const currentState = loadWatchdogState(rootDir);

  const newState: WatchdogState = {
    severity: evaluation.severity,
    contextPressure,
    blocking: evaluation.blocking,
    lastEscalation: evaluation.severity !== currentState.severity
      ? new Date().toISOString()
      : currentState.lastEscalation,
    escalationCount: evaluation.severity !== "normal" && evaluation.severity !== currentState.severity
      ? currentState.escalationCount + 1
      : currentState.escalationCount,
  };

  saveWatchdogState(rootDir, newState);
  return newState;
}

/**
 * Check if writes should be blocked based on current watchdog state
 */
export function shouldBlockWrites(rootDir: string): boolean {
  const state = loadWatchdogState(rootDir);
  return state.blocking;
}

/**
 * Get the blocking reason message for path-guard
 */
export function getBlockingReason(rootDir: string): string {
  const state = loadWatchdogState(rootDir);

  if (!state.blocking) {
    return "";
  }

  const pct = Math.round(state.contextPressure * 100);

  if (state.severity === "force") {
    return `Context at ${pct}%! All writes blocked. Run: ccplate handoff create`;
  }

  return `Context at ${pct}%! Write operations paused. Run: ccplate handoff create`;
}

/**
 * Format watchdog status for display
 */
export function formatWatchdogStatus(state: WatchdogState): string {
  const emoji = getSeverityEmoji(state.severity);
  const pct = Math.round(state.contextPressure * 100);

  let output = `${emoji} Context Watchdog: ${pct}%\n`;
  output += `   Severity: ${state.severity.toUpperCase()}\n`;
  output += `   Blocking: ${state.blocking ? "Yes" : "No"}\n`;

  if (state.lastEscalation) {
    const ago = Math.round((Date.now() - new Date(state.lastEscalation).getTime()) / 60000);
    output += `   Last escalation: ${ago}m ago\n`;
  }

  if (state.escalationCount > 0) {
    output += `   Total escalations: ${state.escalationCount}\n`;
  }

  return output;
}

/**
 * Reset watchdog state (for new sessions)
 */
export function resetWatchdogState(rootDir: string): void {
  const state: WatchdogState = {
    severity: "normal",
    contextPressure: 0,
    blocking: false,
    lastEscalation: null,
    escalationCount: 0,
  };
  saveWatchdogState(rootDir, state);
}

/**
 * Get watchdog nudge message for guardian-tick
 */
export function getWatchdogNudge(
  severity: WatchdogSeverity,
  contextPressure: number,
  blocking: boolean
): string | null {
  const pct = Math.round(contextPressure * 100);
  const emoji = getSeverityEmoji(severity);

  switch (severity) {
    case "warning":
      return `${emoji} Context at ${pct}%. Doing great!`;
    case "orange":
      return `${emoji} Context at ${pct}%. Consider wrapping up.`;
    case "critical":
      return blocking
        ? `${emoji} Context at ${pct}%! Writes blocked. Run: ccplate handoff create`
        : `${emoji} Context at ${pct}%! Create a handoff soon.`;
    case "force":
      return `${emoji} Context at ${pct}%! Auto-creating handoff...`;
    default:
      return null;
  }
}
