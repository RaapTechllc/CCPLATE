/**
 * Expert Tier - Guardian as Advisor
 * 
 * Guardian provides suggestions, warnings, and best practices but takes
 * no action without explicit approval. User maintains full control.
 */

import type { TierConfig, TierQuestion } from "./index";

export const EXPERT_CONFIG: TierConfig = {
  tier: "expert",
  name: "Expert",
  description: "Guardian as advisor, not driver",
  autonomyLevel: 0.25,
  
  interviewStyle: "freeform",
  showArchitecturePreview: false, // Expert knows what they want
  
  nudgeConfig: {
    suppressTypes: [],
    showTypes: [
      "commit", "test", "lint", "error", "hitl_required",
      "phase_complete", "feature_complete", "file_created",
      "file_modified", "schema_change", "api_change",
      "context_warning", "context_orange", "context_critical",
      "progress",
    ],
    nudgeFormat: "suggestion", // Frame as suggestions, not warnings
    contextThresholds: {
      warning: 0.5,
      orange: 0.7,
      critical: 0.85,
      forceHandoff: 1.0, // Never force in expert mode
    },
  },
  
  hitlConfig: {
    phaseComplete: "suggestion",
    featureComplete: "suggestion",
    schemaChange: "suggestion",
    authChange: "suggestion",
    buildError: "suggestion",
    testFailure: "suggestion",
    newFile: "suggestion",
    fileModify: "suggestion",
    securityConcern: "always", // Only time Guardian blocks
  },
  
  autoResolve: {
    lintErrors: false,
    buildErrors: false,
    testFailures: false,
    maxRetries: 0, // Never auto-retry
  },
};

// Expert Questions - Minimal structure, free-form input
export const EXPERT_QUESTIONS: TierQuestion[] = [
  {
    key: "projectName",
    type: "input",
    question: "Project name:",
    required: true,
  },
  {
    key: "techStackFreeform",
    type: "textarea",
    question: "Tech stack (free-form):",
    placeholder: `Describe your stack, e.g.:
- Next.js 16 with App Router
- Convex for backend + realtime
- Tailwind + shadcn/ui
- Vercel for hosting`,
    required: true,
    minLength: 20,
    parseAs: "techStack",
  },
  {
    key: "requirementsFreeform",
    type: "textarea",
    question: "Project requirements (free-form):",
    placeholder: `Describe what you're building in detail. Include:
- Target users
- Key features
- Success criteria
- Critical user flows`,
    required: true,
    minLength: 100,
    parseAs: "prd",
  },
  {
    key: "constraints",
    type: "textarea",
    question: "Constraints and preferences (optional):",
    placeholder: `Any specific requirements:
- Code style preferences
- Patterns to follow or avoid
- Performance targets
- Security requirements`,
    required: false,
  },
  {
    key: "guardianRole",
    type: "select",
    question: "Guardian's role in this project:",
    required: true,
    options: [
      {
        label: "🔇 Silent observer - Log only",
        value: "silent",
        description: "Guardian observes and logs but never interrupts.",
      },
      {
        label: "💡 Advisor - Suggestions only",
        value: "advisor",
        description: "Guardian provides suggestions but takes no action.",
      },
      {
        label: "🔍 Reviewer - Suggestions + code review",
        value: "reviewer",
        description: "Guardian reviews code and provides detailed feedback.",
      },
      {
        label: "🛡️ Guardian - Full supervision (blocks security issues only)",
        value: "guardian",
        description: "Guardian supervises but only blocks on security concerns.",
      },
    ],
    default: "advisor",
  },
];

// Expert mode operations
export type GuardianRole = "silent" | "advisor" | "reviewer" | "guardian";

export interface ExpertModeConfig {
  role: GuardianRole;
  codeReview: {
    enabled: boolean;
    timing: "before_commit" | "after_commit" | "on_demand";
    scope: "changed_files" | "related_files" | "all_touched";
  };
  securityScan: {
    enabled: boolean;
    blockOnCritical: boolean;
  };
  suggestions: {
    patterns: boolean;      // Suggest better patterns
    performance: boolean;   // Performance tips
    security: boolean;      // Security observations
    testing: boolean;       // Test coverage suggestions
  };
}

export function getExpertModeConfig(role: GuardianRole): ExpertModeConfig {
  const base: ExpertModeConfig = {
    role,
    codeReview: {
      enabled: false,
      timing: "on_demand",
      scope: "changed_files",
    },
    securityScan: {
      enabled: true,
      blockOnCritical: true,
    },
    suggestions: {
      patterns: false,
      performance: false,
      security: false,
      testing: false,
    },
  };
  
  switch (role) {
    case "silent":
      return {
        ...base,
        securityScan: { enabled: false, blockOnCritical: false },
      };
      
    case "advisor":
      return {
        ...base,
        suggestions: {
          patterns: true,
          performance: true,
          security: true,
          testing: true,
        },
      };
      
    case "reviewer":
      return {
        ...base,
        codeReview: {
          enabled: true,
          timing: "before_commit",
          scope: "changed_files",
        },
        suggestions: {
          patterns: true,
          performance: true,
          security: true,
          testing: true,
        },
      };
      
    case "guardian":
      return {
        ...base,
        codeReview: {
          enabled: true,
          timing: "before_commit",
          scope: "related_files",
        },
        suggestions: {
          patterns: true,
          performance: true,
          security: true,
          testing: true,
        },
      };
  }
}

// Advisor output types
export interface Observation {
  type: "pattern" | "performance" | "security" | "testing" | "general";
  severity: "info" | "suggestion" | "warning" | "critical";
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
  reference?: string;
}

export interface AdvisorOutput {
  observations: Observation[];
  suggestions: Observation[];
  warnings: Observation[];
  actionRequired: boolean;
  summary: string;
}

// Format advisor output for display
export function formatAdvisorOutput(output: AdvisorOutput): string {
  let result = `
┌─────────────────────────────────────────────────────────────┐
│                    GUARDIAN ADVISOR                         │
├─────────────────────────────────────────────────────────────┤
`;

  if (output.observations.length > 0) {
    result += `
│  🔍 OBSERVATIONS
`;
    for (const obs of output.observations) {
      const location = obs.file ? ` (${obs.file}${obs.line ? `:${obs.line}` : ""})` : "";
      result += `│  ├── ${obs.message}${location}\n`;
    }
  }

  if (output.suggestions.length > 0) {
    result += `
│  💡 SUGGESTIONS
`;
    for (const sug of output.suggestions) {
      result += `│  ├── ${sug.message}\n`;
      if (sug.suggestion) {
        result += `│  │   └─ ${sug.suggestion}\n`;
      }
    }
  }

  if (output.warnings.length > 0) {
    result += `
│  ⚠️  WARNINGS
`;
    for (const warn of output.warnings) {
      const location = warn.file ? ` (${warn.file}${warn.line ? `:${warn.line}` : ""})` : "";
      result += `│  ├── ${warn.message}${location}\n`;
    }
  }

  if (output.actionRequired) {
    result += `
│  🛑 ACTION REQUIRED: ${output.summary}
`;
  }

  result += `
├─────────────────────────────────────────────────────────────┤
│  All actions require your explicit command.                 │
│  Guardian will NOT auto-commit, auto-fix, or auto-deploy.   │
└─────────────────────────────────────────────────────────────┘
`;

  return result;
}

// Parse free-form tech stack into structured format
export function parseTechStackFreeform(text: string): Record<string, string> {
  const stack: Record<string, string> = {
    frontend: "",
    backend: "",
    database: "",
    auth: "",
    hosting: "",
  };
  
  const text_lower = text.toLowerCase();
  
  // Frontend detection
  if (text_lower.includes("next")) {
    stack.frontend = text.match(/next\.?js\s*[\d.]+/i)?.[0] || "Next.js";
  } else if (text_lower.includes("react")) {
    stack.frontend = text.match(/react(\s+\+\s+vite)?/i)?.[0] || "React";
  } else if (text_lower.includes("vue")) {
    stack.frontend = text.match(/vue\.?js?\s*[\d.]+/i)?.[0] || "Vue";
  } else if (text_lower.includes("svelte")) {
    stack.frontend = text.match(/svelte(kit)?/i)?.[0] || "Svelte";
  }
  
  // Backend detection
  if (text_lower.includes("convex")) {
    stack.backend = "Convex";
    stack.database = "Convex";
  } else if (text_lower.includes("supabase")) {
    stack.backend = "Supabase";
    stack.database = "PostgreSQL (Supabase)";
  } else if (text_lower.includes("firebase")) {
    stack.backend = "Firebase";
    stack.database = "Firestore";
  } else if (text_lower.includes("prisma")) {
    stack.backend = "Prisma";
  }
  
  // Database detection (if not already set)
  if (!stack.database) {
    if (text_lower.includes("postgres")) {
      stack.database = "PostgreSQL";
    } else if (text_lower.includes("mysql")) {
      stack.database = "MySQL";
    } else if (text_lower.includes("mongo")) {
      stack.database = "MongoDB";
    } else if (text_lower.includes("sqlite")) {
      stack.database = "SQLite";
    }
  }
  
  // Auth detection
  if (text_lower.includes("convex auth")) {
    stack.auth = "Convex Auth";
  } else if (text_lower.includes("clerk")) {
    stack.auth = "Clerk";
  } else if (text_lower.includes("nextauth") || text_lower.includes("auth.js")) {
    stack.auth = "Auth.js";
  } else if (text_lower.includes("supabase auth")) {
    stack.auth = "Supabase Auth";
  }
  
  // Hosting detection
  if (text_lower.includes("vercel")) {
    stack.hosting = "Vercel";
  } else if (text_lower.includes("netlify")) {
    stack.hosting = "Netlify";
  } else if (text_lower.includes("railway")) {
    stack.hosting = "Railway";
  } else if (text_lower.includes("aws")) {
    stack.hosting = "AWS";
  }
  
  return stack;
}

// Parse free-form requirements into PRD structure
export function parseRequirementsFreeform(text: string): {
  targetUser: string;
  jobsToBeDone: string[];
  successCriteria: string[];
  criticalPaths: string[];
} {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  
  const result = {
    targetUser: "",
    jobsToBeDone: [] as string[],
    successCriteria: [] as string[],
    criticalPaths: [] as string[],
  };
  
  let currentSection = "";
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Detect section headers
    if (lower.includes("target user") || lower.includes("users:") || lower.includes("audience")) {
      currentSection = "targetUser";
      continue;
    }
    if (lower.includes("job") || lower.includes("feature") || lower.includes("function")) {
      currentSection = "jobs";
      continue;
    }
    if (lower.includes("success") || lower.includes("criteri") || lower.includes("must work")) {
      currentSection = "success";
      continue;
    }
    if (lower.includes("critical") || lower.includes("flow") || lower.includes("path") || lower.includes("journey")) {
      currentSection = "paths";
      continue;
    }
    
    // Parse content based on current section
    const content = line.replace(/^[-*•]\s*/, "").trim();
    if (!content) continue;
    
    switch (currentSection) {
      case "targetUser":
        result.targetUser = result.targetUser ? `${result.targetUser} ${content}` : content;
        break;
      case "jobs":
        result.jobsToBeDone.push(content);
        break;
      case "success":
        result.successCriteria.push(content);
        break;
      case "paths":
        result.criticalPaths.push(content);
        break;
      default:
        // If no section detected, try to infer from content
        if (lower.includes("user") && !result.targetUser) {
          result.targetUser = content;
        } else if (content.includes("→") || content.includes("->")) {
          result.criticalPaths.push(content);
        } else {
          result.jobsToBeDone.push(content);
        }
    }
  }
  
  return result;
}
