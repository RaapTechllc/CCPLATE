import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  namespace: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default log level from environment
const DEFAULT_LOG_LEVEL: LogLevel =
  (process.env.GUARDIAN_LOG_LEVEL as LogLevel) || "info";

/**
 * Create a namespaced logger for consistent structured logging
 *
 * Usage:
 *   const log = createLogger('guardian.worktree');
 *   log.info('Created worktree', { id: 'oauth-api', path: '.worktrees/oauth-api' });
 *
 * Output (JSONL format):
 *   {"timestamp":"2026-01-23T10:15:30.123Z","namespace":"guardian.worktree","level":"info","message":"Created worktree","data":{"id":"oauth-api"}}
 */
export function createLogger(namespace: string, rootDir?: string) {
  const logDir = rootDir ? join(rootDir, "memory") : join(process.cwd(), "memory");
  const logFile = join(logDir, "guardian.log");

  function ensureLogDir() {
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }

  function log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    // Skip if below minimum log level
    if (LOG_LEVELS[level] < LOG_LEVELS[DEFAULT_LOG_LEVEL]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      namespace,
      level,
      message,
      ...(data && Object.keys(data).length > 0 ? { data } : {}),
    };

    try {
      ensureLogDir();
      const line = JSON.stringify(entry);
      appendFileSync(logFile, line + "\n");
    } catch {
      // Silently fail if we can't write to log
    }

    // Also output to console in dev
    if (process.env.NODE_ENV !== "production") {
      const prefix = `[${entry.timestamp.split("T")[1].slice(0, 8)}] ${namespace}:`;
      const consoleMethod = level === "error" ? console.error :
                           level === "warn" ? console.warn :
                           level === "debug" ? console.debug :
                           console.log;

      if (data && Object.keys(data).length > 0) {
        consoleMethod(`${prefix} ${message}`, data);
      } else {
        consoleMethod(`${prefix} ${message}`);
      }
    }
  }

  return {
    debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
  };
}

/**
 * Pre-configured loggers for Guardian modules
 * Import and use directly:
 *   import { loggers } from './logger';
 *   loggers.worktree.info('Created worktree', { id: 'oauth-api' });
 */
export const loggers = {
  worktree: createLogger("guardian.worktree"),
  mesh: createLogger("guardian.mesh"),
  harness: createLogger("guardian.harness"),
  hitl: createLogger("guardian.hitl"),
  job: createLogger("guardian.job"),
  preflight: createLogger("guardian.preflight"),
  schema: createLogger("guardian.schema"),
  merge: createLogger("guardian.merge"),
  activity: createLogger("guardian.activity"),
  validation: createLogger("guardian.validation"),
  webhook: createLogger("guardian.webhook"),
  labeling: createLogger("guardian.labeling"),
};

/**
 * Parse log entries from the log file
 */
export function parseLogEntries(
  rootDir: string,
  options?: {
    namespace?: string;
    level?: LogLevel;
    since?: Date;
    limit?: number;
    offset?: number;
  }
): LogEntry[] {
  const logFile = join(rootDir, "memory", "guardian.log");
  if (!existsSync(logFile)) {
    return [];
  }

  const content = readFileSync(logFile, "utf-8");
  const lines = content.split("\n").filter(Boolean);

  let entries: LogEntry[] = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as LogEntry;
      entries.push(entry);
    } catch {
      // Skip malformed lines
    }
  }

  // Apply filters
  if (options?.namespace) {
    const ns = options.namespace;
    entries = entries.filter((e) =>
      e.namespace === ns || e.namespace.startsWith(ns + ".")
    );
  }

  if (options?.level) {
    const minLevel = LOG_LEVELS[options.level];
    entries = entries.filter((e) => LOG_LEVELS[e.level] >= minLevel);
  }

  if (options?.since) {
    const sinceTime = options.since.getTime();
    entries = entries.filter((e) => new Date(e.timestamp).getTime() >= sinceTime);
  }

  // Reverse to get newest first
  entries.reverse();

  // Apply offset and limit
  if (options?.offset) {
    entries = entries.slice(options.offset);
  }

  if (options?.limit) {
    entries = entries.slice(0, options.limit);
  }

  return entries;
}

/**
 * Format log entries for CLI display
 */
export function formatLogEntries(entries: LogEntry[]): string {
  if (entries.length === 0) {
    return "No log entries found";
  }

  const lines: string[] = [];

  for (const entry of entries) {
    const time = entry.timestamp.split("T")[1].slice(0, 12);
    const levelIcon =
      entry.level === "error" ? "E" :
      entry.level === "warn" ? "W" :
      entry.level === "debug" ? "D" : "I";

    let line = `[${time}] ${levelIcon} ${entry.namespace}: ${entry.message}`;

    if (entry.data && Object.keys(entry.data).length > 0) {
      const dataStr = JSON.stringify(entry.data);
      if (dataStr.length < 60) {
        line += ` ${dataStr}`;
      } else {
        line += `\n    ${dataStr}`;
      }
    }

    lines.push(line);
  }

  return lines.join("\n");
}
