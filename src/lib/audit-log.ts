import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface AuditEntry {
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  ip?: string;
}

export function logAuditEvent(entry: Omit<AuditEntry, 'timestamp'>): void {
  const memoryDir = join(process.cwd(), 'memory');
  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true });
  }
  
  const logPath = join(memoryDir, 'audit-log.jsonl');
  const fullEntry: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  
  appendFileSync(logPath, JSON.stringify(fullEntry) + '\n');
}
