/**
 * Structured Logger
 *
 * Replaces raw console.log/error calls with context-aware logging.
 * In production, this can be wired to Sentry breadcrumbs or an
 * external logging service. In development, it outputs formatted
 * messages to the console.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("User signed in", { userId: "abc123" });
 *   logger.error("Failed to generate", error, { builder: "hook" });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
    [key: string]: unknown;
}

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

function getMinLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
    if (envLevel && envLevel in LOG_LEVELS) return envLevel;
    return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()];
}

function formatError(error: unknown): LogEntry["error"] | undefined {
    if (!error) return undefined;
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        };
    }
    return { name: "UnknownError", message: String(error) };
}

function emit(entry: LogEntry): void {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
        // Structured JSON for log aggregators (Vercel, Datadog, etc.)
        // eslint-disable-next-line no-console
        const output = entry.level === "error" ? console.error : console.log;
        output(JSON.stringify(entry));
    } else {
        // Readable format for development
        const prefix = {
            debug: "🔍",
            info: "ℹ️",
            warn: "⚠️",
            error: "❌",
        }[entry.level];

        const parts = [`${prefix} [${entry.level.toUpperCase()}] ${entry.message}`];

        if (entry.context && Object.keys(entry.context).length > 0) {
            parts.push(`  ${JSON.stringify(entry.context)}`);
        }

        if (entry.error) {
            parts.push(`  Error: ${entry.error.name}: ${entry.error.message}`);
            if (entry.error.stack) {
                parts.push(`  ${entry.error.stack}`);
            }
        }

        // eslint-disable-next-line no-console
        const output = entry.level === "error"
            ? console.error
            : entry.level === "warn"
                ? console.warn
                : console.log;
        output(parts.join("\n"));
    }
}

function createLogFn(level: LogLevel) {
    return (message: string, errorOrContext?: unknown, context?: LogContext): void => {
        if (!shouldLog(level)) return;

        let logContext = context;
        let logError: unknown;

        // If second arg is an Error, treat it as the error
        if (errorOrContext instanceof Error) {
            logError = errorOrContext;
        } else if (errorOrContext && typeof errorOrContext === "object" && !Array.isArray(errorOrContext)) {
            logContext = errorOrContext as LogContext;
        }

        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context: logContext,
            error: formatError(logError),
        };

        emit(entry);
    };
}

export const logger = {
    debug: createLogFn("debug"),
    info: createLogFn("info"),
    warn: createLogFn("warn"),
    error: createLogFn("error"),

    /**
     * Create a child logger with pre-set context
     *
     * Usage:
     *   const log = logger.child({ builder: "hook", requestId: "abc" });
     *   log.info("Generating hook"); // includes builder & requestId
     */
    child(baseContext: LogContext) {
        return {
            debug: (msg: string, ctx?: LogContext) =>
                logger.debug(msg, { ...baseContext, ...ctx }),
            info: (msg: string, ctx?: LogContext) =>
                logger.info(msg, { ...baseContext, ...ctx }),
            warn: (msg: string, ctx?: LogContext) =>
                logger.warn(msg, { ...baseContext, ...ctx }),
            error: (msg: string, error?: unknown, ctx?: LogContext) =>
                logger.error(msg, error, { ...baseContext, ...ctx }),
        };
    },
};
