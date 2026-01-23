/**
 * Guardian Error Log - Centralized error logging for Guardian hooks
 * 
 * Logs errors from:
 * - GitHub webhook handlers
 * - Claude hooks
 * - Job execution
 * - Validation loops
 */

import { existsSync, appendFileSync, readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export interface GuardianError {
  id: string;
  timestamp: string;
  source: "webhook" | "claude_hook" | "job_executor" | "validation" | "tick" | "other";
  operation: string;
  error: {
    message: string;
    name?: string;
    stack?: string;
    code?: string;
  };
  context?: Record<string, unknown>;
  input?: unknown;
  severity: "error" | "warn" | "fatal";
}

const ERROR_LOG_FILE = "memory/guardian-errors.log";

function ensureDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function generateId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Log a Guardian error
 */
export function logGuardianError(
  rootDir: string,
  entry: Omit<GuardianError, "id" | "timestamp">
): GuardianError {
  const errorPath = join(rootDir, ERROR_LOG_FILE);
  ensureDir(errorPath);

  const fullEntry: GuardianError = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const logLine = JSON.stringify(fullEntry) + "\n";
  appendFileSync(errorPath, logLine);
  
  // Also log to console for visibility
  const icon = entry.severity === "fatal" ? "💀" : entry.severity === "error" ? "❌" : "⚠️";
  console.error(`${icon} [Guardian ${entry.source}] ${entry.operation}: ${entry.error.message}`);
  
  return fullEntry;
}

/**
 * Log error from webhook handler
 */
export function logWebhookError(
  rootDir: string,
  operation: string,
  error: Error | unknown,
  context?: Record<string, unknown>
): GuardianError {
  const err = error instanceof Error ? error : new Error(String(error));
  
  return logGuardianError(rootDir, {
    source: "webhook",
    operation,
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
    },
    context,
    severity: "error",
  });
}

/**
 * Log error from Claude hook
 */
export function logClaudeHookError(
  rootDir: string,
  hookName: string,
  error: Error | unknown,
  input?: unknown
): GuardianError {
  const err = error instanceof Error ? error : new Error(String(error));
  
  return logGuardianError(rootDir, {
    source: "claude_hook",
    operation: hookName,
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
    },
    input: sanitizeInput(input),
    severity: "error",
  });
}

/**
 * Log error from job executor
 */
export function logJobError(
  rootDir: string,
  jobId: string,
  operation: string,
  error: Error | unknown,
  context?: Record<string, unknown>
): GuardianError {
  const err = error instanceof Error ? error : new Error(String(error));
  
  return logGuardianError(rootDir, {
    source: "job_executor",
    operation: `${jobId}:${operation}`,
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
    },
    context,
    severity: "error",
  });
}

/**
 * Log error from validation loop
 */
export function logValidationError(
  rootDir: string,
  stage: string,
  error: Error | unknown,
  context?: Record<string, unknown>
): GuardianError {
  const err = error instanceof Error ? error : new Error(String(error));
  
  return logGuardianError(rootDir, {
    source: "validation",
    operation: stage,
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
    },
    context,
    severity: "error",
  });
}

/**
 * Log malformed input (doesn't throw, just logs)
 */
export function logMalformedInput(
  rootDir: string,
  source: GuardianError["source"],
  operation: string,
  reason: string,
  input?: unknown
): GuardianError {
  return logGuardianError(rootDir, {
    source,
    operation,
    error: {
      message: `Malformed input: ${reason}`,
      name: "MalformedInputError",
    },
    input: sanitizeInput(input),
    severity: "warn",
  });
}

/**
 * Sanitize input for logging (remove sensitive data, truncate)
 */
function sanitizeInput(input: unknown): unknown {
  if (input === undefined || input === null) return input;
  
  const str = typeof input === "string" ? input : JSON.stringify(input);
  
  // Truncate very long inputs
  if (str.length > 2000) {
    return str.slice(0, 2000) + "... [truncated]";
  }
  
  // Redact potential secrets
  return str
    .replace(/password["\s:=]+["']?[^"'\s,}]+/gi, 'password: [REDACTED]')
    .replace(/token["\s:=]+["']?[^"'\s,}]+/gi, 'token: [REDACTED]')
    .replace(/secret["\s:=]+["']?[^"'\s,}]+/gi, 'secret: [REDACTED]')
    .replace(/api[_-]?key["\s:=]+["']?[^"'\s,}]+/gi, 'api_key: [REDACTED]');
}

/**
 * Get recent errors
 */
export function getRecentErrors(
  rootDir: string,
  options?: {
    source?: GuardianError["source"];
    severity?: GuardianError["severity"];
    since?: Date;
    limit?: number;
  }
): GuardianError[] {
  const errorPath = join(rootDir, ERROR_LOG_FILE);
  
  if (!existsSync(errorPath)) {
    return [];
  }

  const lines = readFileSync(errorPath, "utf-8")
    .split("\n")
    .filter(Boolean);

  let entries = lines
    .map(line => {
      try {
        return JSON.parse(line) as GuardianError;
      } catch {
        return null;
      }
    })
    .filter((e): e is GuardianError => e !== null);

  // Apply filters
  if (options?.source) {
    entries = entries.filter(e => e.source === options.source);
  }

  if (options?.severity) {
    entries = entries.filter(e => e.severity === options.severity);
  }

  if (options?.since) {
    entries = entries.filter(e => new Date(e.timestamp) >= options.since!);
  }

  // Sort by timestamp descending
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply limit (default 50)
  const limit = options?.limit ?? 50;
  return entries.slice(0, limit);
}

/**
 * Format errors for display
 */
export function formatErrors(errors: GuardianError[]): string {
  if (errors.length === 0) {
    return "No errors logged";
  }

  let output = `Guardian Errors (${errors.length}):\n\n`;

  for (const err of errors) {
    const icon = err.severity === "fatal" ? "💀" : err.severity === "error" ? "❌" : "⚠️";
    const time = new Date(err.timestamp).toLocaleString();
    
    output += `${icon} [${err.source}] ${err.operation}\n`;
    output += `   Time: ${time}\n`;
    output += `   Error: ${err.error.message}\n`;
    
    if (err.context) {
      output += `   Context: ${JSON.stringify(err.context)}\n`;
    }
    
    output += "\n";
  }

  return output;
}
