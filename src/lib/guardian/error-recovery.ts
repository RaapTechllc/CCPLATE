/**
 * Self-Healing Error Recovery System
 * 
 * Learning system that tracks error patterns, fix strategies,
 * and success rates to improve over time.
 * 
 * Features:
 * - ErrorPatternDB with dynamic patterns
 * - Multiple fix strategies per pattern with success rates
 * - Auto-categorize new errors
 * - Learn from successful fixes
 * - Context-aware fix selection
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { COMMON_ERROR_PATTERNS } from "./tiers/beginner";

// ============================================================================
// TYPES
// ============================================================================

export type ErrorCategory =
  | "typescript"
  | "lint"
  | "build"
  | "runtime"
  | "test"
  | "database"
  | "auth"
  | "network"
  | "unknown";

export type FixOutcome = "success" | "partial" | "failure";

export interface FixStrategy {
  id: string;
  description: string;
  command?: string;
  codeTransform?: string;
  manualSteps?: string[];
  attempts: number;
  successes: number;
  partials: number;
  failures: number;
  avgFixTimeMs: number;
  lastUsed?: string;
}

export interface ErrorPattern {
  id: string;
  name: string;
  category: ErrorCategory;
  regex: string;
  regexFlags: string;
  description: string;
  confidence: number;
  strategies: FixStrategy[];
  occurrences: number;
  lastSeen?: string;
  examples: ErrorExample[];
  contextHints: string[];
}

export interface ErrorExample {
  error: string;
  file?: string;
  line?: number;
  fix?: string;
  timestamp: string;
}

export interface ErrorMatch {
  patternId: string;
  patternName: string;
  category: ErrorCategory;
  confidence: number;
  capturedGroups: string[];
  bestStrategy?: FixStrategy;
}

export interface FixAttempt {
  patternId: string;
  strategyId: string;
  error: string;
  file?: string;
  startTime: string;
  endTime?: string;
  outcome?: FixOutcome;
  details?: string;
}

export interface ErrorPatternDB {
  version: string;
  lastUpdated: string;
  patterns: ErrorPattern[];
  recentAttempts: FixAttempt[];
}

export interface RecoveryResult {
  matched: boolean;
  pattern?: ErrorMatch;
  strategy?: FixStrategy;
  suggestion: string;
  escalate: boolean;
  reason?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MEMORY_DIR = "memory";
const PATTERNS_FILE = "error-patterns.json";
const DB_VERSION = "1.0.0";
const MAX_EXAMPLES = 5;
const MAX_RECENT_ATTEMPTS = 100;
const MIN_SUCCESS_RATE = 0.3;
const ESCALATION_THRESHOLD = 3;

// Category detection keywords - ORDER MATTERS (more specific categories first)
const CATEGORY_KEYWORDS: Record<ErrorCategory, string[]> = {
  // Most specific first
  database: ["Prisma", "Convex", "database", "migration", "foreign key", "ConvexError"],
  auth: ["Unauthenticated", "Unauthorized", "Auth", "permission denied", "session expired"],
  network: ["ECONNREFUSED", "CORS", "fetch failed", "network error", "timeout error", "HTTP error"],
  lint: ["ESLint", "lint error", "Prettier", "no-unused-vars", "prefer-const"],
  build: ["Build failed", "Compile error", "bundle", "webpack", "rollup", "Module not found", "Cannot find module"],
  test: ["Test failed", "Vitest", "Jest", "expect", "assert", "mock", "spec.ts"],
  runtime: ["TypeError", "ReferenceError", "Error:", "Uncaught", "at Object", "Runtime"],
  // Typescript last because "type" is too generic
  typescript: ["error TS", "TS2", "TS7", "is not assignable to type", "interface", "generic"],
  unknown: [],
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Get path to error patterns file
 */
export function getPatternDBPath(rootDir: string): string {
  return join(rootDir, MEMORY_DIR, PATTERNS_FILE);
}

/**
 * Initialize pattern database with seed data
 */
export function initializePatternDB(): ErrorPatternDB {
  const patterns: ErrorPattern[] = [];
  
  // Convert COMMON_ERROR_PATTERNS to ErrorPattern format
  for (const [key, value] of Object.entries(COMMON_ERROR_PATTERNS)) {
    patterns.push({
      id: key,
      name: key.replace(/([A-Z])/g, " $1").trim(),
      category: categorizePattern(key, value.regex.source),
      regex: value.regex.source,
      regexFlags: value.regex.flags,
      description: value.fix,
      confidence: value.confidence,
      strategies: [
        {
          id: `${key}-default`,
          description: value.fix,
          attempts: 0,
          successes: 0,
          partials: 0,
          failures: 0,
          avgFixTimeMs: 0,
        },
      ],
      occurrences: 0,
      examples: [],
      contextHints: extractContextHints(key),
    });
  }
  
  // Add additional common patterns
  patterns.push(
    {
      id: "nextImageOptimization",
      name: "Next.js Image Optimization",
      category: "build",
      regex: "Image Optimization.*is not configured",
      regexFlags: "i",
      description: "Configure next.config.ts with images.remotePatterns",
      confidence: 0.95,
      strategies: [
        {
          id: "nextImageOptimization-config",
          description: "Add domain to next.config.ts images.remotePatterns",
          codeTransform: `// In next.config.ts:
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '**' }
  ]
}`,
          attempts: 0,
          successes: 0,
          partials: 0,
          failures: 0,
          avgFixTimeMs: 0,
        },
      ],
      occurrences: 0,
      examples: [],
      contextHints: ["next.config", "Image", "remotePatterns"],
    },
    {
      id: "useClientDirective",
      name: "Missing 'use client' Directive",
      category: "build",
      regex: "useState|useEffect|onClick.*can only be used in a Client Component",
      regexFlags: "i",
      description: "Add 'use client' directive at top of file",
      confidence: 0.9,
      strategies: [
        {
          id: "useClientDirective-add",
          description: "Add 'use client' as first line of file",
          codeTransform: "'use client';",
          attempts: 0,
          successes: 0,
          partials: 0,
          failures: 0,
          avgFixTimeMs: 0,
        },
      ],
      occurrences: 0,
      examples: [],
      contextHints: ["React", "useState", "useEffect", "onClick", "Client Component"],
    },
    {
      id: "asyncServerComponent",
      name: "Async Server Component Issue",
      category: "runtime",
      regex: "async.*Server Component.*not supported|Objects are not valid as a React child",
      regexFlags: "i",
      description: "Ensure async components return valid JSX",
      confidence: 0.8,
      strategies: [
        {
          id: "asyncServerComponent-await",
          description: "Ensure all promises are awaited before rendering",
          attempts: 0,
          successes: 0,
          partials: 0,
          failures: 0,
          avgFixTimeMs: 0,
        },
        {
          id: "asyncServerComponent-suspense",
          description: "Wrap in Suspense boundary with fallback",
          codeTransform: `<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>`,
          attempts: 0,
          successes: 0,
          partials: 0,
          failures: 0,
          avgFixTimeMs: 0,
        },
      ],
      occurrences: 0,
      examples: [],
      contextHints: ["async", "await", "Server Component", "Suspense"],
    },
    {
      id: "convexQueryError",
      name: "Convex Query Error",
      category: "database",
      regex: "ConvexError|Query.*failed|Could not find.*table",
      regexFlags: "i",
      description: "Check Convex schema and query definitions",
      confidence: 0.85,
      strategies: [
        {
          id: "convexQueryError-schema",
          description: "Run npx convex dev to sync schema",
          command: "npx convex dev",
          attempts: 0,
          successes: 0,
          partials: 0,
          failures: 0,
          avgFixTimeMs: 0,
        },
        {
          id: "convexQueryError-args",
          description: "Verify query arguments match schema",
          attempts: 0,
          successes: 0,
          partials: 0,
          failures: 0,
          avgFixTimeMs: 0,
        },
      ],
      occurrences: 0,
      examples: [],
      contextHints: ["Convex", "query", "mutation", "schema"],
    },
    {
      id: "tailwindPurge",
      name: "Tailwind Classes Not Applied",
      category: "build",
      regex: "class.*not found|Tailwind.*not working",
      regexFlags: "i",
      description: "Check Tailwind content paths in config",
      confidence: 0.7,
      strategies: [
        {
          id: "tailwindPurge-content",
          description: "Update content array in tailwind.config.ts",
          codeTransform: `content: [
  './src/**/*.{js,ts,jsx,tsx,mdx}',
  './app/**/*.{js,ts,jsx,tsx,mdx}',
]`,
          attempts: 0,
          successes: 0,
          partials: 0,
          failures: 0,
          avgFixTimeMs: 0,
        },
      ],
      occurrences: 0,
      examples: [],
      contextHints: ["Tailwind", "CSS", "className", "content"],
    },
    {
      id: "envVarMissing",
      name: "Environment Variable Missing",
      category: "runtime",
      regex: "process\\.env\\.(\\w+).*undefined|Environment variable.*not set",
      regexFlags: "i",
      description: "Add missing environment variable to .env.local",
      confidence: 0.9,
      strategies: [
        {
          id: "envVarMissing-add",
          description: "Add variable to .env.local file",
          attempts: 0,
          successes: 0,
          partials: 0,
          failures: 0,
          avgFixTimeMs: 0,
        },
        {
          id: "envVarMissing-validate",
          description: "Add runtime validation with fallback",
          codeTransform: `const value = process.env.VAR_NAME ?? throw new Error('VAR_NAME required');`,
          attempts: 0,
          successes: 0,
          partials: 0,
          failures: 0,
          avgFixTimeMs: 0,
        },
      ],
      occurrences: 0,
      examples: [],
      contextHints: ["env", "environment", "process.env", ".env"],
    },
  );
  
  return {
    version: DB_VERSION,
    lastUpdated: new Date().toISOString(),
    patterns,
    recentAttempts: [],
  };
}

/**
 * Load pattern database from disk
 */
export function loadPatternDB(rootDir: string): ErrorPatternDB {
  const dbPath = getPatternDBPath(rootDir);
  
  if (!existsSync(dbPath)) {
    const db = initializePatternDB();
    savePatternDB(rootDir, db);
    return db;
  }
  
  try {
    return JSON.parse(readFileSync(dbPath, "utf-8"));
  } catch {
    // Corrupt file, reinitialize
    const db = initializePatternDB();
    savePatternDB(rootDir, db);
    return db;
  }
}

/**
 * Save pattern database to disk
 */
export function savePatternDB(rootDir: string, db: ErrorPatternDB): void {
  const memoryPath = join(rootDir, MEMORY_DIR);
  if (!existsSync(memoryPath)) {
    mkdirSync(memoryPath, { recursive: true });
  }
  
  db.lastUpdated = new Date().toISOString();
  writeFileSync(getPatternDBPath(rootDir), JSON.stringify(db, null, 2), "utf-8");
}

// ============================================================================
// PATTERN MATCHING
// ============================================================================

/**
 * Categorize a pattern based on its name and regex
 */
function categorizePattern(name: string, regexSource: string): ErrorCategory {
  const combined = `${name} ${regexSource}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (combined.includes(keyword.toLowerCase())) {
        return category as ErrorCategory;
      }
    }
  }
  
  return "unknown";
}

/**
 * Extract context hints from pattern name
 */
function extractContextHints(name: string): string[] {
  const hints: string[] = [];
  
  // Split camelCase
  const words = name.replace(/([A-Z])/g, " $1").trim().split(/\s+/);
  
  for (const word of words) {
    if (word.length >= 3) {
      hints.push(word);
    }
  }
  
  return hints;
}

/**
 * Auto-categorize an error message
 */
export function categorizeError(errorMessage: string): ErrorCategory {
  const lower = errorMessage.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "unknown") continue;
    
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return category as ErrorCategory;
      }
    }
  }
  
  return "unknown";
}

/**
 * Match an error against all patterns
 */
export function matchError(errorMessage: string, db: ErrorPatternDB): ErrorMatch | null {
  let bestMatch: ErrorMatch | null = null;
  let bestConfidence = 0;
  
  for (const pattern of db.patterns) {
    try {
      const regex = new RegExp(pattern.regex, pattern.regexFlags);
      const match = errorMessage.match(regex);
      
      if (match) {
        // Calculate adjusted confidence based on success rate
        const topStrategy = getTopStrategy(pattern);
        const successRate = topStrategy ? getSuccessRate(topStrategy) : 0.5;
        const adjustedConfidence = pattern.confidence * (0.5 + successRate * 0.5);
        
        if (adjustedConfidence > bestConfidence) {
          bestConfidence = adjustedConfidence;
          bestMatch = {
            patternId: pattern.id,
            patternName: pattern.name,
            category: pattern.category,
            confidence: adjustedConfidence,
            capturedGroups: match.slice(1),
            bestStrategy: topStrategy,
          };
        }
      }
    } catch {
      // Invalid regex, skip
    }
  }
  
  return bestMatch;
}

/**
 * Get the best strategy for a pattern based on success rate
 */
function getTopStrategy(pattern: ErrorPattern): FixStrategy | undefined {
  if (pattern.strategies.length === 0) return undefined;
  
  // Sort by success rate, then by recency
  const sorted = [...pattern.strategies].sort((a, b) => {
    const rateA = getSuccessRate(a);
    const rateB = getSuccessRate(b);
    
    if (Math.abs(rateA - rateB) > 0.1) {
      return rateB - rateA;
    }
    
    // If similar rates, prefer recently used
    if (a.lastUsed && b.lastUsed) {
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    }
    
    return rateB - rateA;
  });
  
  return sorted[0];
}

/**
 * Calculate success rate for a strategy
 */
export function getSuccessRate(strategy: FixStrategy): number {
  const total = strategy.attempts;
  if (total === 0) return 0.5; // No data, assume neutral
  
  const weighted = strategy.successes + strategy.partials * 0.5;
  return weighted / total;
}

// ============================================================================
// RECOVERY LOGIC
// ============================================================================

/**
 * Attempt to recover from an error
 */
export function attemptRecovery(
  rootDir: string,
  errorMessage: string,
  context?: { file?: string; line?: number; previousAttempts?: number },
): RecoveryResult {
  const db = loadPatternDB(rootDir);
  const match = matchError(errorMessage, db);
  
  // No match found
  if (!match) {
    // Auto-categorize and create new pattern suggestion
    const category = categorizeError(errorMessage);
    
    return {
      matched: false,
      suggestion: `Unknown error (${category}). Consider adding a pattern for this error type.`,
      escalate: true,
      reason: "No matching pattern found",
    };
  }
  
  // Find the pattern
  const pattern = db.patterns.find(p => p.id === match.patternId);
  if (!pattern) {
    return {
      matched: false,
      suggestion: "Pattern found but not in database",
      escalate: true,
      reason: "Database inconsistency",
    };
  }
  
  // Check if we've exceeded retry threshold
  const previousAttempts = context?.previousAttempts || 0;
  if (previousAttempts >= ESCALATION_THRESHOLD) {
    return {
      matched: true,
      pattern: match,
      strategy: match.bestStrategy,
      suggestion: `Max retries (${ESCALATION_THRESHOLD}) exceeded for ${match.patternName}. Escalating to HITL.`,
      escalate: true,
      reason: "Max retries exceeded",
    };
  }
  
  // Get strategy to try
  const strategy = selectStrategy(pattern, previousAttempts);
  
  if (!strategy) {
    return {
      matched: true,
      pattern: match,
      suggestion: `No viable strategies remaining for ${match.patternName}. Escalating to HITL.`,
      escalate: true,
      reason: "No strategies available",
    };
  }
  
  // Check if strategy has acceptable success rate
  const successRate = getSuccessRate(strategy);
  if (successRate < MIN_SUCCESS_RATE && strategy.attempts >= 3) {
    return {
      matched: true,
      pattern: match,
      strategy,
      suggestion: `Strategy "${strategy.description}" has low success rate (${(successRate * 100).toFixed(0)}%). Consider manual intervention.`,
      escalate: true,
      reason: "Low success rate",
    };
  }
  
  // Build suggestion with captured groups
  let suggestion = strategy.description;
  for (let i = 0; i < match.capturedGroups.length; i++) {
    suggestion = suggestion.replace(`$${i + 1}`, match.capturedGroups[i] || "");
  }
  
  // Record the attempt
  recordAttempt(rootDir, {
    patternId: match.patternId,
    strategyId: strategy.id,
    error: errorMessage,
    file: context?.file,
    startTime: new Date().toISOString(),
  });
  
  return {
    matched: true,
    pattern: match,
    strategy,
    suggestion,
    escalate: false,
  };
}

/**
 * Select the next strategy to try
 */
function selectStrategy(pattern: ErrorPattern, previousAttempts: number): FixStrategy | undefined {
  const viableStrategies = pattern.strategies.filter(s => {
    const rate = getSuccessRate(s);
    return rate >= MIN_SUCCESS_RATE || s.attempts < 3;
  });
  
  if (viableStrategies.length === 0) return undefined;
  
  // Rotate through strategies based on attempt number
  const index = previousAttempts % viableStrategies.length;
  return viableStrategies[index];
}

// ============================================================================
// LEARNING SYSTEM
// ============================================================================

/**
 * Record a fix attempt
 */
export function recordAttempt(rootDir: string, attempt: FixAttempt): void {
  const db = loadPatternDB(rootDir);
  
  // Add to recent attempts
  db.recentAttempts.unshift(attempt);
  if (db.recentAttempts.length > MAX_RECENT_ATTEMPTS) {
    db.recentAttempts = db.recentAttempts.slice(0, MAX_RECENT_ATTEMPTS);
  }
  
  // Update pattern occurrence count
  const pattern = db.patterns.find(p => p.id === attempt.patternId);
  if (pattern) {
    pattern.occurrences++;
    pattern.lastSeen = attempt.startTime;
    
    // Add example if not too many
    if (pattern.examples.length < MAX_EXAMPLES) {
      pattern.examples.push({
        error: attempt.error.slice(0, 500),
        file: attempt.file,
        timestamp: attempt.startTime,
      });
    }
  }
  
  savePatternDB(rootDir, db);
}

/**
 * Record the outcome of a fix attempt
 */
export function recordOutcome(
  rootDir: string,
  patternId: string,
  strategyId: string,
  outcome: FixOutcome,
  details?: string,
): void {
  const db = loadPatternDB(rootDir);
  
  // Find the recent attempt
  const attemptIndex = db.recentAttempts.findIndex(
    a => a.patternId === patternId && a.strategyId === strategyId && !a.outcome,
  );
  
  if (attemptIndex !== -1) {
    db.recentAttempts[attemptIndex].outcome = outcome;
    db.recentAttempts[attemptIndex].endTime = new Date().toISOString();
    db.recentAttempts[attemptIndex].details = details;
  }
  
  // Update strategy stats
  const pattern = db.patterns.find(p => p.id === patternId);
  if (pattern) {
    const strategy = pattern.strategies.find(s => s.id === strategyId);
    if (strategy) {
      strategy.attempts++;
      strategy.lastUsed = new Date().toISOString();
      
      switch (outcome) {
        case "success":
          strategy.successes++;
          break;
        case "partial":
          strategy.partials++;
          break;
        case "failure":
          strategy.failures++;
          break;
      }
      
      // Update average fix time
      if (attemptIndex !== -1) {
        const attempt = db.recentAttempts[attemptIndex];
        if (attempt.startTime && attempt.endTime) {
          const duration = new Date(attempt.endTime).getTime() - new Date(attempt.startTime).getTime();
          if (strategy.avgFixTimeMs === 0) {
            strategy.avgFixTimeMs = duration;
          } else {
            // Rolling average
            strategy.avgFixTimeMs = Math.round(
              (strategy.avgFixTimeMs * (strategy.attempts - 1) + duration) / strategy.attempts,
            );
          }
        }
      }
      
      // Update example with successful fix
      if (outcome === "success" && details && pattern.examples.length > 0) {
        const lastExample = pattern.examples[pattern.examples.length - 1];
        if (!lastExample.fix) {
          lastExample.fix = details;
        }
      }
    }
  }
  
  savePatternDB(rootDir, db);
}

/**
 * Add a new pattern from a successful fix
 */
export function learnPattern(
  rootDir: string,
  name: string,
  errorRegex: string,
  fixDescription: string,
  category?: ErrorCategory,
): ErrorPattern {
  const db = loadPatternDB(rootDir);
  
  // Check if similar pattern exists
  const existingId = name.toLowerCase().replace(/\s+/g, "");
  const existing = db.patterns.find(p => p.id === existingId);
  
  if (existing) {
    // Add as alternative strategy
    existing.strategies.push({
      id: `${existingId}-learned-${Date.now()}`,
      description: fixDescription,
      attempts: 1,
      successes: 1,
      partials: 0,
      failures: 0,
      avgFixTimeMs: 0,
    });
    
    savePatternDB(rootDir, db);
    return existing;
  }
  
  // Create new pattern
  const newPattern: ErrorPattern = {
    id: existingId,
    name,
    category: category || categorizeError(errorRegex),
    regex: errorRegex,
    regexFlags: "i",
    description: fixDescription,
    confidence: 0.7, // Start with moderate confidence
    strategies: [
      {
        id: `${existingId}-default`,
        description: fixDescription,
        attempts: 1,
        successes: 1,
        partials: 0,
        failures: 0,
        avgFixTimeMs: 0,
      },
    ],
    occurrences: 1,
    lastSeen: new Date().toISOString(),
    examples: [],
    contextHints: extractContextHints(name),
  };
  
  db.patterns.push(newPattern);
  savePatternDB(rootDir, db);
  
  return newPattern;
}

/**
 * Get statistics about the pattern database
 */
export function getDBStats(rootDir: string): {
  totalPatterns: number;
  totalStrategies: number;
  totalAttempts: number;
  successRate: number;
  topPatterns: Array<{ id: string; name: string; occurrences: number }>;
  topStrategies: Array<{ id: string; description: string; successRate: number }>;
} {
  const db = loadPatternDB(rootDir);
  
  let totalStrategies = 0;
  let totalAttempts = 0;
  let totalSuccesses = 0;
  
  const strategyStats: Array<{ id: string; description: string; successRate: number; attempts: number }> = [];
  
  for (const pattern of db.patterns) {
    for (const strategy of pattern.strategies) {
      totalStrategies++;
      totalAttempts += strategy.attempts;
      totalSuccesses += strategy.successes;
      
      if (strategy.attempts > 0) {
        strategyStats.push({
          id: strategy.id,
          description: strategy.description,
          successRate: getSuccessRate(strategy),
          attempts: strategy.attempts,
        });
      }
    }
  }
  
  const successRate = totalAttempts > 0 ? totalSuccesses / totalAttempts : 0;
  
  // Top patterns by occurrence
  const topPatterns = [...db.patterns]
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 5)
    .map(p => ({ id: p.id, name: p.name, occurrences: p.occurrences }));
  
  // Top strategies by success rate (with min attempts)
  const topStrategies = strategyStats
    .filter(s => s.attempts >= 2)
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5)
    .map(s => ({ id: s.id, description: s.description, successRate: s.successRate }));
  
  return {
    totalPatterns: db.patterns.length,
    totalStrategies,
    totalAttempts,
    successRate,
    topPatterns,
    topStrategies,
  };
}

/**
 * Format recovery result for display
 */
export function formatRecoveryResult(result: RecoveryResult): string {
  const lines: string[] = [];
  
  if (!result.matched) {
    lines.push(`❓ **No Matching Pattern**`);
    lines.push(``);
    lines.push(result.suggestion);
  } else {
    lines.push(`🔍 **Pattern Matched:** ${result.pattern?.patternName}`);
    lines.push(`📁 **Category:** ${result.pattern?.category}`);
    lines.push(`🎯 **Confidence:** ${((result.pattern?.confidence || 0) * 100).toFixed(0)}%`);
    lines.push(``);
    
    if (result.strategy) {
      const rate = getSuccessRate(result.strategy);
      lines.push(`💡 **Suggested Fix:** ${result.suggestion}`);
      lines.push(`📊 **Success Rate:** ${(rate * 100).toFixed(0)}% (${result.strategy.attempts} attempts)`);
      
      if (result.strategy.command) {
        lines.push(``);
        lines.push(`**Command:** \`${result.strategy.command}\``);
      }
      
      if (result.strategy.codeTransform) {
        lines.push(``);
        lines.push(`**Code Transform:**`);
        lines.push("```");
        lines.push(result.strategy.codeTransform);
        lines.push("```");
      }
    }
  }
  
  if (result.escalate) {
    lines.push(``);
    lines.push(`⚠️ **Escalation Required:** ${result.reason}`);
  }
  
  return lines.join("\n");
}
