import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface GuardianJob {
  id: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  command: string;
  args: string;
  source: {
    type: 'github_issue' | 'github_pr' | 'cli';
    repo?: string;
    issueNumber?: number;
    prNumber?: number;
    commentId?: number;
    author?: string;
  };
  worktreeId?: string;
  artifacts?: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  error?: string;
  // HITL integration - job pauses when awaiting human decision
  awaitingHitl?: {
    requestId: string;
    reason: string;
    pausedAt: string;
  };
}

const MEMORY_DIR = join(process.cwd(), 'memory');
const JOBS_FILE = join(MEMORY_DIR, 'guardian-jobs.json');

function ensureMemoryDir(): void {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

function loadJobs(): GuardianJob[] {
  ensureMemoryDir();
  if (!existsSync(JOBS_FILE)) {
    return [];
  }
  return JSON.parse(readFileSync(JOBS_FILE, 'utf-8'));
}

function saveJobs(jobs: GuardianJob[]): void {
  ensureMemoryDir();
  writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

export function createJob(job: Omit<GuardianJob, 'id' | 'status' | 'createdAt'>): GuardianJob {
  const jobs = loadJobs();
  const newJob: GuardianJob = {
    ...job,
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  jobs.push(newJob);
  saveJobs(jobs);
  return newJob;
}

export function updateJob(id: string, updates: Partial<GuardianJob>): GuardianJob | null {
  const jobs = loadJobs();
  const index = jobs.findIndex(j => j.id === id);
  if (index === -1) return null;
  jobs[index] = { ...jobs[index], ...updates };
  saveJobs(jobs);
  return jobs[index];
}

export function getJob(id: string): GuardianJob | null {
  return loadJobs().find(j => j.id === id) || null;
}

export function getPendingJobs(): GuardianJob[] {
  return loadJobs().filter(j => j.status === 'pending');
}

export function getPausedJobs(): GuardianJob[] {
  return loadJobs().filter(j => j.status === 'paused');
}

export function getJobsAwaitingHitl(): GuardianJob[] {
  return loadJobs().filter(j => j.status === 'paused' && j.awaitingHitl);
}

export function getJobsBySource(repo: string, issueOrPr: number): GuardianJob[] {
  return loadJobs().filter(j => 
    j.source.repo === repo && 
    (j.source.issueNumber === issueOrPr || j.source.prNumber === issueOrPr)
  );
}

export function getAllJobs(): GuardianJob[] {
  return loadJobs();
}

/**
 * Pause a job, optionally because it's awaiting HITL
 */
export function pauseJob(
  id: string, 
  hitlRequestId?: string, 
  hitlReason?: string
): GuardianJob | null {
  const jobs = loadJobs();
  const index = jobs.findIndex(j => j.id === id);
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  jobs[index] = { 
    ...jobs[index], 
    status: 'paused',
    pausedAt: now,
    ...(hitlRequestId && hitlReason ? {
      awaitingHitl: {
        requestId: hitlRequestId,
        reason: hitlReason,
        pausedAt: now,
      }
    } : {})
  };
  saveJobs(jobs);
  return jobs[index];
}

/**
 * Resume a paused job
 */
export function resumeJob(id: string): GuardianJob | null {
  const jobs = loadJobs();
  const index = jobs.findIndex(j => j.id === id);
  if (index === -1) return null;
  if (jobs[index].status !== 'paused') return null;
  
  jobs[index] = { 
    ...jobs[index], 
    status: 'running',
    resumedAt: new Date().toISOString(),
    awaitingHitl: undefined,
  };
  saveJobs(jobs);
  return jobs[index];
}

/**
 * Find job waiting on a specific HITL request
 */
export function getJobByHitlRequest(hitlRequestId: string): GuardianJob | null {
  return loadJobs().find(j => 
    j.awaitingHitl?.requestId === hitlRequestId
  ) || null;
}
