/**
 * Audit Log - Compliance logging for CCPLATE
 * 
 * Logs all significant operations for audit trails:
 * - Admin setting changes
 * - User permission changes
 * - Schema modifications
 * - Security-sensitive operations
 * - HITL decisions
 */

import { existsSync, appendFileSync, readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export type AuditCategory = 
  | "admin_settings"
  | "user_management"
  | "schema_change"
  | "security"
  | "hitl"
  | "merge"
  | "worktree"
  | "auth"
  | "file_upload"
  | "api_access";

export interface AuditEntry {
  id: string;
  timestamp: string;
  category: AuditCategory;
  action: string;
  actor: {
    id?: string;
    email?: string;
    type: "user" | "system" | "agent";
  };
  target?: {
    type: string;
    id?: string;
    name?: string;
  };
  details?: Record<string, unknown>;
  metadata?: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
    worktreeId?: string;
  };
  severity: "info" | "warn" | "critical";
}

const AUDIT_LOG_FILE = "memory/audit-log.jsonl";

function ensureDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Log an audit entry
 */
export function logAudit(
  rootDir: string,
  entry: Omit<AuditEntry, "id" | "timestamp">
): AuditEntry {
  const auditPath = join(rootDir, AUDIT_LOG_FILE);
  ensureDir(auditPath);

  const fullEntry: AuditEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    ...entry,
  };

  appendFileSync(auditPath, JSON.stringify(fullEntry) + "\n");
  return fullEntry;
}

/**
 * Log admin setting change
 */
export function logSettingChange(
  rootDir: string,
  options: {
    settingKey: string;
    oldValue: unknown;
    newValue: unknown;
    changedBy: { id?: string; email?: string };
    metadata?: Record<string, unknown>;
  }
): AuditEntry {
  return logAudit(rootDir, {
    category: "admin_settings",
    action: "setting_changed",
    actor: {
      ...options.changedBy,
      type: "user",
    },
    target: {
      type: "setting",
      name: options.settingKey,
    },
    details: {
      oldValue: options.oldValue,
      newValue: options.newValue,
    },
    metadata: options.metadata as AuditEntry["metadata"],
    severity: "info",
  });
}

/**
 * Log user permission change
 */
export function logPermissionChange(
  rootDir: string,
  options: {
    targetUserId: string;
    targetEmail?: string;
    permission: string;
    oldRole?: string;
    newRole?: string;
    changedBy: { id?: string; email?: string };
  }
): AuditEntry {
  return logAudit(rootDir, {
    category: "user_management",
    action: "permission_changed",
    actor: {
      ...options.changedBy,
      type: "user",
    },
    target: {
      type: "user",
      id: options.targetUserId,
      name: options.targetEmail,
    },
    details: {
      permission: options.permission,
      oldRole: options.oldRole,
      newRole: options.newRole,
    },
    severity: "warn",
  });
}

/**
 * Log schema modification
 */
export function logSchemaChange(
  rootDir: string,
  options: {
    operation: "create" | "alter" | "drop" | "migrate";
    entityType: "table" | "column" | "index" | "constraint";
    entityName: string;
    migration?: string;
    changedBy: { id?: string; email?: string; type: "user" | "system" | "agent" };
    worktreeId?: string;
  }
): AuditEntry {
  return logAudit(rootDir, {
    category: "schema_change",
    action: `schema_${options.operation}`,
    actor: options.changedBy,
    target: {
      type: options.entityType,
      name: options.entityName,
    },
    details: {
      migration: options.migration,
    },
    metadata: {
      worktreeId: options.worktreeId,
    },
    severity: options.operation === "drop" ? "critical" : "warn",
  });
}

/**
 * Log security event
 */
export function logSecurityEvent(
  rootDir: string,
  options: {
    event: string;
    description: string;
    actor?: { id?: string; email?: string };
    severity: "info" | "warn" | "critical";
    metadata?: AuditEntry["metadata"];
  }
): AuditEntry {
  return logAudit(rootDir, {
    category: "security",
    action: options.event,
    actor: options.actor 
      ? { ...options.actor, type: "user" }
      : { type: "system" },
    details: {
      description: options.description,
    },
    metadata: options.metadata,
    severity: options.severity,
  });
}

/**
 * Log HITL decision
 */
export function logHITLDecision(
  rootDir: string,
  options: {
    requestId: string;
    decision: "approved" | "rejected";
    decidedBy: string;
    reason?: string;
    notes?: string;
  }
): AuditEntry {
  return logAudit(rootDir, {
    category: "hitl",
    action: `hitl_${options.decision}`,
    actor: {
      email: options.decidedBy,
      type: "user",
    },
    target: {
      type: "hitl_request",
      id: options.requestId,
    },
    details: {
      reason: options.reason,
      notes: options.notes,
    },
    severity: options.decision === "rejected" ? "warn" : "info",
  });
}

/**
 * Log auth event
 */
export function logAuthEvent(
  rootDir: string,
  options: {
    event: "login" | "logout" | "login_failed" | "password_reset" | "register";
    userId?: string;
    email?: string;
    success: boolean;
    metadata?: AuditEntry["metadata"];
    details?: Record<string, unknown>;
  }
): AuditEntry {
  return logAudit(rootDir, {
    category: "auth",
    action: options.event,
    actor: {
      id: options.userId,
      email: options.email,
      type: "user",
    },
    details: {
      success: options.success,
      ...options.details,
    },
    metadata: options.metadata,
    severity: options.success ? "info" : "warn",
  });
}

/**
 * Get audit entries with filtering
 */
export function getAuditEntries(
  rootDir: string,
  options?: {
    category?: AuditCategory;
    severity?: AuditEntry["severity"];
    since?: Date;
    until?: Date;
    actor?: string;
    limit?: number;
  }
): AuditEntry[] {
  const auditPath = join(rootDir, AUDIT_LOG_FILE);
  
  if (!existsSync(auditPath)) {
    return [];
  }

  const lines = readFileSync(auditPath, "utf-8")
    .split("\n")
    .filter(Boolean);

  let entries = lines
    .map(line => {
      try {
        return JSON.parse(line) as AuditEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is AuditEntry => e !== null);

  // Apply filters
  if (options?.category) {
    entries = entries.filter(e => e.category === options.category);
  }

  if (options?.severity) {
    entries = entries.filter(e => e.severity === options.severity);
  }

  if (options?.since) {
    entries = entries.filter(e => new Date(e.timestamp) >= options.since!);
  }

  if (options?.until) {
    entries = entries.filter(e => new Date(e.timestamp) <= options.until!);
  }

  if (options?.actor) {
    entries = entries.filter(e => 
      e.actor.id === options.actor || 
      e.actor.email === options.actor
    );
  }

  // Sort by timestamp descending (most recent first)
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply limit
  if (options?.limit) {
    entries = entries.slice(0, options.limit);
  }

  return entries;
}

/**
 * Format audit entries for display
 */
export function formatAuditEntries(entries: AuditEntry[]): string {
  if (entries.length === 0) {
    return "No audit entries found";
  }

  let output = `Audit Log (${entries.length} entries):\n\n`;

  for (const entry of entries) {
    const severityIcon = 
      entry.severity === "critical" ? "🔴" :
      entry.severity === "warn" ? "🟠" : "⚪";
    
    const time = new Date(entry.timestamp).toLocaleString();
    const actor = entry.actor.email || entry.actor.id || entry.actor.type;
    
    output += `${severityIcon} [${entry.category}] ${entry.action}\n`;
    output += `   Time: ${time}\n`;
    output += `   Actor: ${actor}\n`;
    
    if (entry.target) {
      output += `   Target: ${entry.target.type}${entry.target.name ? ` (${entry.target.name})` : ""}\n`;
    }
    
    if (entry.details && Object.keys(entry.details).length > 0) {
      output += `   Details: ${JSON.stringify(entry.details)}\n`;
    }
    
    output += "\n";
  }

  return output;
}
