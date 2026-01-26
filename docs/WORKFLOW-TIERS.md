# CCPLATE Workflow Tiers

> Five workflow frameworks for CCPLATE users ranging from Beginner (fully autonomous) to Team/Enterprise (multi-agent coordination).

---

## Overview

| Tier | Autonomy | User Involvement | HITL Frequency | Target User |
|------|----------|------------------|----------------|-------------|
| **Beginner** | 95% | PRD only (MCQ + 1 fill-in) | End of phase only | Non-technical stakeholders |
| **Intermediate** | 75% | PRD + architecture review | Per major feature | Junior developers |
| **Advanced** | 50% | Continuous checkpoints | Per file/change | Experienced developers |
| **Expert** | 25% | Guardian as advisor | On-demand | Senior engineers |
| **Team** | Variable | Orchestrated multi-agent | Configurable | Enterprise teams |

---

## Tier 1: Beginner (Ralph Loop) - 10x Better Than Bolt.new/Replit

### Philosophy
> "Tell me what you want to build, I'll handle the rest."

The user provides minimal input through guided multiple-choice questions. After PRD completion, Guardian operates autonomously in a "ralph loop" pattern until a natural checkpoint.

### 10x Improvements Over Bolt.new/Replit

| Feature | Bolt.new/Replit | CCPLATE Beginner |
|---------|-----------------|------------------|
| **Question System** | Free-form prompts | Intent-aware MCQs with conditional follow-ups |
| **Tech Stack Inference** | Generic defaults | Project-specific with Convex schema hints |
| **Phase Transitions** | Time-based or manual | Validation gates with build/test requirements |
| **Error Recovery** | Manual intervention | Pattern recognition with auto-fix suggestions |
| **HITL Checkpoints** | Chat-based | Screenshots, metrics, and live preview URLs |
| **Code Quality** | Basic | Vercel React best practices (57 rules) |

### Key Features

1. **Conditional Follow-up Questions**
   - E-commerce → asks about payment provider
   - SaaS → asks about billing model
   - File uploads → asks about file types
   - Messaging → asks about real-time requirements

2. **Intelligent Entity Inference**
   - Extracts domain nouns from project description
   - Generates Convex schema hints automatically
   - Infers relationships between entities

3. **Complexity Assessment**
   - Scores project on 1-15 scale
   - Adjusts number of phases (3-5)
   - Sets appropriate timeouts and thresholds

4. **Ralph Loop with Validation Gates**
   - Phase transitions require build pass
   - Critical paths must be verifiable
   - Timeout fallbacks for stuck phases

### PRD Interview Flow

```typescript
// Simplified interview with mostly MCQ
const BEGINNER_QUESTIONS = [
  {
    key: "projectType",
    type: "select",
    question: "What are you building?",
    options: [
      { label: "Web Application", value: "webapp" },
      { label: "Landing Page / Marketing Site", value: "landing" },
      { label: "Dashboard / Admin Panel", value: "dashboard" },
      { label: "E-commerce Store", value: "ecommerce" },
      { label: "Blog / Content Site", value: "blog" },
      { label: "API / Backend Service", value: "api" },
    ],
    required: true,
  },
  {
    key: "primaryFeature",
    type: "select",
    question: "What's the MAIN thing users will do?",
    options: [
      { label: "Create/manage accounts", value: "auth" },
      { label: "View/browse content", value: "content" },
      { label: "Buy products", value: "commerce" },
      { label: "Upload/share files", value: "files" },
      { label: "Track data/metrics", value: "analytics" },
      { label: "Communicate with others", value: "messaging" },
    ],
    required: true,
  },
  {
    key: "userAuth",
    type: "select",
    question: "Do users need to log in?",
    options: [
      { label: "Yes, with email/password", value: "email" },
      { label: "Yes, with social login (Google, GitHub)", value: "social" },
      { label: "Yes, both options", value: "both" },
      { label: "No login needed", value: "none" },
    ],
    required: true,
  },
  {
    key: "dataStorage",
    type: "select",
    question: "Does your app need to save user data?",
    options: [
      { label: "Yes, lots of data (posts, products, records)", value: "heavy" },
      { label: "Yes, but minimal (user profiles only)", value: "light" },
      { label: "No database needed", value: "none" },
    ],
    required: true,
  },
  {
    key: "timeline",
    type: "select",
    question: "When do you need this?",
    options: [
      { label: "ASAP - just get it working", value: "asap" },
      { label: "This week - MVP quality", value: "week" },
      { label: "This month - production ready", value: "month" },
      { label: "No rush - do it right", value: "quality" },
    ],
    required: true,
  },
  // THE ONE FILL-IN-BLANK QUESTION
  {
    key: "projectDescription",
    type: "input",
    question: "In one sentence, describe your project:",
    placeholder: "e.g., 'A recipe sharing app where users can save and organize cooking recipes'",
    required: true,
    minLength: 20,
    maxLength: 200,
  },
];
```

### Derived Decisions (Auto-selected based on MCQ answers)

```typescript
function deriveBeginnerStack(answers: BeginnerAnswers): PRDAnswers {
  return {
    projectName: extractProjectName(answers.projectDescription),
    techStack: {
      frontend: "Next.js 16 (App Router)",  // Always
      backend: "Next.js API Routes + Convex", // Always
      database: answers.dataStorage === "none" ? "None" : "Convex",
      auth: deriveAuth(answers.userAuth),
      hosting: "Vercel",  // Always
    },
    targetUser: "Users who want to " + answers.projectDescription.toLowerCase(),
    jobsToBeDone: deriveJobsToBeDone(answers),
    successCriteria: deriveSuccessCriteria(answers),
    criticalPaths: deriveCriticalPaths(answers),
    nonGoals: ["Mobile app", "Offline support", "Multi-tenancy"],
    timeline: answers.timeline,
    riskAssumptions: [],
  };
}
```

### Ralph Loop Execution

```
┌─────────────────────────────────────────────────────────────┐
│                    BEGINNER WORKFLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [PRD MCQ Interview]                                       │
│          │                                                  │
│          ▼                                                  │
│   ┌──────────────────┐                                      │
│   │  Derive Stack    │  (Auto-select tech based on answers) │
│   └────────┬─────────┘                                      │
│            │                                                │
│            ▼                                                │
│   ┌──────────────────────────────────────────────────┐      │
│   │              RALPH LOOP                          │      │
│   │  ┌────────────────────────────────────────────┐  │      │
│   │  │ 1. Generate code for next feature          │  │      │
│   │  │ 2. Run build + lint + typecheck            │  │      │
│   │  │ 3. Run tests (if any)                      │  │      │
│   │  │ 4. Commit if passes                        │  │      │
│   │  │ 5. Repeat until phase complete             │  │      │
│   │  └────────────────────────────────────────────┘  │      │
│   │              │                                   │      │
│   │              ▼ (only on phase boundary)          │      │
│   │       ┌──────────────┐                           │      │
│   │       │  HITL Check  │  ←── User reviews demo    │      │
│   │       └──────┬───────┘                           │      │
│   │              │                                   │      │
│   │   ┌──────────┴──────────┐                        │      │
│   │   │                     │                        │      │
│   │   ▼                     ▼                        │      │
│   │ [Approve]           [Request Changes]            │      │
│   │   │                     │                        │      │
│   │   ▼                     ▼                        │      │
│   │ Next Phase      Feed back into loop              │      │
│   └──────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phases for Beginner Tier

| Phase | Description | HITL Checkpoint |
|-------|-------------|-----------------|
| 1. Foundation | Project setup, auth, layout | Demo login flow |
| 2. Core Feature | Primary feature implementation | Demo main workflow |
| 3. Polish | UI refinement, error handling | Review full app |
| 4. Deploy | Deploy to Vercel preview | Approve deployment |

### Nudge Behavior

```typescript
const BEGINNER_NUDGE_CONFIG = {
  // Suppress most nudges - user doesn't want to be bothered
  suppressTypes: ["commit", "test", "lint", "context_warning"],
  
  // Only show critical nudges
  showTypes: ["error", "hitl_required", "phase_complete", "context_critical"],
  
  // Auto-resolve where possible
  autoResolve: {
    lintErrors: true,     // Auto-fix lint issues
    buildErrors: true,    // Attempt auto-fix before asking
    testFailures: true,   // Fix and retry up to 3x
  },
  
  // Context thresholds higher (more tolerance)
  contextThresholds: {
    warning: 0.7,   // Don't warn until 70%
    orange: 0.85,
    critical: 0.95,
    forceHandoff: 0.98,
  },
};
```

---

## Tier 2: Intermediate

### Philosophy
> "Guide me through the architecture, then let me watch you build."

User answers full PRD questions but with smart defaults and suggestions. Gets architectural overview before autonomous building begins.

### PRD Interview Flow

```typescript
const INTERMEDIATE_QUESTIONS = [
  // Same structure as current INTERVIEW_QUESTIONS but with:
  // 1. Smart defaults based on project type
  // 2. Explanation tooltips for each option
  // 3. Validation suggestions ("Did you mean X?")
  
  {
    key: "techStack.frontend",
    type: "select",
    question: "Frontend framework?",
    options: [
      { 
        label: "Next.js 16 (Recommended)", 
        value: "Next.js 16",
        description: "Full-stack React with server components",
      },
      { label: "React + Vite", value: "React (Vite)" },
      { label: "Vue 3", value: "Vue 3" },
      { label: "Svelte", value: "Svelte" },
    ],
    default: "Next.js 16",
    showRationale: true,  // Show why this is recommended
  },
  // ... more questions with explanations
  
  // Allow custom input after selection
  {
    key: "successCriteria",
    type: "multiselect",
    question: "Success criteria - what MUST work?",
    options: [
      { label: "User registration and login", value: "auth" },
      { label: "CRUD operations on main entity", value: "crud" },
      { label: "Search and filtering", value: "search" },
      { label: "Payment processing", value: "payments" },
      { label: "Email notifications", value: "email" },
      { label: "File uploads", value: "uploads" },
    ],
    allowCustom: true,  // User can add custom criteria
    minSelect: 3,
    maxSelect: 10,
  },
];
```

### Pre-Build Architecture Review

Before autonomous building, present the architecture plan:

```
┌─────────────────────────────────────────────────────────────┐
│                 ARCHITECTURE PREVIEW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Based on your PRD, here's the planned architecture:        │
│                                                             │
│  📂 Project Structure:                                      │
│  ├── src/app/              # Next.js App Router pages       │
│  │   ├── (auth)/           # Auth routes                    │
│  │   ├── (dashboard)/      # Protected routes               │
│  │   └── api/              # API routes                     │
│  ├── src/components/       # React components               │
│  ├── src/lib/              # Utilities                      │
│  └── convex/               # Convex backend                 │
│                                                             │
│  🔐 Authentication: Convex Auth (email + social)            │
│  📊 Database: Convex (realtime, serverless)                 │
│  🎨 Styling: Tailwind CSS                                   │
│                                                             │
│  Estimated phases: 4                                        │
│  Estimated HITL checkpoints: 2                              │
│                                                             │
│  [Approve & Start] [Modify Architecture] [Ask Questions]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### HITL Checkpoints

| Event | HITL Required | Nudge Only |
|-------|---------------|------------|
| Phase complete | ✓ | |
| Major feature complete | ✓ | |
| Architecture decision needed | ✓ | |
| Build error (3+ attempts) | ✓ | |
| Test failure (3+ attempts) | ✓ | |
| Minor lint warning | | ✓ |
| Context at 70% | | ✓ |
| Context at 85% | ✓ | |

### Nudge Behavior

```typescript
const INTERMEDIATE_NUDGE_CONFIG = {
  suppressTypes: ["commit"],  // Auto-commit silently
  
  showTypes: [
    "test", "lint", "error", "hitl_required", 
    "phase_complete", "feature_complete",
    "context_warning", "context_critical"
  ],
  
  autoResolve: {
    lintErrors: true,
    buildErrors: false,  // Ask user first
    testFailures: false,
  },
  
  contextThresholds: {
    warning: 0.5,
    orange: 0.7,
    critical: 0.85,
    forceHandoff: 0.95,
  },
};
```

---

## Tier 3: Advanced

### Philosophy
> "I'll drive, but I want to see every turn you make."

Full control over PRD with validation. User sees every significant change before it's applied.

### PRD Interview Flow

```typescript
const ADVANCED_QUESTIONS = [
  // All original questions, plus:
  
  {
    key: "reviewPreferences",
    type: "multiselect",
    question: "What changes require your approval?",
    options: [
      { label: "New files", value: "new_file" },
      { label: "Database schema changes", value: "schema" },
      { label: "API endpoint changes", value: "api" },
      { label: "Auth/security changes", value: "auth" },
      { label: "UI component changes", value: "ui" },
      { label: "Test additions/modifications", value: "tests" },
      { label: "Configuration changes", value: "config" },
    ],
    default: ["schema", "auth", "api"],
  },
  
  {
    key: "commitStyle",
    type: "select",
    question: "Commit granularity?",
    options: [
      { label: "Micro-commits (every change)", value: "micro" },
      { label: "Feature commits (logical units)", value: "feature" },
      { label: "Batch commits (end of session)", value: "batch" },
    ],
    default: "feature",
  },
  
  {
    key: "testRequirements",
    type: "select",
    question: "Testing requirements?",
    options: [
      { label: "TDD - Tests first, then implementation", value: "tdd" },
      { label: "Tests alongside implementation", value: "alongside" },
      { label: "Tests after implementation", value: "after" },
      { label: "Critical paths only", value: "critical" },
    ],
    default: "alongside",
  },
];
```

### Change Preview System

```typescript
interface ChangePreview {
  type: "create" | "modify" | "delete";
  path: string;
  summary: string;
  diff?: string;  // For modifications
  impactLevel: "low" | "medium" | "high" | "critical";
  category: string;  // "schema", "auth", "api", "ui", etc.
}

// Before applying changes, show:
const CHANGE_PREVIEW_TEMPLATE = `
┌─────────────────────────────────────────────────────────────┐
│                    PENDING CHANGES                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📝 Creating: src/app/api/users/route.ts                    │
│     └─ Impact: HIGH (new API endpoint)                      │
│     └─ Adds: GET /api/users, POST /api/users                │
│                                                             │
│  📝 Modifying: convex/schema.ts                             │
│     └─ Impact: CRITICAL (database schema)                   │
│     └─ Adds: users table with 5 fields                      │
│                                                             │
│  📝 Creating: src/components/UserList.tsx                   │
│     └─ Impact: LOW (UI component)                           │
│                                                             │
│  [Apply All] [Review Each] [Skip] [Modify Plan]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
`;
```

### HITL Checkpoints

| Event | HITL Required | Auto | Depends on Preference |
|-------|---------------|------|----------------------|
| New file creation | | | ✓ |
| File modification | | | ✓ |
| Schema change | ✓ | | |
| Auth change | ✓ | | |
| Build error | ✓ | | |
| Test failure | ✓ | | |
| Phase complete | ✓ | | |
| Context at 50% | | ✓ (nudge) | |

### Nudge Behavior

```typescript
const ADVANCED_NUDGE_CONFIG = {
  suppressTypes: [],  // Show everything
  
  showTypes: [
    "commit", "test", "lint", "error", "hitl_required",
    "phase_complete", "feature_complete", "file_created",
    "file_modified", "schema_change", "api_change",
    "context_warning", "context_orange", "context_critical",
    "progress",  // Off-track detection
  ],
  
  autoResolve: {
    lintErrors: false,
    buildErrors: false,
    testFailures: false,
  },
  
  contextThresholds: {
    warning: 0.3,   // Early warning
    orange: 0.5,
    critical: 0.7,
    forceHandoff: 0.9,
  },
  
  // Change batching
  batchChanges: true,
  batchThreshold: 3,  // Show preview after 3 pending changes
};
```

---

## Tier 4: Expert

### Philosophy
> "Guardian is my advisor, not my driver."

Guardian provides suggestions, warnings, and best practices but takes no action without explicit approval.

### PRD Interview Flow

```typescript
const EXPERT_QUESTIONS = [
  // Full control - minimal MCQ, mostly free-form
  
  {
    key: "projectName",
    type: "input",
    question: "Project name:",
    required: true,
  },
  {
    key: "techStack",
    type: "input",
    question: "Tech stack (free-form, e.g., 'Next.js 16, Convex, Tailwind, shadcn'):",
    placeholder: "Describe your preferred stack",
    required: true,
    parseAs: "techStack",  // AI parses into structured format
  },
  {
    key: "requirements",
    type: "textarea",
    question: "Requirements (free-form):",
    placeholder: "Describe what you're building in detail",
    required: true,
    minLength: 100,
    parseAs: "prd",  // AI extracts structured PRD from free text
  },
  {
    key: "constraints",
    type: "textarea",
    question: "Constraints and preferences:",
    placeholder: "Code style, patterns to avoid, architectural preferences",
    required: false,
  },
  {
    key: "guardianRole",
    type: "select",
    question: "Guardian's role:",
    options: [
      { label: "Silent observer (log only)", value: "silent" },
      { label: "Advisor (suggestions only)", value: "advisor" },
      { label: "Reviewer (suggestions + code review)", value: "reviewer" },
      { label: "Guardian (full supervision)", value: "guardian" },
    ],
    default: "advisor",
  },
];
```

### Advisor Mode Operation

```
┌─────────────────────────────────────────────────────────────┐
│                    EXPERT MODE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Guardian operates as an advisor:                           │
│                                                             │
│  🔍 OBSERVATIONS                                            │
│  ├── You're about to modify auth middleware                 │
│  ├── This pattern differs from existing auth code           │
│  └── Consider using the established pattern in src/lib/auth │
│                                                             │
│  💡 SUGGESTIONS                                             │
│  ├── Add rate limiting to this endpoint                     │
│  ├── Consider adding error boundary here                    │
│  └── Test coverage for this module is below 60%             │
│                                                             │
│  ⚠️  WARNINGS                                                │
│  ├── This change may break UserProfile component            │
│  └── Schema migration needed before deployment              │
│                                                             │
│  All actions require your explicit command.                 │
│  Guardian will NOT auto-commit, auto-fix, or auto-deploy.   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### HITL Checkpoints

| Event | HITL | Suggestion Only | Silent |
|-------|------|-----------------|--------|
| Any change | | ✓ | |
| Build error | | ✓ | |
| Test failure | | ✓ | |
| Security concern | ✓ | | |
| Breaking change | ✓ | | |

### Nudge Behavior

```typescript
const EXPERT_NUDGE_CONFIG = {
  mode: "advisor",  // Special mode
  
  // Don't suppress anything, but frame as suggestions
  nudgeFormat: "suggestion",  // "💡 Suggestion: ..." instead of "⚠️ ..."
  
  // Never auto-resolve
  autoResolve: {
    lintErrors: false,
    buildErrors: false,
    testFailures: false,
  },
  
  // Never block
  contextThresholds: {
    warning: 0.5,
    orange: 0.7,
    critical: 0.85,
    forceHandoff: 1.0,  // Never force
  },
  
  // Advisor-specific features
  codeReview: {
    enabled: true,
    timing: "before_commit",  // Review before user commits
    scope: "changed_files",
  },
  
  securityScan: {
    enabled: true,
    blockOnCritical: true,  // Only time Guardian blocks
  },
};
```

---

## Tier 5: Team/Enterprise

### Philosophy
> "Coordinate multiple agents and human developers on complex projects."

Orchestrates parallel work across worktrees with configurable human oversight.

### PRD Interview Flow

```typescript
const TEAM_QUESTIONS = [
  // All Expert questions, plus:
  
  {
    key: "teamStructure",
    type: "multiselect",
    question: "Who's working on this project?",
    options: [
      { label: "Solo developer + Guardian", value: "solo" },
      { label: "Multiple developers", value: "multi_human" },
      { label: "Multiple agents", value: "multi_agent" },
      { label: "Mixed human + agent team", value: "mixed" },
    ],
  },
  {
    key: "parallelization",
    type: "select",
    question: "How should work be parallelized?",
    options: [
      { label: "Sequential (one task at a time)", value: "sequential" },
      { label: "Parallel by feature", value: "feature" },
      { label: "Parallel by layer (frontend/backend/tests)", value: "layer" },
      { label: "Maximum parallelism", value: "max" },
    ],
  },
  {
    key: "mergeStrategy",
    type: "select",
    question: "Merge strategy?",
    options: [
      { label: "Auto-merge passing PRs", value: "auto" },
      { label: "Human approval required", value: "human" },
      { label: "Lead developer approval", value: "lead" },
      { label: "Oracle review + human approval", value: "oracle_human" },
    ],
  },
  {
    key: "communicationChannels",
    type: "multiselect",
    question: "Where should notifications go?",
    options: [
      { label: "Slack", value: "slack" },
      { label: "Discord", value: "discord" },
      { label: "Email", value: "email" },
      { label: "GitHub Issues", value: "github" },
      { label: "In-app only", value: "inapp" },
    ],
  },
];
```

### Multi-Agent Coordination

```
┌─────────────────────────────────────────────────────────────┐
│                 TEAM COORDINATION                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🎯 Task: Add OAuth with Google and GitHub                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              TEAM COORDINATOR                       │    │
│  │  Decomposing task into parallel chunks...           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Phase 1 (Parallel):                                        │
│  ├── 🤖 Agent-1: oauth-google-api  ▶️ IN PROGRESS           │
│  │   └── Worktree: .worktrees/oauth-google                  │
│  ├── 🤖 Agent-2: oauth-github-api  ✅ COMPLETE              │
│  │   └── Worktree: .worktrees/oauth-github                  │
│  └── 🤖 Agent-3: oauth-db-schema   ⏳ WAITING               │
│      └── Worktree: .worktrees/oauth-db                      │
│                                                             │
│  Phase 2 (Blocked on Phase 1):                              │
│  ├── 🤖 Agent-4: oauth-ui          🔒 BLOCKED               │
│  └── 👤 Human: Manual testing      🔒 BLOCKED               │
│                                                             │
│  Knowledge Mesh:                                            │
│  ├── [Agent-2 → All] "GitHub OAuth uses PKCE flow"          │
│  └── [Agent-1 → Agent-4] "Google scopes: email, profile"    │
│                                                             │
│  HITL Queue:                                                │
│  └── Schema migration approval (Agent-3) - PENDING          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Schema Lock for DB Migrations

```typescript
// Prevent parallel schema changes
const schemaLockBehavior = {
  // Only one worktree can modify schema at a time
  exclusiveLock: true,
  
  // Lock duration
  timeout: 30 * 60 * 1000,  // 30 minutes
  
  // Queuing behavior
  queueOthers: true,
  
  // HITL for all schema changes
  requireApproval: true,
  
  // Notify team
  notifyOnLock: true,
  notifyOnRelease: true,
};
```

### HITL Checkpoints

| Event | Auto | Agent Lead | Human Lead | Full Committee |
|-------|------|------------|------------|----------------|
| Minor code change | ✓ | | | |
| Feature complete | | ✓ | | |
| Schema change | | | ✓ | |
| Security change | | | ✓ | |
| Production deploy | | | | ✓ |
| Merge conflict | | ✓ | | |

### Nudge Behavior

```typescript
const TEAM_NUDGE_CONFIG = {
  // Per-agent configuration
  agentConfig: {
    implementer: {
      autoResolve: { lintErrors: true, buildErrors: true },
      commitOnSuccess: true,
    },
    reviewer: {
      autoResolve: { lintErrors: false, buildErrors: false },
      blockOnWarning: true,
    },
    tester: {
      autoResolve: { lintErrors: true, buildErrors: false },
      requireCoverage: 0.8,
    },
  },
  
  // Team notifications
  notifications: {
    slack: {
      channel: "#guardian-alerts",
      events: ["hitl_required", "merge_conflict", "deploy_ready"],
    },
    individual: {
      events: ["assigned", "blocked", "review_requested"],
    },
  },
  
  // Coordination
  knowledgeMesh: {
    autoShare: ["api_changes", "schema_changes", "breaking_changes"],
    broadcastOnComplete: true,
  },
};
```

---

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create `WorkflowTier` enum and configuration types
2. Extend `PRDAnswers` to include tier and tier-specific settings
3. Add tier selection to `ccplate init`

### Phase 2: Question Flows
1. Create tier-specific question sets
2. Implement MCQ renderer with smart defaults
3. Add free-form parsing for Expert tier

### Phase 3: Nudge Adaptation
1. Create `NudgeConfigByTier` mapping
2. Modify `evaluateProgressNudge` to respect tier settings
3. Modify `evaluateWatchdog` for tier-specific thresholds

### Phase 4: HITL Integration
1. Create HITL checkpoint definitions per tier
2. Implement change preview system for Advanced tier
3. Add approval workflows for Team tier

### Phase 5: Team Features
1. Extend team-coordinator agent for Team tier
2. Implement knowledge mesh auto-sharing
3. Add notification integrations

---

## File Structure

```
src/lib/guardian/
├── tiers/
│   ├── index.ts           # Tier types and exports
│   ├── beginner.ts        # Beginner tier config
│   ├── intermediate.ts    # Intermediate tier config
│   ├── advanced.ts        # Advanced tier config
│   ├── expert.ts          # Expert tier config
│   └── team.ts            # Team tier config
├── prd/
│   ├── questions/
│   │   ├── beginner.ts    # MCQ questions
│   │   ├── intermediate.ts
│   │   ├── advanced.ts
│   │   ├── expert.ts
│   │   └── team.ts
│   └── interview.ts       # Interview runner with tier support
├── nudge/
│   ├── config.ts          # Tier-aware nudge config
│   └── adapters.ts        # Nudge format adapters per tier
└── hitl/
    ├── checkpoints.ts     # Checkpoint definitions
    └── change-preview.ts  # Change preview system
```
