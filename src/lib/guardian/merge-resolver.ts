import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { createLogger } from "./logger";
import { requestHumanDecision } from "./hitl";

const log = createLogger("guardian.merge");

export type ConflictType =
  | "placement"
  | "import"
  | "formatting"
  | "content"
  | "logic";

export interface ConflictMarker {
  startLine: number;
  endLine: number;
  ours: string;
  theirs: string;
  ancestor?: string;
}

export interface ConflictAnalysis {
  file: string;
  conflicts: ConflictMarker[];
  conflictType: ConflictType;
  autoResolvable: boolean;
  confidence: number; // 0-1
  suggestedResolution?: string;
  reason: string;
}

export interface ResolutionResult {
  resolved: string[];
  escalated: string[];
  hitlRequestId?: string;
}

/**
 * Get list of files with merge conflicts
 */
export function getConflictedFiles(rootDir: string): string[] {
  try {
    const output = execSync("git diff --name-only --diff-filter=U", {
      cwd: rootDir,
      encoding: "utf-8",
    });
    return output
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Extract conflict markers from file content
 */
export function extractConflictMarkers(content: string): ConflictMarker[] {
  const conflicts: ConflictMarker[] = [];
  const lines = content.split("\n");

  let inConflict = false;
  let startLine = -1;
  let ours = "";
  let theirs = "";
  let dividerLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("<<<<<<<")) {
      inConflict = true;
      startLine = i;
      ours = "";
      theirs = "";
      dividerLine = -1;
    } else if (line.startsWith("=======") && inConflict) {
      dividerLine = i;
    } else if (line.startsWith(">>>>>>>") && inConflict) {
      conflicts.push({
        startLine,
        endLine: i,
        ours,
        theirs,
      });
      inConflict = false;
    } else if (inConflict) {
      if (dividerLine === -1) {
        ours += line + "\n";
      } else {
        theirs += line + "\n";
      }
    }
  }

  return conflicts;
}

/**
 * Check if content is an import block (TypeScript/JavaScript)
 */
function isImportBlock(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;

  const lines = trimmed.split("\n").filter((l) => l.trim());
  return lines.every(
    (line) =>
      line.trim().startsWith("import ") ||
      line.trim().startsWith("from ") ||
      line.trim().startsWith("} from ") ||
      line.trim() === "}" ||
      line.trim().startsWith("//")
  );
}

/**
 * Merge two import blocks, deduplicating imports
 */
function mergeImports(ours: string, theirs: string): string {
  const oursLines = ours.trim().split("\n").filter(Boolean);
  const theirsLines = theirs.trim().split("\n").filter(Boolean);

  const allImports = new Set<string>();
  const importOrder: string[] = [];

  for (const line of [...oursLines, ...theirsLines]) {
    const normalized = line.trim();
    if (!allImports.has(normalized)) {
      allImports.add(normalized);
      importOrder.push(line);
    }
  }

  return importOrder.join("\n") + "\n";
}

/**
 * Check if content is purely additive (no modifications)
 */
function isAddition(content: string): boolean {
  const trimmed = content.trim();
  // Additions typically have new code without references to existing lines
  // This is a heuristic - real additions don't modify existing code
  return trimmed.length > 0 && !trimmed.includes("TODO: remove");
}

/**
 * Normalize content for comparison (remove whitespace differences)
 */
function normalize(content: string): string {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Concatenate two additions in logical order
 */
function concatenateAdditions(ours: string, theirs: string): string {
  return ours.trim() + "\n\n" + theirs.trim() + "\n";
}

/**
 * Analyze a file with conflicts and determine resolution strategy
 */
export function analyzeConflict(file: string, rootDir: string): ConflictAnalysis {
  const fullPath = `${rootDir}/${file}`;
  if (!existsSync(fullPath)) {
    return {
      file,
      conflicts: [],
      conflictType: "logic",
      autoResolvable: false,
      confidence: 0,
      reason: "File not found",
    };
  }

  const content = readFileSync(fullPath, "utf-8");
  const conflicts = extractConflictMarkers(content);

  if (conflicts.length === 0) {
    return {
      file,
      conflicts: [],
      conflictType: "formatting",
      autoResolvable: true,
      confidence: 1.0,
      suggestedResolution: content,
      reason: "No conflict markers found",
    };
  }

  // Analyze each conflict
  let overallType: ConflictType = "logic";
  let canAutoResolve = true;
  let confidence = 0;
  const resolutions: string[] = [];
  let reason = "";

  for (const conflict of conflicts) {
    // Check if both sides are import blocks
    if (isImportBlock(conflict.ours) && isImportBlock(conflict.theirs)) {
      overallType = "import";
      confidence = Math.max(confidence, 0.95);
      resolutions.push(mergeImports(conflict.ours, conflict.theirs));
      reason = "Import blocks can be merged";
      continue;
    }

    // Check if only whitespace/formatting differs
    if (normalize(conflict.ours) === normalize(conflict.theirs)) {
      overallType = "formatting";
      confidence = Math.max(confidence, 0.99);
      resolutions.push(conflict.ours);
      reason = "Only formatting differences";
      continue;
    }

    // Check if both sides are additions
    if (isAddition(conflict.ours) && isAddition(conflict.theirs)) {
      // Check if it's the exact same content
      if (conflict.ours.trim() === conflict.theirs.trim()) {
        overallType = "content";
        confidence = Math.max(confidence, 0.90);
        resolutions.push(conflict.ours);
        reason = "Same content added in both branches";
        continue;
      }

      // Different additions - can concatenate
      overallType = "placement";
      confidence = Math.max(confidence, 0.85);
      resolutions.push(concatenateAdditions(conflict.ours, conflict.theirs));
      reason = "Both branches add new code";
      continue;
    }

    // Logic conflict - cannot auto-resolve
    canAutoResolve = false;
    overallType = "logic";
    confidence = 0;
    reason = "Conflicting changes to same code section";
    break;
  }

  // Build suggested resolution
  let suggestedResolution: string | undefined;
  if (canAutoResolve && resolutions.length === conflicts.length) {
    // Apply resolutions to content
    suggestedResolution = applyResolutions(content, conflicts, resolutions);
  }

  log.info("Analyzed conflict", {
    file,
    conflictCount: conflicts.length,
    type: overallType,
    autoResolvable: canAutoResolve,
    confidence,
  });

  return {
    file,
    conflicts,
    conflictType: overallType,
    autoResolvable: canAutoResolve,
    confidence,
    suggestedResolution,
    reason,
  };
}

/**
 * Apply resolutions to file content
 */
function applyResolutions(
  content: string,
  conflicts: ConflictMarker[],
  resolutions: string[]
): string {
  const lines = content.split("\n");
  const result: string[] = [];

  let lastEnd = 0;

  for (let i = 0; i < conflicts.length; i++) {
    const conflict = conflicts[i];
    const resolution = resolutions[i];

    // Add lines before conflict
    for (let j = lastEnd; j < conflict.startLine; j++) {
      result.push(lines[j]);
    }

    // Add resolution
    result.push(resolution.trim());

    lastEnd = conflict.endLine + 1;
  }

  // Add remaining lines
  for (let j = lastEnd; j < lines.length; j++) {
    result.push(lines[j]);
  }

  return result.join("\n");
}

/**
 * Apply resolution to a file
 */
export function applyResolution(
  file: string,
  resolution: string,
  rootDir: string
): void {
  const fullPath = `${rootDir}/${file}`;
  writeFileSync(fullPath, resolution);

  // Stage the resolved file
  // SECURITY: Use spawnSync with argument array to prevent command injection
  spawnSync("git", ["add", file], {
    cwd: rootDir,
    shell: false
  });

  log.info("Applied resolution", { file });
}

/**
 * Attempt to resolve all conflicts in the given files
 */
export async function resolveConflicts(
  rootDir: string,
  files?: string[]
): Promise<ResolutionResult> {
  const conflictedFiles = files || getConflictedFiles(rootDir);

  if (conflictedFiles.length === 0) {
    log.info("No conflicts to resolve");
    return { resolved: [], escalated: [] };
  }

  log.info("Resolving conflicts", { fileCount: conflictedFiles.length });

  const resolved: string[] = [];
  const escalated: string[] = [];
  const escalatedAnalyses: ConflictAnalysis[] = [];

  for (const file of conflictedFiles) {
    const analysis = analyzeConflict(file, rootDir);

    if (analysis.autoResolvable && analysis.confidence > 0.8 && analysis.suggestedResolution) {
      try {
        applyResolution(file, analysis.suggestedResolution, rootDir);
        resolved.push(file);
        log.info("Auto-resolved conflict", {
          file,
          type: analysis.conflictType,
          confidence: analysis.confidence,
        });
      } catch (error) {
        escalated.push(file);
        escalatedAnalyses.push(analysis);
        log.warn("Failed to apply resolution", {
          file,
          error: (error as Error).message,
        });
      }
    } else {
      escalated.push(file);
      escalatedAnalyses.push(analysis);
      log.info("Escalating conflict", {
        file,
        type: analysis.conflictType,
        reason: analysis.reason,
      });
    }
  }

  let hitlRequestId: string | undefined;

  if (escalated.length > 0) {
    // Create HITL request for manual resolution
    const hitlRequest = requestHumanDecision({
      reason: "merge_conflict",
      title: `Merge conflicts require review: ${escalated.length} file(s)`,
      description: `${escalated.length} file(s) have conflicts that cannot be auto-resolved:\n${escalated.join("\n")}`,
      context: {
        files: escalated,
        options: [
          { id: "ours", label: "Keep our changes", description: "Use changes from current branch" },
          { id: "theirs", label: "Keep their changes", description: "Use changes from incoming branch" },
          { id: "manual", label: "Resolve manually", description: "I will resolve these conflicts myself" },
        ],
      },
    });

    hitlRequestId = hitlRequest.id;

    log.info("Created HITL request for escalated conflicts", {
      requestId: hitlRequestId,
      escalatedCount: escalated.length,
    });
  }

  return {
    resolved,
    escalated,
    hitlRequestId,
  };
}

/**
 * Format conflict analysis for CLI display
 */
export function formatConflictAnalysis(analysis: ConflictAnalysis): string {
  const lines: string[] = [];

  const icon = analysis.autoResolvable ? "O" : "X";
  const status = analysis.autoResolvable
    ? `Auto-resolvable (${(analysis.confidence * 100).toFixed(0)}%)`
    : "Needs manual resolution";

  lines.push(`${icon} ${analysis.file}`);
  lines.push(`   Type: ${analysis.conflictType}`);
  lines.push(`   Status: ${status}`);
  lines.push(`   Reason: ${analysis.reason}`);

  if (analysis.conflicts.length > 0) {
    lines.push(`   Conflicts: ${analysis.conflicts.length}`);
  }

  return lines.join("\n");
}
