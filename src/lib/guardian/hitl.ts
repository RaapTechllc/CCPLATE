import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getJobByHitlRequest, resumeJob, pauseJob } from './job-queue';

const MEMORY_DIR = join(process.cwd(), 'memory');
const HITL_FILE = join(MEMORY_DIR, 'hitl-requests.json');

export type HITLReason = 
  | 'schema_destructive'      // DROP, column removal, type change
  | 'dependency_major'        // Major version bump
  | 'security_change'         // Auth/permission modifications
  | 'data_deletion'           // DELETE operations on data
  | 'merge_conflict'          // Semantic merge conflict
  | 'cost_threshold'          // Token/API cost exceeded
  | 'loop_detected'           // Circular tool usage pattern
  | 'test_failure_ambiguous'  // Can't determine if flaky or real
  | 'architecture_fork';      // Multiple valid approaches

export interface HITLRequest {
  id: string;
  jobId?: string;
  worktreeId?: string;
  reason: HITLReason;
  title: string;
  description: string;
  context: {
    files?: string[];
    diff?: string;
    options?: Array<{ id: string; label: string; description: string }>;
  };
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  notificationSent?: {
    slack?: boolean;
    discord?: boolean;
    email?: boolean;
  };
}

function ensureMemoryDir(): void {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

function loadRequests(): HITLRequest[] {
  ensureMemoryDir();
  if (!existsSync(HITL_FILE)) return [];
  try {
    return JSON.parse(readFileSync(HITL_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveRequests(requests: HITLRequest[]): void {
  ensureMemoryDir();
  writeFileSync(HITL_FILE, JSON.stringify(requests, null, 2));
}

/**
 * Request human decision, optionally pausing a job until resolved
 */
export function requestHumanDecision(request: Omit<HITLRequest, 'id' | 'status' | 'createdAt'>): HITLRequest {
  const requests = loadRequests();
  
  const newRequest: HITLRequest = {
    ...request,
    id: `hitl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  requests.push(newRequest);
  saveRequests(requests);
  
  // If this HITL request is associated with a job, pause that job
  if (request.jobId) {
    pauseJob(request.jobId, newRequest.id, request.reason);
    console.log(`⏸️  Job ${request.jobId} paused awaiting HITL`);
  }
  
  console.log(`🚨 HITL Request: ${newRequest.title}`);
  console.log(`   Reason: ${newRequest.reason}`);
  console.log(`   ID: ${newRequest.id}`);
  
  return newRequest;
}

/**
 * Resolve HITL request and auto-resume any paused job
 */
export function resolveHITLRequest(
  id: string, 
  resolution: 'approved' | 'rejected' | 'modified',
  resolvedBy: string,
  notes?: string
): HITLRequest | null {
  const requests = loadRequests();
  const index = requests.findIndex(r => r.id === id);
  
  if (index === -1) return null;
  
  requests[index] = {
    ...requests[index],
    status: resolution,
    resolvedAt: new Date().toISOString(),
    resolvedBy,
    resolution: notes,
  };
  
  saveRequests(requests);
  
  // Auto-resume any job that was waiting on this HITL request
  const pausedJob = getJobByHitlRequest(id);
  if (pausedJob) {
    if (resolution === 'approved') {
      resumeJob(pausedJob.id);
      console.log(`▶️  Job ${pausedJob.id} resumed after HITL approval`);
    } else {
      // For rejected/modified, job stays paused - may need manual intervention
      console.log(`⚠️  Job ${pausedJob.id} remains paused (HITL ${resolution})`);
    }
  }
  
  return requests[index];
}

export function getPendingHITLRequests(): HITLRequest[] {
  return loadRequests().filter(r => r.status === 'pending');
}

export function getHITLRequest(id: string): HITLRequest | null {
  const requests = loadRequests();
  return requests.find(r => r.id === id) || null;
}

export function getAllHITLRequests(): HITLRequest[] {
  return loadRequests();
}

export function needsHumanApproval(operation: {
  type: string;
  details: Record<string, unknown>;
}): { needed: boolean; reason?: HITLReason; message?: string } {
  
  if (operation.type === 'schema_change') {
    const sql = String(operation.details.sql || '');
    if (sql.match(/DROP|ALTER.*DROP|ALTER.*TYPE/i)) {
      return { 
        needed: true, 
        reason: 'schema_destructive',
        message: 'Destructive schema change detected (DROP/ALTER TYPE)',
      };
    }
  }
  
  if (operation.type === 'dependency_update') {
    const { from, to } = operation.details as { from: string; to: string };
    const fromMajor = parseInt(from.split('.')[0]);
    const toMajor = parseInt(to.split('.')[0]);
    if (toMajor > fromMajor) {
      return {
        needed: true,
        reason: 'dependency_major',
        message: `Major version bump: ${from} → ${to}`,
      };
    }
  }
  
  if (operation.type === 'database_query') {
    const query = String(operation.details.query || '');
    if (query.match(/DELETE\s+FROM/i) && !query.match(/WHERE/i)) {
      return {
        needed: true,
        reason: 'data_deletion',
        message: 'DELETE without WHERE clause detected',
      };
    }
  }

  if (operation.type === 'security_change') {
    return {
      needed: true,
      reason: 'security_change',
      message: 'Security-related change requires review',
    };
  }

  if (operation.type === 'cost_check') {
    const { current, threshold } = operation.details as { current: number; threshold: number };
    if (current > threshold) {
      return {
        needed: true,
        reason: 'cost_threshold',
        message: `Cost threshold exceeded: ${current} > ${threshold}`,
      };
    }
  }
  
  return { needed: false };
}
