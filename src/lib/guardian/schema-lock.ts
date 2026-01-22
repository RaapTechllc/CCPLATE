import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

const MEMORY_DIR = join(process.cwd(), 'memory');
const LOCK_FILE = join(MEMORY_DIR, 'schema.lock');

export interface SchemaLock {
  worktreeId: string;
  acquiredAt: string;
  operation: 'migrate' | 'push' | 'edit';
  expiresAt: string;
}

export interface LockResult {
  acquired: boolean;
  holder?: SchemaLock;
  message: string;
}

// Lock timeout: 30 minutes (migrations can be slow)
const LOCK_TIMEOUT_MS = 30 * 60 * 1000;

function ensureMemoryDir(): void {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

export function acquireSchemaLock(worktreeId: string, operation: SchemaLock['operation']): LockResult {
  ensureMemoryDir();
  
  // Check for existing lock
  if (existsSync(LOCK_FILE)) {
    const existing: SchemaLock = JSON.parse(readFileSync(LOCK_FILE, 'utf-8'));
    
    // Check if lock expired
    if (new Date(existing.expiresAt) < new Date()) {
      // Lock expired, we can take it
      unlinkSync(LOCK_FILE);
    } else if (existing.worktreeId !== worktreeId) {
      // Another worktree holds the lock
      return {
        acquired: false,
        holder: existing,
        message: `Schema locked by worktree '${existing.worktreeId}' for ${existing.operation} since ${existing.acquiredAt}`,
      };
    }
    // Same worktree already has lock - allow re-entry
  }
  
  const lock: SchemaLock = {
    worktreeId,
    operation,
    acquiredAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + LOCK_TIMEOUT_MS).toISOString(),
  };
  
  writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2));
  
  return {
    acquired: true,
    message: `Schema lock acquired for ${operation}`,
  };
}

export function releaseSchemaLock(worktreeId: string): boolean {
  if (!existsSync(LOCK_FILE)) return true;
  
  const existing: SchemaLock = JSON.parse(readFileSync(LOCK_FILE, 'utf-8'));
  
  if (existing.worktreeId !== worktreeId) {
    return false; // Can't release someone else's lock
  }
  
  unlinkSync(LOCK_FILE);
  return true;
}

export function getSchemaLockStatus(): SchemaLock | null {
  if (!existsSync(LOCK_FILE)) return null;
  
  try {
    const lock: SchemaLock = JSON.parse(readFileSync(LOCK_FILE, 'utf-8'));
    // Check if expired
    if (new Date(lock.expiresAt) < new Date()) {
      unlinkSync(LOCK_FILE);
      return null;
    }
    return lock;
  } catch {
    return null;
  }
}

export function isSchemaLocked(): boolean {
  const lock = getSchemaLockStatus();
  return lock !== null;
}

export function isSchemaLockedByOther(currentWorktreeId: string): SchemaLock | null {
  const lock = getSchemaLockStatus();
  if (!lock) return null;
  if (lock.worktreeId === currentWorktreeId) return null;
  return lock;
}
