export type WorktreeStatus = 'active' | 'completed' | 'stale' | 'missing';

export interface Worktree {
  task_id: string;
  branch: string;
  path: string;
  agent?: string;
  created_at: string;
  status: WorktreeStatus;
}

export interface WorktreeEntity {
  type: 'issue' | 'pr' | 'job';
  id: string | number;
  repo?: string;
}

export interface WorktreeAssociation {
  worktreeId: string;
  worktreePath: string;
  branch: string;
  entities: WorktreeEntity[];
  createdAt: string;
  lastAccessedAt: string;
}

export interface ActiveWorktree {
  id: string;
  path: string;
  branch: string;
  agent?: string;
  createdAt: string;
  task_id?: string;
  created_at?: string;
}

export interface WorkflowState {
  session_id: string | null;
  current_prp_step: number;
  total_prp_steps: number;
  files_changed: number;
  last_commit_time: string | null;
  last_test_time: string | null;
  context_pressure: number;
  active_worktrees: ActiveWorktree[];
  worktree_associations: WorktreeAssociation[];
  artifact_chain: string[];
  pending_nudges: string[];
  errors_detected: string[];
  lsp_diagnostics_count: number;
  untested_additions: string[];
}
