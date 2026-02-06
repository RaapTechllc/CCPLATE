/**
 * Smart Handoff - Context Compression for Session Continuity
 * 
 * Analyzes next task to determine relevant context, compresses
 * decisions/blockers/patterns/tests with priority-based injection.
 * 
 * Features:
 * - Task-aware context analysis
 * - Priority-based compression (critical first)
 * - Configurable token budget
 * - Hash for full context retrieval
 * - Integration with existing handoff.ts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import type { HandoffState, CriticalFile, HandoffDecision } from "./handoff";
import { loadHandoff } from "./handoff";
import { loadPatternDB, type ErrorPattern, type FixAttempt } from "./error-recovery";
import { loadEvents, type WorkflowEvent } from "./ralph-engine";

// ============================================================================
// TYPES
// ============================================================================

export type ContextPriority = "critical" | "high" | "medium" | "low";

export interface ContextItem {
  id: string;
  type: ContextType;
  priority: ContextPriority;
  content: string;
  tokens: number;
  relevanceScore: number;
  source: string;
  timestamp?: string;
}

export type ContextType =
  | "decision"
  | "blocker"
  | "error_pattern"
  | "test_result"
  | "file_change"
  | "build_output"
  | "task_status"
  | "phase_info"
  | "dependency"
  | "warning";

export interface TaskAnalysis {
  taskId: string;
  taskDescription: string;
  relatedFiles: string[];
  relatedPatterns: string[];
  requiredContext: ContextType[];
  estimatedComplexity: "simple" | "moderate" | "complex";
  keywords: string[];
}

export interface CompressedContext {
  id: string;
  timestamp: string;
  taskAnalysis: TaskAnalysis;
  items: ContextItem[];
  totalTokens: number;
  budgetUsed: number;
  fullContextHash: string;
  truncatedCount: number;
  metadata: {
    version: string;
    compressionRatio: number;
    priorityBreakdown: Record<ContextPriority, number>;
  };
}

export interface HandoffConfig {
  tokenBudget: number;
  minItemsPerType: number;
  maxItemsPerType: number;
  priorityWeights: Record<ContextPriority, number>;
  includeTypes: ContextType[];
  excludePatterns: string[];
}

export interface SmartHandoffResult {
  success: boolean;
  compressed: CompressedContext;
  markdown: string;
  json: string;
  paths?: {
    md: string;
    json: string;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MEMORY_DIR = "memory";
const SMART_HANDOFF_FILE = "smart-handoff.json";
const SMART_HANDOFF_MD = "SMART-HANDOFF.md";
const VERSION = "1.0.0";

// Approximate tokens per character (conservative estimate)
const CHARS_PER_TOKEN = 4;

export const DEFAULT_HANDOFF_CONFIG: HandoffConfig = {
  tokenBudget: 4000,
  minItemsPerType: 1,
  maxItemsPerType: 5,
  priorityWeights: {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  },
  includeTypes: [
    "decision",
    "blocker",
    "error_pattern",
    "test_result",
    "task_status",
    "phase_info",
  ],
  excludePatterns: ["node_modules", ".git", "dist", ".next"],
};

// Keywords that suggest context types
const CONTEXT_KEYWORDS: Record<ContextType, string[]> = {
  decision: ["decided", "chose", "selected", "architecture", "approach", "design"],
  blocker: ["blocked", "stuck", "cannot", "failed", "error", "issue"],
  error_pattern: ["error", "exception", "failed", "crash", "bug"],
  test_result: ["test", "spec", "coverage", "assertion", "expect"],
  file_change: ["modified", "created", "deleted", "changed", "updated"],
  build_output: ["build", "compile", "bundle", "webpack", "tsc"],
  task_status: ["task", "todo", "done", "pending", "progress"],
  phase_info: ["phase", "milestone", "checkpoint", "gate"],
  dependency: ["depends", "requires", "needs", "blocked by"],
  warning: ["warning", "deprecation", "caution", "note"],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function generateId(): string {
  return `sh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPaths(rootDir: string) {
  return {
    smartHandoffJson: join(rootDir, MEMORY_DIR, SMART_HANDOFF_FILE),
    smartHandoffMd: join(rootDir, MEMORY_DIR, SMART_HANDOFF_MD),
    workflowState: join(rootDir, MEMORY_DIR, "workflow-state.json"),
    enhancedPrd: join(rootDir, MEMORY_DIR, "enhanced-prd.json"),
  };
}

function ensureMemoryDir(rootDir: string): void {
  const memoryPath = join(rootDir, MEMORY_DIR);
  if (!existsSync(memoryPath)) {
    mkdirSync(memoryPath, { recursive: true });
  }
}

// ============================================================================
// TASK ANALYSIS
// ============================================================================

/**
 * Analyze next task to determine relevant context
 */
export function analyzeNextTask(
  rootDir: string,
  taskId: string,
  taskDescription: string
): TaskAnalysis {
  const keywords = extractKeywords(taskDescription);
  const relatedFiles = findRelatedFiles(rootDir, keywords);
  const relatedPatterns = findRelatedErrorPatterns(rootDir, keywords);
  const requiredContext = inferRequiredContext(taskDescription, keywords);
  const complexity = assessTaskComplexity(taskDescription, keywords);

  return {
    taskId,
    taskDescription,
    relatedFiles,
    relatedPatterns,
    requiredContext,
    estimatedComplexity: complexity,
    keywords,
  };
}

/**
 * Extract keywords from task description using NLP-lite approach
 */
function extractKeywords(description: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "must", "shall",
    "can", "need", "to", "of", "in", "for", "on", "with", "at",
    "by", "from", "as", "into", "through", "during", "before",
    "after", "above", "below", "between", "under", "again",
    "further", "then", "once", "here", "there", "when", "where",
    "why", "how", "all", "each", "few", "more", "most", "other",
    "some", "such", "no", "nor", "not", "only", "own", "same",
    "so", "than", "too", "very", "just", "and", "but", "or", "this", "that",
  ]);

  // Tokenize and clean
  const words = description
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Extract unique keywords
  const unique = [...new Set(words)];

  // Prioritize technical terms
  const technical = unique.filter(w =>
    /^(api|auth|db|ui|ux|css|html|js|ts|tsx|jsx|sql|http|rest|graphql|component|hook|service|module|test|spec|build|deploy|config|env|error|fix|bug|feature|refactor|update|add|remove|create|delete|implement|integrate)$/.test(w) ||
    w.includes("-") ||
    /[A-Z]/.test(w)
  );

  // Return technical terms first, then others
  return [...technical, ...unique.filter(w => !technical.includes(w))].slice(0, 20);
}

/**
 * Find files related to task keywords
 */
function findRelatedFiles(rootDir: string, keywords: string[]): string[] {
  const paths = getPaths(rootDir);
  const related: string[] = [];

  // Check workflow state for recently changed files
  if (existsSync(paths.workflowState)) {
    try {
      const state = JSON.parse(readFileSync(paths.workflowState, "utf-8"));
      const changedFiles = state.recent_files || [];
      for (const file of changedFiles) {
        const fileName = file.toLowerCase();
        if (keywords.some(kw => fileName.includes(kw))) {
          related.push(file);
        }
      }
    } catch {
      // Ignore
    }
  }

  // Check enhanced PRD for critical paths
  if (existsSync(paths.enhancedPrd)) {
    try {
      const prd = JSON.parse(readFileSync(paths.enhancedPrd, "utf-8"));
      const criticalPaths = prd.enhancedPRD?.criticalPaths || [];
      for (const path of criticalPaths) {
        if (keywords.some(kw => path.toLowerCase().includes(kw))) {
          related.push(path);
        }
      }
    } catch {
      // Ignore
    }
  }

  return [...new Set(related)].slice(0, 10);
}

/**
 * Find error patterns related to keywords
 */
function findRelatedErrorPatterns(rootDir: string, keywords: string[]): string[] {
  try {
    const db = loadPatternDB(rootDir);
    return db.patterns
      .filter(p =>
        keywords.some(kw =>
          p.name.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw) ||
          p.contextHints.some(h => h.toLowerCase().includes(kw))
        )
      )
      .map(p => p.id)
      .slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Infer required context types from task description
 */
function inferRequiredContext(description: string, keywords: string[]): ContextType[] {
  const required = new Set<ContextType>();
  const lowerDesc = description.toLowerCase();

  for (const [type, typeKeywords] of Object.entries(CONTEXT_KEYWORDS)) {
    if (
      typeKeywords.some(kw => lowerDesc.includes(kw)) ||
      keywords.some(kw => typeKeywords.includes(kw))
    ) {
      required.add(type as ContextType);
    }
  }

  // Always include blockers and decisions
  required.add("blocker");
  required.add("decision");

  return [...required];
}

/**
 * Assess task complexity based on description and keywords
 */
function assessTaskComplexity(
  description: string,
  keywords: string[]
): "simple" | "moderate" | "complex" {
  const complexIndicators = [
    "refactor", "architecture", "migrate", "integrate", "security",
    "performance", "database", "auth", "multi", "system", "scale",
  ];
  const moderateIndicators = [
    "update", "add", "create", "implement", "fix", "component",
    "api", "test", "config", "feature",
  ];

  const hasComplex = complexIndicators.some(i =>
    keywords.includes(i) || description.toLowerCase().includes(i)
  );
  const hasModerate = moderateIndicators.some(i =>
    keywords.includes(i) || description.toLowerCase().includes(i)
  );

  if (hasComplex) return "complex";
  if (hasModerate) return "moderate";
  return "simple";
}

// ============================================================================
// CONTEXT GATHERING
// ============================================================================

/**
 * Gather all context items from various sources
 */
export function gatherContextItems(
  rootDir: string,
  taskAnalysis: TaskAnalysis
): ContextItem[] {
  const items: ContextItem[] = [];

  // Gather from handoff state
  items.push(...gatherFromHandoff(rootDir, taskAnalysis));

  // Gather from error patterns
  items.push(...gatherFromErrorPatterns(rootDir, taskAnalysis));

  // Gather from workflow events
  items.push(...gatherFromEvents(rootDir, taskAnalysis));

  // Gather from workflow state
  items.push(...gatherFromWorkflowState(rootDir, taskAnalysis));

  return items;
}

function gatherFromHandoff(rootDir: string, analysis: TaskAnalysis): ContextItem[] {
  const items: ContextItem[] = [];
  const handoff = loadHandoff(rootDir);

  if (!handoff) return items;

  // Add decisions
  for (const decision of handoff.recentDecisions || []) {
    const relevance = calculateRelevance(decision.description, analysis.keywords);
    items.push({
      id: generateId(),
      type: "decision",
      priority: relevance > 0.7 ? "high" : relevance > 0.4 ? "medium" : "low",
      content: decision.description,
      tokens: estimateTokens(decision.description),
      relevanceScore: relevance,
      source: "handoff",
      timestamp: decision.timestamp,
    });
  }

  // Add blockers from next actions
  for (const action of handoff.nextActions || []) {
    if (action.toLowerCase().includes("error") || action.toLowerCase().includes("fix")) {
      const relevance = calculateRelevance(action, analysis.keywords);
      items.push({
        id: generateId(),
        type: "blocker",
        priority: "high",
        content: action,
        tokens: estimateTokens(action),
        relevanceScore: relevance,
        source: "handoff",
      });
    }
  }

  // Add critical files
  for (const file of handoff.criticalFiles || []) {
    if (analysis.relatedFiles.some(rf => file.path.includes(rf) || rf.includes(file.path))) {
      items.push({
        id: generateId(),
        type: "file_change",
        priority: "medium",
        content: `${file.path}: ${file.reason}`,
        tokens: estimateTokens(`${file.path}: ${file.reason}`),
        relevanceScore: 0.8,
        source: "handoff",
      });
    }
  }

  return items;
}

function gatherFromErrorPatterns(rootDir: string, analysis: TaskAnalysis): ContextItem[] {
  const items: ContextItem[] = [];

  try {
    const db = loadPatternDB(rootDir);

    // Add relevant error patterns
    for (const patternId of analysis.relatedPatterns) {
      const pattern = db.patterns.find(p => p.id === patternId);
      if (pattern) {
        const bestStrategy = pattern.strategies
          .sort((a, b) => (b.successes / (b.attempts || 1)) - (a.successes / (a.attempts || 1)))
          [0];

        const content = `Error pattern "${pattern.name}": ${pattern.description}. ` +
          `Best fix: ${bestStrategy?.description || "No known fix"}`;

        items.push({
          id: generateId(),
          type: "error_pattern",
          priority: pattern.occurrences > 3 ? "high" : "medium",
          content,
          tokens: estimateTokens(content),
          relevanceScore: 0.9,
          source: "error-recovery",
          timestamp: pattern.lastSeen,
        });
      }
    }

    // Add recent fix attempts
    const recentAttempts = db.recentAttempts
      .filter(a => a.outcome !== "success")
      .slice(-3);

    for (const attempt of recentAttempts) {
      const relevance = calculateRelevance(attempt.error, analysis.keywords);
      if (relevance > 0.3) {
        items.push({
          id: generateId(),
          type: "blocker",
          priority: "high",
          content: `Failed fix attempt: ${attempt.error.slice(0, 200)}`,
          tokens: estimateTokens(attempt.error.slice(0, 200)),
          relevanceScore: relevance,
          source: "error-recovery",
          timestamp: attempt.startTime,
        });
      }
    }
  } catch {
    // Ignore errors loading pattern DB
  }

  return items;
}

function gatherFromEvents(rootDir: string, analysis: TaskAnalysis): ContextItem[] {
  const items: ContextItem[] = [];

  try {
    const events = loadEvents(rootDir);
    const recentEvents = events.slice(-50);

    // Filter for relevant event types
    const relevantTypes = [
      "TASK_FAILED",
      "TASK_COMPLETED",
      "PHASE_COMPLETED",
      "ERROR_DETECTED",
      "ERROR_FIXED",
      "TEST_RESULT",
      "BUILD_OUTPUT",
    ];

    for (const event of recentEvents) {
      if (!relevantTypes.includes(event.type)) continue;

      const content = formatEventContent(event);
      const relevance = calculateRelevance(content, analysis.keywords);

      if (relevance > 0.3 || event.type === "ERROR_DETECTED" || event.type === "TASK_FAILED") {
        const type = mapEventToContextType(event.type);
        items.push({
          id: generateId(),
          type,
          priority: event.type.includes("FAILED") || event.type.includes("ERROR") ? "high" : "medium",
          content,
          tokens: estimateTokens(content),
          relevanceScore: relevance,
          source: "ralph-engine",
          timestamp: event.timestamp,
        });
      }
    }
  } catch {
    // Ignore errors loading events
  }

  return items;
}

function gatherFromWorkflowState(rootDir: string, analysis: TaskAnalysis): ContextItem[] {
  const items: ContextItem[] = [];
  const paths = getPaths(rootDir);

  if (!existsSync(paths.workflowState)) return items;

  try {
    const state = JSON.parse(readFileSync(paths.workflowState, "utf-8"));

    // Add current phase info
    if (state.current_phase) {
      items.push({
        id: generateId(),
        type: "phase_info",
        priority: "high",
        content: `Current phase: ${state.current_phase}. Progress: ${state.phase_progress || 0}%`,
        tokens: estimateTokens(`Current phase: ${state.current_phase}. Progress: ${state.phase_progress || 0}%`),
        relevanceScore: 1.0,
        source: "workflow-state",
      });
    }

    // Add pending tasks
    const pendingTasks = state.pending_tasks || [];
    if (pendingTasks.length > 0) {
      const content = `Pending tasks: ${pendingTasks.slice(0, 5).join(", ")}`;
      items.push({
        id: generateId(),
        type: "task_status",
        priority: "medium",
        content,
        tokens: estimateTokens(content),
        relevanceScore: 0.8,
        source: "workflow-state",
      });
    }

    // Add errors
    const errors = state.errors_detected || [];
    for (const error of errors.slice(-3)) {
      items.push({
        id: generateId(),
        type: "blocker",
        priority: "critical",
        content: `Error: ${error}`,
        tokens: estimateTokens(error),
        relevanceScore: 1.0,
        source: "workflow-state",
      });
    }
  } catch {
    // Ignore
  }

  return items;
}

function formatEventContent(event: WorkflowEvent): string {
  const parts: string[] = [event.type];

  if (event.taskId) parts.push(`task:${event.taskId}`);
  if (event.phaseId) parts.push(`phase:${event.phaseId}`);

  const payload = event.payload || {};
  if (payload.message) parts.push(String(payload.message));
  if (payload.error) parts.push(`error: ${payload.error}`);
  if (payload.output) parts.push(String(payload.output).slice(0, 100));

  return parts.join(" - ");
}

function mapEventToContextType(eventType: string): ContextType {
  if (eventType.includes("TEST")) return "test_result";
  if (eventType.includes("BUILD")) return "build_output";
  if (eventType.includes("ERROR")) return "error_pattern";
  if (eventType.includes("TASK")) return "task_status";
  if (eventType.includes("PHASE")) return "phase_info";
  return "warning";
}

function calculateRelevance(text: string, keywords: string[]): number {
  if (!text || keywords.length === 0) return 0;

  const lowerText = text.toLowerCase();
  let matchCount = 0;

  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }

  return matchCount / keywords.length;
}

// ============================================================================
// CONTEXT COMPRESSION
// ============================================================================

/**
 * Compress context with priority-based injection
 */
export function compressContext(
  items: ContextItem[],
  config: HandoffConfig = DEFAULT_HANDOFF_CONFIG
): ContextItem[] {
  // Filter by included types
  let filtered = items.filter(item => config.includeTypes.includes(item.type));

  // Filter by excluded patterns
  filtered = filtered.filter(item =>
    !config.excludePatterns.some(pattern =>
      item.content.toLowerCase().includes(pattern.toLowerCase())
    )
  );

  // Score each item
  const scored = filtered.map(item => ({
    ...item,
    score: calculateItemScore(item, config),
  }));

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Select items within budget
  const selected: ContextItem[] = [];
  let totalTokens = 0;
  const typeCounts: Record<string, number> = {};

  for (const item of scored) {
    // Check token budget
    if (totalTokens + item.tokens > config.tokenBudget) {
      continue;
    }

    // Check max per type
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    if (typeCounts[item.type] > config.maxItemsPerType) {
      continue;
    }

    selected.push(item);
    totalTokens += item.tokens;
  }

  // Ensure minimum items per type
  for (const type of config.includeTypes) {
    const typeItems = selected.filter(i => i.type === type);
    if (typeItems.length < config.minItemsPerType) {
      const missing = config.minItemsPerType - typeItems.length;
      const candidates = scored
        .filter(i => i.type === type && !selected.includes(i))
        .slice(0, missing);

      for (const candidate of candidates) {
        if (totalTokens + candidate.tokens <= config.tokenBudget * 1.1) {
          selected.push(candidate);
          totalTokens += candidate.tokens;
        }
      }
    }
  }

  return selected;
}

function calculateItemScore(item: ContextItem, config: HandoffConfig): number {
  const priorityScore = config.priorityWeights[item.priority] || 1;
  const relevanceScore = item.relevanceScore;

  // Recency bonus
  let recencyBonus = 0;
  if (item.timestamp) {
    const age = Date.now() - new Date(item.timestamp).getTime();
    const hoursSince = age / (1000 * 60 * 60);
    recencyBonus = Math.max(0, 1 - hoursSince / 24); // Decay over 24 hours
  }

  return (priorityScore * 0.4) + (relevanceScore * 0.4) + (recencyBonus * 0.2);
}

// ============================================================================
// HASH FOR RETRIEVAL
// ============================================================================

/**
 * Hash full context for retrieval if needed
 */
export function hashFullContext(items: ContextItem[]): string {
  const content = items
    .map(i => `${i.type}:${i.content}`)
    .sort()
    .join("\n");

  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Save full context to file for retrieval
 */
export function saveFullContext(
  rootDir: string,
  items: ContextItem[],
  hash: string
): void {
  ensureMemoryDir(rootDir);

  const contextPath = join(rootDir, MEMORY_DIR, `context-${hash}.json`);
  writeFileSync(contextPath, JSON.stringify(items, null, 2) + "\n");
}

/**
 * Load full context by hash
 */
export function loadFullContext(rootDir: string, hash: string): ContextItem[] | null {
  const contextPath = join(rootDir, MEMORY_DIR, `context-${hash}.json`);

  if (!existsSync(contextPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(contextPath, "utf-8"));
  } catch {
    return null;
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Create a smart handoff for a specific task
 */
export function createSmartHandoff(
  rootDir: string,
  taskId: string,
  taskDescription: string,
  config: HandoffConfig = DEFAULT_HANDOFF_CONFIG
): SmartHandoffResult {
  ensureMemoryDir(rootDir);
  const paths = getPaths(rootDir);

  // Analyze the task
  const taskAnalysis = analyzeNextTask(rootDir, taskId, taskDescription);

  // Gather context items
  const allItems = gatherContextItems(rootDir, taskAnalysis);

  // Calculate full context hash before compression
  const fullContextHash = hashFullContext(allItems);

  // Save full context for retrieval
  saveFullContext(rootDir, allItems, fullContextHash);

  // Compress context
  const compressed = compressContext(allItems, config);

  // Calculate statistics
  const totalTokens = compressed.reduce((sum, i) => sum + i.tokens, 0);
  const priorityBreakdown: Record<ContextPriority, number> = {
    critical: compressed.filter(i => i.priority === "critical").length,
    high: compressed.filter(i => i.priority === "high").length,
    medium: compressed.filter(i => i.priority === "medium").length,
    low: compressed.filter(i => i.priority === "low").length,
  };

  const result: CompressedContext = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    taskAnalysis,
    items: compressed,
    totalTokens,
    budgetUsed: totalTokens / config.tokenBudget,
    fullContextHash,
    truncatedCount: allItems.length - compressed.length,
    metadata: {
      version: VERSION,
      compressionRatio: allItems.length > 0 ? compressed.length / allItems.length : 1,
      priorityBreakdown,
    },
  };

  // Generate markdown
  const markdown = generateSmartHandoffMarkdown(result);

  // Save files
  try {
    writeFileSync(paths.smartHandoffJson, JSON.stringify(result, null, 2) + "\n");
    writeFileSync(paths.smartHandoffMd, markdown);

    return {
      success: true,
      compressed: result,
      markdown,
      json: JSON.stringify(result, null, 2),
      paths: {
        md: paths.smartHandoffMd,
        json: paths.smartHandoffJson,
      },
    };
  } catch (error) {
    return {
      success: false,
      compressed: result,
      markdown,
      json: JSON.stringify(result, null, 2),
    };
  }
}

/**
 * Load existing smart handoff
 */
export function loadSmartHandoff(rootDir: string): CompressedContext | null {
  const paths = getPaths(rootDir);

  if (!existsSync(paths.smartHandoffJson)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(paths.smartHandoffJson, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Format compressed context for injection into prompt
 */
export function formatContextForPrompt(context: CompressedContext): string {
  const lines: string[] = [
    `## Session Context (${context.totalTokens} tokens)`,
    "",
    `**Task:** ${context.taskAnalysis.taskDescription}`,
    `**Complexity:** ${context.taskAnalysis.estimatedComplexity}`,
    `**Related Files:** ${context.taskAnalysis.relatedFiles.join(", ") || "None identified"}`,
    "",
  ];

  // Group by type
  const byType = new Map<ContextType, ContextItem[]>();
  for (const item of context.items) {
    if (!byType.has(item.type)) {
      byType.set(item.type, []);
    }
    byType.get(item.type)!.push(item);
  }

  // Format each type
  const typeLabels: Record<ContextType, string> = {
    decision: "📋 Decisions",
    blocker: "🚧 Blockers",
    error_pattern: "⚠️ Error Patterns",
    test_result: "🧪 Test Results",
    file_change: "📁 File Changes",
    build_output: "🔨 Build Output",
    task_status: "✅ Task Status",
    phase_info: "🎯 Phase Info",
    dependency: "🔗 Dependencies",
    warning: "⚡ Warnings",
  };

  for (const [type, items] of byType) {
    lines.push(`### ${typeLabels[type]}`);
    for (const item of items) {
      const priority = item.priority === "critical" ? "🔴" :
                       item.priority === "high" ? "🟠" :
                       item.priority === "medium" ? "🟡" : "🟢";
      lines.push(`${priority} ${item.content}`);
    }
    lines.push("");
  }

  lines.push(`*Full context available: ${context.fullContextHash}*`);

  return lines.join("\n");
}

/**
 * Generate markdown for smart handoff
 */
function generateSmartHandoffMarkdown(context: CompressedContext): string {
  const { taskAnalysis, items, totalTokens, metadata, fullContextHash, truncatedCount } = context;

  let md = `# Smart Session Handoff

> Generated: ${new Date(context.timestamp).toLocaleString()}
> Token Budget: ${totalTokens} / ${DEFAULT_HANDOFF_CONFIG.tokenBudget}
> Compression: ${Math.round(metadata.compressionRatio * 100)}% retained

## Next Task

**ID:** ${taskAnalysis.taskId}
**Description:** ${taskAnalysis.taskDescription}
**Complexity:** ${taskAnalysis.estimatedComplexity}

### Analysis

- **Keywords:** ${taskAnalysis.keywords.slice(0, 10).join(", ")}
- **Related Files:** ${taskAnalysis.relatedFiles.join(", ") || "None"}
- **Error Patterns:** ${taskAnalysis.relatedPatterns.join(", ") || "None"}
- **Required Context:** ${taskAnalysis.requiredContext.join(", ")}

## Context Summary

| Priority | Count |
|----------|-------|
| 🔴 Critical | ${metadata.priorityBreakdown.critical} |
| 🟠 High | ${metadata.priorityBreakdown.high} |
| 🟡 Medium | ${metadata.priorityBreakdown.medium} |
| 🟢 Low | ${metadata.priorityBreakdown.low} |

*${truncatedCount} items truncated to fit budget*

`;

  // Group items by type
  const byType = new Map<ContextType, ContextItem[]>();
  for (const item of items) {
    if (!byType.has(item.type)) {
      byType.set(item.type, []);
    }
    byType.get(item.type)!.push(item);
  }

  // Format each type
  const typeLabels: Record<ContextType, string> = {
    decision: "Decisions",
    blocker: "Blockers",
    error_pattern: "Error Patterns",
    test_result: "Test Results",
    file_change: "File Changes",
    build_output: "Build Output",
    task_status: "Task Status",
    phase_info: "Phase Info",
    dependency: "Dependencies",
    warning: "Warnings",
  };

  for (const [type, typeItems] of byType) {
    md += `### ${typeLabels[type]}\n\n`;
    for (const item of typeItems) {
      const priority = item.priority === "critical" ? "🔴" :
                       item.priority === "high" ? "🟠" :
                       item.priority === "medium" ? "🟡" : "🟢";
      md += `- ${priority} ${item.content}\n`;
    }
    md += "\n";
  }

  md += `---

**Full Context Hash:** \`${fullContextHash}\`

To retrieve full context: \`ccplate handoff retrieve ${fullContextHash}\`
`;

  return md;
}

/**
 * Format smart handoff for CLI display
 */
export function formatSmartHandoff(context: CompressedContext): string {
  let output = `\n🧠 Smart Handoff\n${"─".repeat(50)}\n`;

  output += `Task: ${context.taskAnalysis.taskDescription}\n`;
  output += `Complexity: ${context.taskAnalysis.estimatedComplexity}\n`;
  output += `Tokens: ${context.totalTokens} (${Math.round(context.budgetUsed * 100)}% of budget)\n`;
  output += `Items: ${context.items.length} (${context.truncatedCount} truncated)\n\n`;

  output += `Priority Breakdown:\n`;
  output += `  🔴 Critical: ${context.metadata.priorityBreakdown.critical}\n`;
  output += `  🟠 High: ${context.metadata.priorityBreakdown.high}\n`;
  output += `  🟡 Medium: ${context.metadata.priorityBreakdown.medium}\n`;
  output += `  🟢 Low: ${context.metadata.priorityBreakdown.low}\n\n`;

  output += `Full Context Hash: ${context.fullContextHash}\n`;
  output += `${"─".repeat(50)}\n`;

  return output;
}
