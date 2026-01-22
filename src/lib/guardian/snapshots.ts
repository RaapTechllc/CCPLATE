import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const MEMORY_DIR = join(process.cwd(), 'memory');
const SNAPSHOTS_DIR = join(MEMORY_DIR, 'snapshots');

export interface Snapshot {
  id: string;
  step: number;
  timestamp: string;
  worktreeId?: string;
  gitCommit: string;
  gitBranch: string;
  description: string;
  validationPassed: boolean;
  files: {
    workflowState: string;
    activityLog: string;
    guardianState: string;
  };
}

function ensureSnapshotsDir(): void {
  if (!existsSync(SNAPSHOTS_DIR)) {
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
}

function getGitInfo(cwd: string = process.cwd()): { commit: string; branch: string } {
  try {
    const commit = execSync('git rev-parse HEAD', { cwd, encoding: 'utf-8' }).trim();
    const branch = execSync('git branch --show-current', { cwd, encoding: 'utf-8' }).trim();
    return { commit, branch };
  } catch {
    return { commit: 'unknown', branch: 'unknown' };
  }
}

function getNextStep(): number {
  ensureSnapshotsDir();
  const existing = readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json'));
  if (existing.length === 0) return 1;
  
  const steps = existing.map(f => {
    const snapshot = JSON.parse(readFileSync(join(SNAPSHOTS_DIR, f), 'utf-8')) as Snapshot;
    return snapshot.step;
  });
  
  return Math.max(...steps) + 1;
}

export function createSnapshot(options: {
  description: string;
  worktreeId?: string;
  validationPassed: boolean;
}): Snapshot {
  ensureSnapshotsDir();
  
  const step = getNextStep();
  const { commit, branch } = getGitInfo();
  
  const snapshot: Snapshot = {
    id: `snapshot-${step}-${Date.now()}`,
    step,
    timestamp: new Date().toISOString(),
    worktreeId: options.worktreeId,
    gitCommit: commit,
    gitBranch: branch,
    description: options.description,
    validationPassed: options.validationPassed,
    files: {
      workflowState: '',
      activityLog: '',
      guardianState: '',
    },
  };
  
  const statesToCopy = [
    { src: 'workflow-state.json', key: 'workflowState' },
    { src: 'ACTIVITY.md', key: 'activityLog' },
    { src: 'guardian-state.json', key: 'guardianState' },
  ] as const;
  
  for (const { src, key } of statesToCopy) {
    const srcPath = join(MEMORY_DIR, src);
    if (existsSync(srcPath)) {
      const destPath = join(SNAPSHOTS_DIR, `${snapshot.id}-${src}`);
      copyFileSync(srcPath, destPath);
      snapshot.files[key] = destPath;
    }
  }
  
  writeFileSync(
    join(SNAPSHOTS_DIR, `${snapshot.id}.json`),
    JSON.stringify(snapshot, null, 2)
  );
  
  return snapshot;
}

export function listSnapshots(): Snapshot[] {
  ensureSnapshotsDir();
  
  const files = readdirSync(SNAPSHOTS_DIR).filter(f => f.match(/^snapshot-\d+-\d+\.json$/));
  
  return files
    .map(f => JSON.parse(readFileSync(join(SNAPSHOTS_DIR, f), 'utf-8')) as Snapshot)
    .sort((a, b) => a.step - b.step);
}

export function getSnapshot(step: number): Snapshot | null {
  const snapshots = listSnapshots();
  return snapshots.find(s => s.step === step) || null;
}

export function rollbackToStep(step: number): { success: boolean; message: string } {
  const snapshot = getSnapshot(step);
  
  if (!snapshot) {
    return { success: false, message: `Snapshot for step ${step} not found` };
  }
  
  const restores = [
    { src: snapshot.files.workflowState, dest: 'workflow-state.json' },
    { src: snapshot.files.activityLog, dest: 'ACTIVITY.md' },
    { src: snapshot.files.guardianState, dest: 'guardian-state.json' },
  ];
  
  for (const { src, dest } of restores) {
    if (src && existsSync(src)) {
      copyFileSync(src, join(MEMORY_DIR, dest));
    }
  }
  
  try {
    execSync(`git checkout ${snapshot.gitCommit} -- .`, { 
      cwd: process.cwd(),
      stdio: 'pipe',
    });
  } catch (error) {
    return { 
      success: false, 
      message: `State restored but git checkout failed: ${error}`,
    };
  }
  
  return {
    success: true,
    message: `Rolled back to step ${step}: "${snapshot.description}" (${snapshot.gitCommit.slice(0, 7)})`,
  };
}

export function formatSnapshotsForDisplay(snapshots: Snapshot[]): string {
  if (snapshots.length === 0) return 'No snapshots yet.';
  
  let output = '## State Snapshots\n\n';
  output += '| Step | Time | Description | Commit | Valid |\n';
  output += '|------|------|-------------|--------|-------|\n';
  
  for (const s of snapshots) {
    const time = new Date(s.timestamp).toLocaleTimeString();
    const valid = s.validationPassed ? '✅' : '❌';
    output += `| ${s.step} | ${time} | ${s.description} | ${s.gitCommit.slice(0, 7)} | ${valid} |\n`;
  }
  
  return output;
}
