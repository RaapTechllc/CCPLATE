/**
 * Progress Nudge Detection Module
 *
 * Detects when an agent is working on files unrelated to the PRD scope
 * and provides nudges to get back on track.
 */

import { extractRelevantKeywords, isFileRelevant } from "./prd";
import type { PRD } from "./prd";

export interface ProgressNudgeConfig {
  enabled: boolean;
  sensitivity: number; // 0-1, default 0.4 (40% relevance threshold)
  minFilesBeforeCheck: number; // Minimum files changed before checking
  whitelist: string[]; // Additional whitelist patterns
}

export interface WorkflowStateWithFiles {
  recent_files_changed: string[];
  session_id: string | null;
}

export interface ProgressNudgeResult {
  type: "progress";
  message: string;
}

/**
 * Default configuration for progress nudge
 */
export function getDefaultProgressConfig(): ProgressNudgeConfig {
  return {
    enabled: true,
    sensitivity: 0.4, // 40% relevance threshold
    minFilesBeforeCheck: 3,
    whitelist: [],
  };
}

/**
 * Evaluates whether to nudge the agent about working on off-track files.
 *
 * @param prd - The PRD object or null
 * @param workflowState - Workflow state with recent files changed
 * @param config - Progress nudge configuration
 * @returns A nudge result if off-track, null otherwise
 */
export function evaluateProgressNudge(
  prd: PRD | null,
  workflowState: WorkflowStateWithFiles,
  config: ProgressNudgeConfig
): ProgressNudgeResult | null {
  // Return null if disabled
  if (!config.enabled) {
    return null;
  }

  // Return null if PRD is null
  if (!prd) {
    return null;
  }

  // Get recent files changed
  const recentFiles = workflowState?.recent_files_changed;

  // Return null if no files or undefined
  if (!recentFiles || !Array.isArray(recentFiles) || recentFiles.length === 0) {
    return null;
  }

  // Return null if fewer than minFilesBeforeCheck
  if (recentFiles.length < config.minFilesBeforeCheck) {
    return null;
  }

  // Extract keywords from PRD
  const keywords = extractRelevantKeywords(prd);

  // Count relevant files
  let relevantCount = 0;
  for (const file of recentFiles) {
    if (isFileRelevant(file, keywords, config.whitelist)) {
      relevantCount++;
    }
  }

  // Calculate relevance ratio
  const relevanceRatio = relevantCount / recentFiles.length;

  // Check if below threshold
  if (relevanceRatio >= config.sensitivity) {
    return null; // On track
  }

  // Build nudge message
  const relevancePercent = Math.round(relevanceRatio * 100);
  const criticalPaths = prd.answers.criticalPaths || [];
  const suggestedFocus = criticalPaths.slice(0, 2).join(", ") || "PRD scope";

  return {
    type: "progress",
    message: `${String.fromCodePoint(0x1f6a7)} Possible off-track: ${relevancePercent}% of recent files (${relevantCount} of ${recentFiles.length}) relate to PRD scope. Focus areas: ${suggestedFocus}`,
  };
}
