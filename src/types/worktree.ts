export type WorktreeStatus = 'active' | 'completed' | 'stale' | 'missing';

export interface Worktree {
  task_id: string;
  branch: string;
  path: string;
  agent?: string;
  created_at: string;
  status: WorktreeStatus;
}

export interface WorkflowState {
  session_id: string | null;
  current_prp_step: number;
  total_prp_steps: number;
  files_changed: number;
  last_commit_time: string | null;
  last_test_time: string | null;
  context_pressure: number;
  active_worktrees: Worktree[];
  pending_nudges: string[];
  errors_detected: string[];
  lsp_diagnostics_count: number;
}
