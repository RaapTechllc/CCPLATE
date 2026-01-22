import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { WorkflowState, WorktreeAssociation, WorktreeEntity } from '@/types/worktree';

const WORKFLOW_STATE_PATH = join(process.cwd(), 'memory/workflow-state.json');

function getDefaultState(): WorkflowState {
  return {
    session_id: null,
    current_prp_step: 0,
    total_prp_steps: 0,
    files_changed: 0,
    last_commit_time: null,
    last_test_time: null,
    context_pressure: 0,
    active_worktrees: [],
    worktree_associations: [],
    artifact_chain: [],
    pending_nudges: [],
    errors_detected: [],
    lsp_diagnostics_count: 0,
    untested_additions: [],
  };
}

export function loadState(): WorkflowState {
  if (!existsSync(WORKFLOW_STATE_PATH)) {
    return getDefaultState();
  }
  const raw = JSON.parse(readFileSync(WORKFLOW_STATE_PATH, 'utf-8'));
  return {
    ...getDefaultState(),
    ...raw,
  };
}

export function saveState(state: WorkflowState): void {
  writeFileSync(WORKFLOW_STATE_PATH, JSON.stringify(state, null, 2));
}

export function findWorktreeForEntity(
  type: 'issue' | 'pr',
  id: number,
  repo: string
): WorktreeAssociation | null {
  const state = loadState();

  return (
    state.worktree_associations.find((assoc) =>
      assoc.entities.some((e) => e.type === type && e.id === id && e.repo === repo)
    ) || null
  );
}

export function associateEntityWithWorktree(
  worktreeId: string,
  entity: WorktreeEntity
): void {
  const state = loadState();

  const association = state.worktree_associations.find((a) => a.worktreeId === worktreeId);

  if (association) {
    const existingEntity = association.entities.find(
      (e) => e.type === entity.type && e.id === entity.id
    );
    if (!existingEntity) {
      association.entities.push(entity);
    }
    association.lastAccessedAt = new Date().toISOString();
  } else {
    const worktree = state.active_worktrees.find((w) => w.id === worktreeId);
    if (!worktree) return;

    state.worktree_associations.push({
      worktreeId,
      worktreePath: worktree.path,
      branch: worktree.branch,
      entities: [entity],
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    });
  }

  saveState(state);
}

export function getOrCreateWorktreeForEntity(
  type: 'issue' | 'pr',
  id: number,
  repo: string
): { worktreeId: string; isNew: boolean; path?: string } {
  const existing = findWorktreeForEntity(type, id, repo);

  if (existing) {
    const state = loadState();
    const assoc = state.worktree_associations.find((a) => a.worktreeId === existing.worktreeId);
    if (assoc) {
      assoc.lastAccessedAt = new Date().toISOString();
      saveState(state);
    }
    return { worktreeId: existing.worktreeId, isNew: false, path: existing.worktreePath };
  }

  const worktreeId = `${type}-${id}`;
  return { worktreeId, isNew: true };
}

export function removeWorktreeAssociation(worktreeId: string): void {
  const state = loadState();
  state.worktree_associations = state.worktree_associations.filter(
    (a) => a.worktreeId !== worktreeId
  );
  saveState(state);
}

export function cleanupStaleAssociations(): number {
  const state = loadState();
  const activeIds = new Set(state.active_worktrees.map((w) => w.id));
  const before = state.worktree_associations.length;

  state.worktree_associations = state.worktree_associations.filter((a) =>
    activeIds.has(a.worktreeId)
  );

  const removed = before - state.worktree_associations.length;
  if (removed > 0) {
    saveState(state);
  }
  return removed;
}
