"use server";

import { readFile, writeFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import type { Worktree, WorkflowState, WorktreeStatus } from "@/types/worktree";

const execAsync = promisify(exec);
const WORKFLOW_STATE_PATH = path.join(process.cwd(), "memory/workflow-state.json");

async function readWorkflowState(): Promise<WorkflowState> {
  const content = await readFile(WORKFLOW_STATE_PATH, "utf-8");
  return JSON.parse(content);
}

async function writeWorkflowState(state: WorkflowState): Promise<void> {
  await writeFile(WORKFLOW_STATE_PATH, JSON.stringify(state, null, 2));
}

async function checkWorktreeExists(worktreePath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync("git worktree list --porcelain");
    return stdout.includes(worktreePath);
  } catch {
    return false;
  }
}

function determineWorktreeStatus(worktree: Worktree, exists: boolean): WorktreeStatus {
  if (!exists) return "missing";
  
  const createdAt = new Date(worktree.created_at);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceCreation > 72) return "stale";
  
  return worktree.status === "completed" ? "completed" : "active";
}

export async function getWorktrees(): Promise<Worktree[]> {
  try {
    const state = await readWorkflowState();
    const worktrees = state.active_worktrees || [];
    
    const enrichedWorktrees = await Promise.all(
      worktrees.map(async (wt) => {
        const exists = await checkWorktreeExists(wt.path);
        return {
          ...wt,
          status: determineWorktreeStatus(wt, exists),
        };
      })
    );
    
    return enrichedWorktrees;
  } catch (error) {
    console.error("Failed to get worktrees:", error);
    return [];
  }
}

export async function createWorktree(
  taskId: string,
  agent: string
): Promise<{ success: boolean; error?: string; worktree?: Worktree }> {
  try {
    if (!taskId.match(/^[a-zA-Z0-9_-]+$/)) {
      return { success: false, error: "Invalid task ID format" };
    }

    const branch = `task/${taskId}`;
    const worktreePath = path.join(process.cwd(), "..", `ccplate-worktrees/${taskId}`);

    await execAsync(`git worktree add -b ${branch} "${worktreePath}" HEAD`);

    const state = await readWorkflowState();
    const newWorktree: Worktree = {
      task_id: taskId,
      branch,
      path: worktreePath,
      agent,
      created_at: new Date().toISOString(),
      status: "active",
    };

    state.active_worktrees = [...(state.active_worktrees || []), newWorktree];
    await writeWorkflowState(state);

    return { success: true, worktree: newWorktree };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function cleanupWorktree(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const state = await readWorkflowState();
    const worktree = state.active_worktrees?.find((wt) => wt.task_id === taskId);

    if (!worktree) {
      return { success: false, error: "Worktree not found" };
    }

    try {
      await execAsync(`git worktree remove "${worktree.path}" --force`);
    } catch {
      // Worktree might already be removed
    }

    try {
      await execAsync(`git branch -D ${worktree.branch}`);
    } catch {
      // Branch might already be deleted or merged
    }

    state.active_worktrees = state.active_worktrees.filter(
      (wt) => wt.task_id !== taskId
    );
    await writeWorkflowState(state);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
