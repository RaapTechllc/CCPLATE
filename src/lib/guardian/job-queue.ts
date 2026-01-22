import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface GuardianJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
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
  error?: string;
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

export function getJobsBySource(repo: string, issueOrPr: number): GuardianJob[] {
  return loadJobs().filter(j => 
    j.source.repo === repo && 
    (j.source.issueNumber === issueOrPr || j.source.prNumber === issueOrPr)
  );
}

export function getAllJobs(): GuardianJob[] {
  return loadJobs();
}
