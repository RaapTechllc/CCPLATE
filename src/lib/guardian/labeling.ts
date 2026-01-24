import { createLogger } from "./logger";
import { minimatch } from "minimatch";

const log = createLogger("guardian.labeling");

/**
 * Area label definition mapping code paths to labels
 */
export interface AreaLabel {
  name: string;
  patterns: string[];
  description: string;
}

/**
 * Area labels that directly map to codebase structure
 * Used for parallel-safety assessment and auto-labeling
 */
export const AREA_LABELS: AreaLabel[] = [
  {
    name: "area:guardian/core",
    patterns: ["src/lib/guardian/*.ts"],
    description: "Core Guardian modules",
  },
  {
    name: "area:guardian/harness",
    patterns: ["src/lib/guardian/harness/**"],
    description: "POC Harness system",
  },
  {
    name: "area:guardian/adapters",
    patterns: ["src/lib/guardian/adapters/**"],
    description: "External integrations",
  },
  {
    name: "area:cli",
    patterns: ["src/cli/**"],
    description: "CLI commands",
  },
  {
    name: "area:api/auth",
    patterns: ["src/app/api/auth/**"],
    description: "Auth endpoints",
  },
  {
    name: "area:api/builders",
    patterns: [
      "src/app/api/*-builder/**",
      "src/app/api/hook-builder/**",
      "src/app/api/component-builder/**",
      "src/app/api/api-builder/**",
    ],
    description: "AI builder endpoints",
  },
  {
    name: "area:api/webhooks",
    patterns: ["src/app/api/webhooks/**"],
    description: "Webhook endpoints",
  },
  {
    name: "area:ui/auth",
    patterns: ["src/components/features/auth/**", "src/app/(auth)/**"],
    description: "Auth UI",
  },
  {
    name: "area:ui/guardian",
    patterns: ["src/app/(protected)/guardian/**"],
    description: "Guardian UI",
  },
  {
    name: "area:builders",
    patterns: [
      "src/lib/*-builder/**",
      "src/lib/hook-builder/**",
      "src/lib/component-builder/**",
      "src/lib/api-builder/**",
    ],
    description: "AI builder logic",
  },
  {
    name: "area:hooks",
    patterns: [".claude/hooks/**"],
    description: "Claude Code hooks",
  },
  {
    name: "area:agents",
    patterns: [".claude/agents/**"],
    description: "Subagent definitions",
  },
  {
    name: "area:db",
    patterns: ["prisma/**", "src/lib/db.ts"],
    description: "Database schema",
  },
  {
    name: "area:e2e",
    patterns: ["e2e/**", "playwright.config.ts"],
    description: "Playwright tests",
  },
  {
    name: "area:lsp",
    patterns: ["src/lsp/**"],
    description: "LSP sidecar",
  },
  {
    name: "area:config",
    patterns: [
      "*.config.*",
      ".env*",
      "ccplate.config.json",
      "tsconfig.json",
      "package.json",
    ],
    description: "Configuration files",
  },
];

/**
 * Check if a file path matches any pattern
 */
function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return patterns.some((pattern) => minimatch(normalizedPath, pattern));
}

/**
 * Given a list of files, determine which area labels apply
 */
export function getLabelsForFiles(files: string[]): string[] {
  const labels = new Set<string>();

  for (const file of files) {
    for (const area of AREA_LABELS) {
      if (matchesAnyPattern(file, area.patterns)) {
        labels.add(area.name);
      }
    }
  }

  log.debug("Computed labels for files", {
    fileCount: files.length,
    labelCount: labels.size,
    labels: Array.from(labels),
  });

  return Array.from(labels);
}

/**
 * Check if two sets of labels have overlapping areas
 * Used to determine if two issues can be worked on in parallel
 */
export function hasAreaConflict(labels1: string[], labels2: string[]): boolean {
  const areas1 = labels1.filter((l) => l.startsWith("area:"));
  const areas2 = labels2.filter((l) => l.startsWith("area:"));
  return areas1.some((a) => areas2.includes(a));
}

/**
 * Find all files that would be affected by an area label
 */
export function getAreaPatterns(areaLabel: string): string[] {
  const area = AREA_LABELS.find((a) => a.name === areaLabel);
  return area?.patterns || [];
}

/**
 * Extract file paths mentioned in issue body or comments
 */
export function extractFileMentions(text: string): string[] {
  const files: string[] = [];

  // Match file paths like src/lib/foo.ts or ./components/bar.tsx
  const pathPattern = /(?:^|\s|`)((?:\.\/)?(?:src|e2e|prisma|\.claude)\/[\w\-\/\.]+\.\w+)/gm;
  let match;
  while ((match = pathPattern.exec(text)) !== null) {
    files.push(match[1].replace(/^\.\//, ""));
  }

  // Match file:line references like foo.ts:42
  const lineRefPattern = /\b([\w\-\/]+\.\w+):\d+/g;
  while ((match = lineRefPattern.exec(text)) !== null) {
    // Only add if it looks like a relative path
    if (match[1].includes("/")) {
      files.push(match[1]);
    }
  }

  // Match error stack traces
  const stackPattern = /at\s+\w+\s+\(([\w\-\/\.]+\.\w+):\d+:\d+\)/g;
  while ((match = stackPattern.exec(text)) !== null) {
    files.push(match[1]);
  }

  return [...new Set(files)];
}

/**
 * Infer type label from issue content
 */
export function inferTypeLabel(title: string, body: string): string | null {
  const text = `${title} ${body}`.toLowerCase();

  if (
    text.includes("bug") ||
    text.includes("error") ||
    text.includes("broken") ||
    text.includes("crash") ||
    text.includes("fix")
  ) {
    return "type:bug";
  }

  if (text.includes("security") || text.includes("vulnerability") || text.includes("cve")) {
    return "type:security";
  }

  if (text.includes("performance") || text.includes("slow") || text.includes("optimize")) {
    return "type:performance";
  }

  if (text.includes("refactor") || text.includes("cleanup") || text.includes("restructure")) {
    return "type:refactor";
  }

  if (
    text.includes("feature") ||
    text.includes("add") ||
    text.includes("implement") ||
    text.includes("new")
  ) {
    return "type:feature";
  }

  if (text.includes("doc") || text.includes("readme") || text.includes("comment")) {
    return "type:docs";
  }

  return null;
}

/**
 * Infer priority label from issue content
 */
export function inferPriorityLabel(title: string, body: string): string {
  const text = `${title} ${body}`.toLowerCase();

  if (
    text.includes("critical") ||
    text.includes("urgent") ||
    text.includes("blocker") ||
    text.includes("production down")
  ) {
    return "priority:critical";
  }

  if (text.includes("important") || text.includes("asap") || text.includes("high priority")) {
    return "priority:high";
  }

  if (text.includes("minor") || text.includes("low priority") || text.includes("nice to have")) {
    return "priority:low";
  }

  return "priority:medium";
}

export interface IssueAnalysis {
  suggestedLabels: string[];
  mentionedFiles: string[];
  areaLabels: string[];
  typeLabel: string | null;
  priorityLabel: string;
  parallelSafe: boolean;
}

/**
 * Analyze issue content to suggest labels
 */
export function analyzeIssue(
  issueNumber: number,
  title: string,
  body: string
): IssueAnalysis {
  log.info("Analyzing issue", { issueNumber });

  const mentionedFiles = extractFileMentions(`${title}\n${body}`);
  const areaLabels = getLabelsForFiles(mentionedFiles);
  const typeLabel = inferTypeLabel(title, body);
  const priorityLabel = inferPriorityLabel(title, body);

  const suggestedLabels = [
    ...areaLabels,
    ...(typeLabel ? [typeLabel] : []),
    priorityLabel,
  ];

  // An issue is parallel-safe if it only touches one area
  const parallelSafe = areaLabels.length <= 1;

  log.info("Issue analysis complete", {
    issueNumber,
    mentionedFiles: mentionedFiles.length,
    areaLabels: areaLabels.length,
    parallelSafe,
  });

  return {
    suggestedLabels,
    mentionedFiles,
    areaLabels,
    typeLabel,
    priorityLabel,
    parallelSafe,
  };
}

export interface ParallelCheckResult {
  safe: boolean;
  issues: Array<{
    issueNumber: number;
    labels: string[];
  }>;
  conflicts: Array<{
    issue1: number;
    issue2: number;
    sharedArea: string;
  }>;
  recommendation: string;
}

/**
 * Check if multiple issues can be worked on in parallel
 */
export function checkParallelSafety(
  issues: Array<{
    issueNumber: number;
    labels: string[];
  }>
): ParallelCheckResult {
  const conflicts: ParallelCheckResult["conflicts"] = [];

  // Check each pair of issues for conflicts
  for (let i = 0; i < issues.length; i++) {
    for (let j = i + 1; j < issues.length; j++) {
      const areas1 = issues[i].labels.filter((l) => l.startsWith("area:"));
      const areas2 = issues[j].labels.filter((l) => l.startsWith("area:"));

      for (const area of areas1) {
        if (areas2.includes(area)) {
          conflicts.push({
            issue1: issues[i].issueNumber,
            issue2: issues[j].issueNumber,
            sharedArea: area,
          });
          break; // Only report first conflict per pair
        }
      }
    }
  }

  const safe = conflicts.length === 0;

  // Generate recommendation
  let recommendation: string;
  if (safe) {
    recommendation = `All ${issues.length} issues can be worked on in parallel.`;
  } else {
    // Find issues without conflicts
    const conflictingIssues = new Set(
      conflicts.flatMap((c) => [c.issue1, c.issue2])
    );
    const parallelizable = issues.filter(
      (i) => !conflictingIssues.has(i.issueNumber)
    );

    if (parallelizable.length > 0) {
      recommendation =
        `Run issues ${parallelizable.map((i) => `#${i.issueNumber}`).join(", ")} in parallel. ` +
        `Issues with conflicts should be serialized.`;
    } else {
      recommendation = `All issues have area conflicts. Run them sequentially.`;
    }
  }

  log.info("Parallel safety check", {
    issueCount: issues.length,
    conflictCount: conflicts.length,
    safe,
  });

  return {
    safe,
    issues,
    conflicts,
    recommendation,
  };
}

/**
 * Format parallel check result for CLI display
 */
export function formatParallelCheckResult(result: ParallelCheckResult): string {
  const lines: string[] = [];

  lines.push("Parallel Safety Analysis:");
  lines.push("-".repeat(60));

  // Table header
  lines.push(
    `${"Issue".padEnd(10)} ${"Labels".padEnd(30)} ${"Conflicts With".padEnd(20)}`
  );
  lines.push("-".repeat(60));

  // Issue rows
  for (const issue of result.issues) {
    const areaLabels = issue.labels.filter((l) => l.startsWith("area:"));
    const issueConflicts = result.conflicts
      .filter((c) => c.issue1 === issue.issueNumber || c.issue2 === issue.issueNumber)
      .map((c) =>
        c.issue1 === issue.issueNumber ? `#${c.issue2}` : `#${c.issue1}`
      );

    lines.push(
      `#${issue.issueNumber.toString().padEnd(9)} ` +
      `${areaLabels.slice(0, 2).join(", ").padEnd(30)} ` +
      `${issueConflicts.join(", ") || "None"}`
    );
  }

  lines.push("-".repeat(60));
  lines.push("");
  lines.push(`Recommendation: ${result.recommendation}`);

  return lines.join("\n");
}
