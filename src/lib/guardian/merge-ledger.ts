/**
 * Merge Ledger - Tracks merge operations for rollback capability
 * 
 * Records all merge operations with pre-merge commit SHAs,
 * enabling rollback if a merge introduces issues.
 */

import { existsSync, readFileSync, appendFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

export interface MergeRecord {
  id: string;
  timestamp: string;
  worktreeId: string;
  branch: string;
  targetBranch: string;
  preMergeCommit: string;
  postMergeCommit: string;
  mergedBy: string;
  status: "completed" | "rolled_back";
  rollbackCommit?: string;
  rollbackTimestamp?: string;
  rollbackReason?: string;
}

const MERGE_LEDGER_FILE = "memory/merge-ledger.jsonl";

function ensureDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function recordMerge(
  rootDir: string,
  options: {
    worktreeId: string;
    branch: string;
    targetBranch: string;
    preMergeCommit: string;
    postMergeCommit: string;
    mergedBy?: string;
  }
): MergeRecord {
  const ledgerPath = join(rootDir, MERGE_LEDGER_FILE);
  ensureDir(ledgerPath);

  const record: MergeRecord = {
    id: `merge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    worktreeId: options.worktreeId,
    branch: options.branch,
    targetBranch: options.targetBranch,
    preMergeCommit: options.preMergeCommit,
    postMergeCommit: options.postMergeCommit,
    mergedBy: options.mergedBy || "unknown",
    status: "completed",
  };

  appendFileSync(ledgerPath, JSON.stringify(record) + "\n");
  return record;
}

export function getMergeHistory(
  rootDir: string,
  options?: { limit?: number; branch?: string }
): MergeRecord[] {
  const ledgerPath = join(rootDir, MERGE_LEDGER_FILE);
  
  if (!existsSync(ledgerPath)) {
    return [];
  }

  const lines = readFileSync(ledgerPath, "utf-8")
    .split("\n")
    .filter(Boolean);

  let records = lines
    .map(line => {
      try {
        return JSON.parse(line) as MergeRecord;
      } catch {
        return null;
      }
    })
    .filter((r): r is MergeRecord => r !== null);

  // Filter by branch if specified
  if (options?.branch) {
    records = records.filter(r => r.branch === options.branch || r.targetBranch === options.branch);
  }

  // Sort by timestamp descending
  records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply limit
  if (options?.limit) {
    records = records.slice(0, options.limit);
  }

  return records;
}

export function getLastMerge(
  rootDir: string,
  branch?: string
): MergeRecord | null {
  const records = getMergeHistory(rootDir, { limit: 1, branch });
  return records[0] || null;
}

export function rollbackMerge(
  rootDir: string,
  mergeId: string,
  options?: { reason?: string }
): { success: boolean; message: string; newCommit?: string } {
  const ledgerPath = join(rootDir, MERGE_LEDGER_FILE);
  
  if (!existsSync(ledgerPath)) {
    return { success: false, message: "No merge history found" };
  }

  const lines = readFileSync(ledgerPath, "utf-8")
    .split("\n")
    .filter(Boolean);

  let targetRecord: MergeRecord | null = null;
  const updatedLines: string[] = [];

  for (const line of lines) {
    try {
      const record = JSON.parse(line) as MergeRecord;
      if (record.id === mergeId) {
        targetRecord = record;
      }
      updatedLines.push(line);
    } catch {
      updatedLines.push(line);
    }
  }

  if (!targetRecord) {
    return { success: false, message: `Merge record not found: ${mergeId}` };
  }

  if (targetRecord.status === "rolled_back") {
    return { success: false, message: "Merge already rolled back" };
  }

  // Verify we can rollback (check if preMergeCommit exists)
  try {
    execSync(`git rev-parse ${targetRecord.preMergeCommit}`, { 
      cwd: rootDir, 
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch {
    return { 
      success: false, 
      message: `Pre-merge commit no longer exists: ${targetRecord.preMergeCommit}` 
    };
  }

  // Create revert commit
  try {
    // First, check current HEAD
    const currentHead = execSync("git rev-parse HEAD", { 
      cwd: rootDir, 
      encoding: "utf-8" 
    }).trim();

    // If HEAD is the merge commit, we can do a clean revert
    if (currentHead === targetRecord.postMergeCommit) {
      // Reset to pre-merge state
      execSync(`git reset --hard ${targetRecord.preMergeCommit}`, { 
        cwd: rootDir,
        encoding: "utf-8"
      });
    } else {
      // Create a revert of the merge commit
      execSync(`git revert -m 1 ${targetRecord.postMergeCommit} --no-edit`, { 
        cwd: rootDir,
        encoding: "utf-8"
      });
    }

    const newCommit = execSync("git rev-parse HEAD", { 
      cwd: rootDir, 
      encoding: "utf-8" 
    }).trim();

    // Update the ledger record
    targetRecord.status = "rolled_back";
    targetRecord.rollbackCommit = newCommit;
    targetRecord.rollbackTimestamp = new Date().toISOString();
    targetRecord.rollbackReason = options?.reason;

    // Rewrite ledger with updated record
    const finalLines = updatedLines.map(line => {
      try {
        const record = JSON.parse(line) as MergeRecord;
        if (record.id === mergeId) {
          return JSON.stringify(targetRecord);
        }
        return line;
      } catch {
        return line;
      }
    });

    // Rewrite file
    writeFileSync(ledgerPath, finalLines.join("\n") + "\n");

    return {
      success: true,
      message: `Rolled back merge ${mergeId}`,
      newCommit,
    };
  } catch (error) {
    return {
      success: false,
      message: `Rollback failed: ${(error as Error).message}`,
    };
  }
}

export function formatMergeHistory(records: MergeRecord[]): string {
  if (records.length === 0) {
    return "No merge history found";
  }

  let output = "Merge History:\n\n";

  for (const record of records) {
    const status = record.status === "rolled_back" ? "🔄 ROLLED BACK" : "✅ COMPLETED";
    const time = new Date(record.timestamp).toLocaleString();
    
    output += `${status} ${record.id}\n`;
    output += `  Branch: ${record.branch} → ${record.targetBranch}\n`;
    output += `  Time: ${time}\n`;
    output += `  By: ${record.mergedBy}\n`;
    output += `  Commits: ${record.preMergeCommit.slice(0, 8)} → ${record.postMergeCommit.slice(0, 8)}\n`;
    
    if (record.rollbackCommit) {
      const rollbackTime = record.rollbackTimestamp 
        ? new Date(record.rollbackTimestamp).toLocaleString() 
        : "unknown";
      output += `  Rollback: ${record.rollbackCommit.slice(0, 8)} at ${rollbackTime}\n`;
      if (record.rollbackReason) {
        output += `  Reason: ${record.rollbackReason}\n`;
      }
    }
    
    output += "\n";
  }

  return output;
}
