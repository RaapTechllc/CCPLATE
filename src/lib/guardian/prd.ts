import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "fs";
import { join } from "path";
import * as readline from "readline";

export interface PRDAnswers {
  projectName: string;
  techStack: {
    frontend: string;
    backend: string;
    database: string;
    auth: string;
    hosting: string;
  };
  targetUser: string;
  jobsToBeDone: string[];
  successCriteria: string[];
  criticalPaths: string[];
  nonGoals: string[];
  timeline: string;
  riskAssumptions: string[];
}

export interface PRDMetadata {
  version: string;
  createdAt: string;
  hash: string;
  frozen: boolean;
}

export interface PRD {
  metadata: PRDMetadata;
  answers: PRDAnswers;
}

const INTERVIEW_QUESTIONS = [
  {
    key: "projectName",
    question: "What is the project name?",
    type: "text" as const,
    default: "",
    required: true,
  },
  {
    key: "techStack.frontend",
    question: "Frontend framework? (e.g., Next.js, React, Vue)",
    type: "text" as const,
    default: "Next.js 14",
    required: true,
  },
  {
    key: "techStack.backend",
    question: "Backend/API layer? (e.g., Next.js API Routes, Express, Fastify)",
    type: "text" as const,
    default: "Next.js API Routes",
    required: true,
  },
  {
    key: "techStack.database",
    question: "Database? (e.g., PostgreSQL, MongoDB, SQLite)",
    type: "text" as const,
    default: "PostgreSQL",
    required: true,
  },
  {
    key: "techStack.auth",
    question: "Authentication? (e.g., NextAuth, Clerk, Auth0, custom)",
    type: "text" as const,
    default: "NextAuth",
    required: true,
  },
  {
    key: "techStack.hosting",
    question: "Hosting platform? (e.g., Vercel, AWS, Railway)",
    type: "text" as const,
    default: "Vercel",
    required: true,
  },
  {
    key: "targetUser",
    question: "Who is the target user? (1-2 sentences)",
    type: "text" as const,
    default: "",
    required: true,
  },
  {
    key: "jobsToBeDone",
    question: "Top 2-3 jobs-to-be-done (comma-separated):",
    type: "list" as const,
    default: [],
    required: true,
    minItems: 1,
    maxItems: 5,
  },
  {
    key: "successCriteria",
    question: "Success criteria - what must work? (comma-separated, 3-7 items):",
    type: "list" as const,
    default: [],
    required: true,
    minItems: 3,
    maxItems: 10,
  },
  {
    key: "criticalPaths",
    question: "Critical user flows that MUST work (comma-separated, 2-5 items):",
    type: "list" as const,
    default: [],
    required: true,
    minItems: 2,
    maxItems: 7,
  },
  {
    key: "nonGoals",
    question: "Non-goals / out of scope (comma-separated, optional):",
    type: "list" as const,
    default: [],
    required: false,
    minItems: 0,
    maxItems: 10,
  },
  {
    key: "timeline",
    question: "Timeline / demo expectation? (e.g., '2 weeks MVP', 'POC by Friday'):",
    type: "text" as const,
    default: "",
    required: false,
  },
  {
    key: "riskAssumptions",
    question: "Risk assumptions / known unknowns (comma-separated, optional):",
    type: "list" as const,
    default: [],
    required: false,
    minItems: 0,
    maxItems: 10,
  },
];

function computeHash(answers: PRDAnswers): string {
  const normalized = JSON.stringify(answers, Object.keys(answers).sort());
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function parseList(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function runInteractiveInterview(): Promise<PRDAnswers> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  };

  console.log("\n🎯 CCPLATE Discovery Interview\n");
  console.log("This interview will generate a frozen PRD (Product Requirements Document)");
  console.log("that serves as the 'Success Contract' for autonomous agent work.\n");
  console.log("Press Enter to accept defaults shown in [brackets].\n");
  console.log("─".repeat(60) + "\n");

  const answers: Record<string, unknown> = {
    techStack: {},
  };

  for (const q of INTERVIEW_QUESTIONS) {
    const defaultStr = q.type === "list" 
      ? "" 
      : q.default 
        ? ` [${q.default}]` 
        : "";
    const requiredStr = q.required ? " *" : "";
    
    let valid = false;
    while (!valid) {
      const input = await askQuestion(`${q.question}${defaultStr}${requiredStr}\n> `);
      
      if (q.type === "list") {
        const items = parseList(input);
        if (q.required && q.minItems && items.length < q.minItems) {
          console.log(`  ⚠ Please provide at least ${q.minItems} item(s)\n`);
          continue;
        }
        if (q.maxItems && items.length > q.maxItems) {
          console.log(`  ⚠ Maximum ${q.maxItems} items allowed. Using first ${q.maxItems}.\n`);
          setNestedValue(answers, q.key, items.slice(0, q.maxItems));
        } else {
          setNestedValue(answers, q.key, items);
        }
        valid = true;
      } else {
        const value = input || q.default;
        if (q.required && !value) {
          console.log("  ⚠ This field is required\n");
          continue;
        }
        setNestedValue(answers, q.key, value);
        valid = true;
      }
      console.log();
    }
  }

  rl.close();
  return answers as unknown as PRDAnswers;
}

export function generatePRDMarkdown(answers: PRDAnswers, metadata: PRDMetadata): string {
  const lines: string[] = [
    "---",
    `version: ${metadata.version}`,
    `created_at: ${metadata.createdAt}`,
    `hash: ${metadata.hash}`,
    `frozen: ${metadata.frozen}`,
    "---",
    "",
    `# ${answers.projectName} - Product Requirements Document`,
    "",
    "> ⚠️ **FROZEN PRD** - This document is the Success Contract for autonomous agent work.",
    "> Do not modify without running `ccplate init --force`.",
    "",
    "## Tech Stack",
    "",
    `| Layer | Technology |`,
    `|-------|------------|`,
    `| Frontend | ${answers.techStack.frontend} |`,
    `| Backend | ${answers.techStack.backend} |`,
    `| Database | ${answers.techStack.database} |`,
    `| Auth | ${answers.techStack.auth} |`,
    `| Hosting | ${answers.techStack.hosting} |`,
    "",
    "## Target User",
    "",
    answers.targetUser,
    "",
    "## Jobs to Be Done",
    "",
    ...answers.jobsToBeDone.map((j) => `- ${j}`),
    "",
    "## Success Criteria",
    "",
    "> These criteria define when the project is considered complete.",
    "",
    ...answers.successCriteria.map((s, i) => `${i + 1}. ${s}`),
    "",
    "## Critical Paths",
    "",
    "> These user flows MUST work for the project to be successful.",
    "",
    ...answers.criticalPaths.map((p) => `- [ ] ${p}`),
    "",
  ];

  if (answers.nonGoals.length > 0) {
    lines.push("## Non-Goals / Out of Scope", "");
    lines.push(...answers.nonGoals.map((n) => `- ${n}`));
    lines.push("");
  }

  if (answers.timeline) {
    lines.push("## Timeline", "", answers.timeline, "");
  }

  if (answers.riskAssumptions.length > 0) {
    lines.push("## Risk Assumptions", "");
    lines.push(...answers.riskAssumptions.map((r) => `- ${r}`));
    lines.push("");
  }

  lines.push(
    "---",
    "",
    `*Generated by CCPLATE Discovery Interview on ${new Date().toLocaleDateString()}*`
  );

  return lines.join("\n");
}

export function savePRD(
  rootDir: string,
  answers: PRDAnswers,
  options: { force?: boolean } = {}
): { success: boolean; message: string; prdPath?: string; jsonPath?: string } {
  const memoryDir = join(rootDir, "memory");
  const prdPath = join(memoryDir, "prd.md");
  const jsonPath = join(memoryDir, "prd.json");
  const archiveDir = join(memoryDir, "prd.archive");

  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true });
  }

  if (existsSync(prdPath) && !options.force) {
    return {
      success: false,
      message: `PRD already exists at ${prdPath}. Use --force to overwrite.`,
    };
  }

  if (existsSync(prdPath) && options.force) {
    if (!existsSync(archiveDir)) {
      mkdirSync(archiveDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    renameSync(prdPath, join(archiveDir, `prd-${timestamp}.md`));
    if (existsSync(jsonPath)) {
      renameSync(jsonPath, join(archiveDir, `prd-${timestamp}.json`));
    }
  }

  const metadata: PRDMetadata = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    hash: computeHash(answers),
    frozen: true,
  };

  const prd: PRD = { metadata, answers };
  const markdown = generatePRDMarkdown(answers, metadata);

  writeFileSync(prdPath, markdown);
  writeFileSync(jsonPath, JSON.stringify(prd, null, 2));

  return {
    success: true,
    message: "PRD saved successfully",
    prdPath,
    jsonPath,
  };
}

export function loadPRD(rootDir: string): PRD | null {
  const jsonPath = join(rootDir, "memory", "prd.json");
  if (!existsSync(jsonPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(jsonPath, "utf-8"));
  } catch {
    return null;
  }
}

export function getPRDHash(rootDir: string): string | null {
  const prd = loadPRD(rootDir);
  return prd?.metadata.hash ?? null;
}

export function updateWorkflowStateWithPRD(
  rootDir: string,
  metadata: PRDMetadata
): void {
  const statePath = join(rootDir, "memory", "workflow-state.json");
  let state: Record<string, unknown> = {};

  if (existsSync(statePath)) {
    try {
      state = JSON.parse(readFileSync(statePath, "utf-8"));
    } catch {
      // Start fresh
    }
  }

  state.prd_path = "memory/prd.md";
  state.prd_hash = metadata.hash;
  state.prd_frozen_at = metadata.createdAt;

  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}

// ============================================================================
// Progress Nudge - Keyword Extraction and File Relevance
// ============================================================================

/**
 * Common stop words to filter out from keyword extraction
 */
const STOP_WORDS = new Set([
  // Articles and determiners
  "a", "an", "the",
  // Be verbs
  "is", "are", "was", "were", "be", "been", "being",
  // Auxiliary verbs
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "need", "dare",
  "ought",
  // Prepositions
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "under", "via",
  // Adverbs
  "again", "further", "then", "once", "here", "there", "when", "where",
  "why", "how", "very", "just", "also", "now", "only", "already",
  // Conjunctions
  "and", "but", "if", "or", "because", "until", "while", "so", "yet",
  // Pronouns (keep "user" - it's important for PRD context)
  "it", "its", "this", "that", "these", "those",
  "i", "me", "my", "myself", "we", "our", "ours", "ourselves",
  "you", "your", "yours", "yourself", "yourselves",
  "he", "him", "his", "himself", "she", "her", "hers", "herself",
  "they", "them", "their", "theirs", "themselves",
  "what", "which", "who", "whom",
  // Quantifiers
  "all", "each", "few", "more", "most", "other", "some", "such",
  "any", "both", "no", "nor", "not", "own", "same", "than", "too",
  // Generic verbs (that don't add meaning)
  "using", "used",
  // Common filler words
  "etc", "flow",
]);

/**
 * Whitelist patterns for files that are always considered relevant.
 * These patterns use simple prefix/suffix matching, not full glob syntax.
 */
const DEFAULT_WHITELIST_PATTERNS = [
  // Test files
  ".test.ts",
  ".test.tsx",
  ".test.js",
  ".test.jsx",
  ".spec.ts",
  ".spec.tsx",
  ".spec.js",
  ".spec.jsx",
  "__tests__/",
  "tests/",
  "test/",
  "e2e/",
  // Memory and claude files
  "memory/",
  ".claude/",
  // Config files
  "package.json",
  "tsconfig.json",
  ".config.ts",
  ".config.js",
  ".config.json",
  ".env",
  "CLAUDE.md",
  "ccplate.config.json",
  "README.md",
  "PLANNING.md",
  "TASK.md",
  // Prisma
  "prisma/",
];

/**
 * Extracts relevant keywords from PRD fields for file relevance matching.
 * Keywords are extracted from:
 * - criticalPaths
 * - techStack (frontend, backend, database, auth, hosting)
 * - jobsToBeDone
 * - successCriteria
 *
 * @param prd - The PRD object or null
 * @returns Array of lowercase, deduplicated keywords
 */
export function extractRelevantKeywords(prd: PRD | null): string[] {
  if (!prd || !prd.answers) {
    return [];
  }

  const rawTexts: string[] = [];
  const { answers } = prd;

  // Extract from criticalPaths
  if (Array.isArray(answers.criticalPaths)) {
    rawTexts.push(...answers.criticalPaths);
  }

  // Extract from techStack
  if (answers.techStack) {
    const { frontend, backend, database, auth, hosting } = answers.techStack;
    if (frontend) rawTexts.push(frontend);
    if (backend) rawTexts.push(backend);
    if (database) rawTexts.push(database);
    if (auth) rawTexts.push(auth);
    if (hosting) rawTexts.push(hosting);
  }

  // Extract from jobsToBeDone
  if (Array.isArray(answers.jobsToBeDone)) {
    rawTexts.push(...answers.jobsToBeDone);
  }

  // Extract from successCriteria
  if (Array.isArray(answers.successCriteria)) {
    rawTexts.push(...answers.successCriteria);
  }

  // Tokenize and filter
  const keywords = new Set<string>();

  for (const text of rawTexts) {
    if (!text || typeof text !== "string") continue;

    // Split on whitespace and common delimiters
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ") // Remove special chars except hyphen
      .split(/[\s-]+/)
      .filter((t) => t.length > 2) // Filter short tokens
      .filter((t) => !STOP_WORDS.has(t)); // Filter stop words

    for (const token of tokens) {
      keywords.add(token);
    }

    // Also extract compound words (e.g., "NextAuth" -> "nextauth")
    const compoundMatch = text.match(/[A-Z][a-z]+(?:[A-Z][a-z]+)+/g);
    if (compoundMatch) {
      for (const compound of compoundMatch) {
        keywords.add(compound.toLowerCase());
      }
    }

    // Extract tech names that might be one word (e.g., "Next.js" -> "next")
    const techMatch = text.match(/\b[A-Z]?[a-z]+(?:\.[a-z]+)?\b/gi);
    if (techMatch) {
      for (const tech of techMatch) {
        const cleaned = tech.replace(/\./g, "").toLowerCase();
        if (cleaned.length > 2 && !STOP_WORDS.has(cleaned)) {
          keywords.add(cleaned);
        }
      }
    }
  }

  return Array.from(keywords);
}

/**
 * Determines if a file path is relevant to the PRD scope.
 *
 * A file is considered relevant if:
 * 1. It matches any of the provided keywords in its path
 * 2. It matches a whitelist pattern (test files, config files, etc.)
 *
 * @param filePath - The file path to check
 * @param keywords - Array of keywords from extractRelevantKeywords()
 * @param customWhitelist - Additional whitelist patterns to check
 * @returns true if the file is relevant, false otherwise
 */
export function isFileRelevant(
  filePath: string,
  keywords: string[],
  customWhitelist: string[] = []
): boolean {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }

  // Normalize path separators for cross-platform support
  const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();

  // Check whitelist patterns first
  const allWhitelistPatterns = [...DEFAULT_WHITELIST_PATTERNS, ...customWhitelist];

  for (const pattern of allWhitelistPatterns) {
    const normalizedPattern = pattern.toLowerCase();

    // Check if pattern ends with "/" (directory prefix)
    if (normalizedPattern.endsWith("/")) {
      if (normalizedPath.includes(normalizedPattern) ||
          normalizedPath.startsWith(normalizedPattern)) {
        return true;
      }
    }
    // Check if pattern starts with "." (extension or dotfile)
    else if (normalizedPattern.startsWith(".")) {
      // For .env pattern, match .env, .env.local, .env.production, etc.
      if (normalizedPattern === ".env") {
        const filename = normalizedPath.split("/").pop() || "";
        if (filename === ".env" || filename.startsWith(".env.")) {
          return true;
        }
      }
      // Standard extension/dotfile matching
      else if (normalizedPath.endsWith(normalizedPattern) ||
          normalizedPath.includes("/" + normalizedPattern.slice(1))) {
        return true;
      }
    }
    // Exact filename match
    else if (normalizedPath.endsWith("/" + normalizedPattern) ||
             normalizedPath === normalizedPattern) {
      return true;
    }
  }

  // Check keywords
  if (keywords.length === 0) {
    return false;
  }

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    if (normalizedPath.includes(normalizedKeyword)) {
      return true;
    }
  }

  return false;
}
