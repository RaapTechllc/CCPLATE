/**
 * Beginner Tier - "Ralph Loop" Autonomous Building
 * 
 * User provides minimal input through guided MCQ. After PRD completion,
 * Guardian operates autonomously until natural checkpoints.
 * 
 * 10x IMPROVEMENTS OVER BOLT.NEW/REPLIT:
 * 1. Intent-aware questions that adapt based on previous answers
 * 2. AI-powered derivation that infers context from description
 * 3. Ralph Loop with intelligent phase transitions (not just task completion)
 * 4. Proactive error recovery with pattern recognition
 * 5. Demo-quality HITL with screenshots and live previews
 */

import type { TierConfig, TierQuestion } from "./index";

export const BEGINNER_CONFIG: TierConfig = {
  tier: "beginner",
  name: "Beginner",
  description: "Tell me what you want to build, I'll handle the rest",
  autonomyLevel: 0.95,
  
  interviewStyle: "mcq",
  showArchitecturePreview: false,
  
  nudgeConfig: {
    suppressTypes: ["commit", "test", "lint", "context_warning"],
    showTypes: ["error", "hitl_required", "phase_complete", "context_critical"],
    nudgeFormat: "info",
    contextThresholds: {
      warning: 0.7,
      orange: 0.85,
      critical: 0.95,
      forceHandoff: 0.98,
    },
  },
  
  hitlConfig: {
    phaseComplete: "always",
    featureComplete: "never",
    schemaChange: "never",
    authChange: "never",
    buildError: "suggestion",
    testFailure: "suggestion",
    newFile: "never",
    fileModify: "never",
    securityConcern: "always",
  },
  
  autoResolve: {
    lintErrors: true,
    buildErrors: true,
    testFailures: true,
    maxRetries: 3,
  },
};

// ============================================================================
// ENHANCED BEGINNER CONFIG - 10x Improvements
// ============================================================================

export interface BeginnerEnhancedConfig {
  // Ralph Loop execution settings
  ralphLoop: {
    maxIterationsPerPhase: number;
    commitAfterSuccess: boolean;
    runTestsAfterChange: boolean;
    screenshotOnCheckpoint: boolean;
    previewUrlOnCheckpoint: boolean;
  };
  
  // Intelligent phase transition rules
  phaseTransition: {
    requireAllTasksComplete: boolean;
    requireBuildPass: boolean;
    requireCriticalPathsWork: boolean;
    allowPartialProgress: boolean;
    minCompletionPercent: number;
  };
  
  // Proactive error recovery
  errorRecovery: {
    detectPatterns: boolean;
    autoFixCommonIssues: boolean;
    escalateAfterAttempts: number;
    learnFromFixes: boolean;
  };
  
  // Demo quality settings
  demoQuality: {
    captureScreenshots: boolean;
    generatePreviewUrl: boolean;
    showBeforeAfter: boolean;
    includeMetrics: boolean;
  };
}

export const BEGINNER_ENHANCED_CONFIG: BeginnerEnhancedConfig = {
  ralphLoop: {
    maxIterationsPerPhase: 50,
    commitAfterSuccess: true,
    runTestsAfterChange: true,
    screenshotOnCheckpoint: true,
    previewUrlOnCheckpoint: true,
  },
  
  phaseTransition: {
    requireAllTasksComplete: false,
    requireBuildPass: true,
    requireCriticalPathsWork: true,
    allowPartialProgress: true,
    minCompletionPercent: 80,
  },
  
  errorRecovery: {
    detectPatterns: true,
    autoFixCommonIssues: true,
    escalateAfterAttempts: 3,
    learnFromFixes: true,
  },
  
  demoQuality: {
    captureScreenshots: true,
    generatePreviewUrl: true,
    showBeforeAfter: true,
    includeMetrics: true,
  },
};

// ============================================================================
// SMART MCQ QUESTIONS - Intent-Aware with Conditional Follow-ups
// ============================================================================

// Core questions that everyone answers
export const BEGINNER_QUESTIONS: TierQuestion[] = [
  {
    key: "projectType",
    type: "select",
    question: "What are you building?",
    required: true,
    options: [
      { 
        label: "🌐 Web Application", 
        value: "webapp",
        description: "Interactive app with user accounts and data",
      },
      { 
        label: "📄 Landing Page / Marketing Site", 
        value: "landing",
        description: "Static or mostly-static promotional site",
      },
      { 
        label: "📊 Dashboard / Admin Panel", 
        value: "dashboard",
        description: "Data visualization and management interface",
      },
      { 
        label: "🛒 E-commerce Store", 
        value: "ecommerce",
        description: "Online store with products and checkout",
      },
      { 
        label: "📝 Blog / Content Site", 
        value: "blog",
        description: "Content-focused site with posts/articles",
      },
      { 
        label: "🔌 API / Backend Service", 
        value: "api",
        description: "Backend-only service (no UI)",
      },
      {
        label: "🎨 Portfolio / Personal Site",
        value: "portfolio",
        description: "Showcase your work or personal brand",
      },
      {
        label: "📱 SaaS / Subscription App",
        value: "saas",
        description: "Software-as-a-service with billing",
      },
    ],
  },
  {
    key: "primaryFeature",
    type: "select",
    question: "What's the MAIN thing users will do?",
    required: true,
    options: [
      { 
        label: "👤 Create/manage accounts", 
        value: "auth",
        description: "User registration, profiles, settings",
      },
      { 
        label: "📖 View/browse content", 
        value: "content",
        description: "Read articles, view products, explore data",
      },
      { 
        label: "💳 Buy products/services", 
        value: "commerce",
        description: "Shopping cart, checkout, payments",
      },
      { 
        label: "📁 Upload/share files", 
        value: "files",
        description: "File uploads, media sharing, document management",
      },
      { 
        label: "📈 Track data/metrics", 
        value: "analytics",
        description: "Charts, dashboards, reports",
      },
      { 
        label: "💬 Communicate with others", 
        value: "messaging",
        description: "Chat, comments, notifications",
      },
      { 
        label: "✏️ Create/edit content", 
        value: "create",
        description: "Write posts, design, build things",
      },
      {
        label: "🔍 Search/discover content",
        value: "search",
        description: "Find and filter information",
      },
      {
        label: "📋 Manage tasks/projects",
        value: "tasks",
        description: "To-do lists, kanban, project management",
      },
    ],
  },
  {
    key: "userAuth",
    type: "select",
    question: "Do users need to log in?",
    required: true,
    options: [
      { 
        label: "✉️ Yes, with email/password", 
        value: "email",
        description: "Traditional email + password login",
      },
      { 
        label: "🔗 Yes, with social login (Google, GitHub)", 
        value: "social",
        description: "One-click login with existing accounts",
      },
      { 
        label: "✅ Yes, both options", 
        value: "both",
        description: "Email + social login options",
      },
      { 
        label: "🚫 No login needed", 
        value: "none",
        description: "Public access only",
      },
    ],
  },
  {
    key: "dataStorage",
    type: "select",
    question: "Does your app need to save user data?",
    required: true,
    options: [
      { 
        label: "📦 Yes, lots of data (posts, products, records)", 
        value: "heavy",
        description: "Full database with multiple tables/collections",
      },
      { 
        label: "📋 Yes, but minimal (user profiles only)", 
        value: "light",
        description: "Just user accounts and preferences",
      },
      { 
        label: "🚫 No database needed", 
        value: "none",
        description: "Static content or external data only",
      },
    ],
  },
  {
    key: "timeline",
    type: "select",
    question: "When do you need this?",
    required: true,
    options: [
      { 
        label: "⚡ ASAP - just get it working", 
        value: "asap",
        description: "Minimum viable, ship fast",
      },
      { 
        label: "📅 This week - MVP quality", 
        value: "week",
        description: "Working prototype with core features",
      },
      { 
        label: "🗓️ This month - production ready", 
        value: "month",
        description: "Polished, tested, ready for real users",
      },
      { 
        label: "🎯 No rush - do it right", 
        value: "quality",
        description: "Take time for best practices and quality",
      },
    ],
  },
  {
    key: "projectDescription",
    type: "input",
    question: "In one sentence, describe your project:",
    placeholder: "e.g., 'A recipe sharing app where users can save and organize cooking recipes'",
    required: true,
    minLength: 20,
    maxLength: 300,
  },
];

// Conditional follow-up questions based on previous answers
export const BEGINNER_CONDITIONAL_QUESTIONS: TierQuestion[] = [
  // E-commerce follow-up
  {
    key: "paymentProvider",
    type: "select",
    question: "How will you accept payments?",
    required: true,
    condition: (answers) => 
      answers.projectType === "ecommerce" || 
      answers.projectType === "saas" ||
      answers.primaryFeature === "commerce",
    options: [
      { label: "💳 Stripe (Recommended)", value: "stripe", description: "Easy setup, great DX" },
      { label: "🅿️ PayPal", value: "paypal", description: "Widely trusted" },
      { label: "🔄 Both Stripe + PayPal", value: "both", description: "Maximum flexibility" },
      { label: "⏳ Add payments later", value: "later", description: "Start without payments" },
    ],
  },
  // SaaS follow-up
  {
    key: "billingModel",
    type: "select",
    question: "How will you charge users?",
    required: true,
    condition: (answers) => answers.projectType === "saas",
    options: [
      { label: "📅 Monthly subscription", value: "monthly", description: "Recurring monthly payments" },
      { label: "📆 Annual subscription", value: "annual", description: "Yearly billing with discount" },
      { label: "🎚️ Usage-based", value: "usage", description: "Pay for what you use" },
      { label: "🆓 Freemium", value: "freemium", description: "Free tier + paid upgrades" },
      { label: "💰 One-time purchase", value: "onetime", description: "Single payment for lifetime access" },
    ],
  },
  // File upload follow-up
  {
    key: "fileTypes",
    type: "select",
    question: "What kind of files will users upload?",
    required: true,
    condition: (answers) => answers.primaryFeature === "files",
    options: [
      { label: "🖼️ Images only", value: "images", description: "Photos, screenshots, graphics" },
      { label: "📄 Documents", value: "documents", description: "PDFs, Word docs, spreadsheets" },
      { label: "🎥 Media (images + video)", value: "media", description: "Photos and videos" },
      { label: "📦 Any file type", value: "any", description: "No restrictions" },
    ],
  },
  // Dashboard follow-up
  {
    key: "dataSource",
    type: "select",
    question: "Where does the data come from?",
    required: true,
    condition: (answers) => 
      answers.projectType === "dashboard" || 
      answers.primaryFeature === "analytics",
    options: [
      { label: "📊 User enters it manually", value: "manual", description: "Forms and inputs" },
      { label: "🔗 External API/service", value: "api", description: "Pull from another system" },
      { label: "📥 File uploads (CSV, Excel)", value: "uploads", description: "Import spreadsheets" },
      { label: "🔄 Real-time from database", value: "realtime", description: "Live data updates" },
    ],
  },
  // Messaging follow-up
  {
    key: "messagingType",
    type: "select",
    question: "What kind of communication?",
    required: true,
    condition: (answers) => answers.primaryFeature === "messaging",
    options: [
      { label: "💬 Real-time chat", value: "chat", description: "Instant messaging" },
      { label: "💌 Async messages", value: "async", description: "Like email or forums" },
      { label: "📢 Broadcast/announcements", value: "broadcast", description: "One-to-many updates" },
      { label: "🔔 Notifications only", value: "notifications", description: "Alerts, no replies" },
    ],
  },
  // Content creation follow-up
  {
    key: "contentType",
    type: "select",
    question: "What kind of content will users create?",
    required: true,
    condition: (answers) => 
      answers.primaryFeature === "create" || 
      answers.projectType === "blog",
    options: [
      { label: "📝 Text/articles", value: "text", description: "Blog posts, notes, documents" },
      { label: "🖼️ Visual content", value: "visual", description: "Images, designs, galleries" },
      { label: "📋 Structured data", value: "structured", description: "Forms, lists, tables" },
      { label: "🎨 Rich media", value: "rich", description: "Text + images + embeds" },
    ],
  },
];

// Get all applicable questions for given answers
export function getApplicableQuestions(answers: Record<string, unknown>): TierQuestion[] {
  const conditionalApplicable = BEGINNER_CONDITIONAL_QUESTIONS.filter(q => {
    if (!q.condition) return true;
    return q.condition(answers);
  });
  
  return [...BEGINNER_QUESTIONS, ...conditionalApplicable];
}

// ============================================================================
// ENHANCED PRD DERIVATION - AI-Powered Intent Inference
// ============================================================================

export interface BeginnerAnswers {
  projectType: string;
  primaryFeature: string;
  userAuth: string;
  dataStorage: string;
  timeline: string;
  projectDescription: string;
  // Optional conditional answers
  paymentProvider?: string;
  billingModel?: string;
  fileTypes?: string;
  dataSource?: string;
  messagingType?: string;
  contentType?: string;
}

export interface DerivedPRD {
  projectName: string;
  techStack: {
    frontend: string;
    backend: string;
    database: string;
    auth: string;
    hosting: string;
    additional: string[];
  };
  targetUser: string;
  jobsToBeDone: string[];
  successCriteria: string[];
  criticalPaths: string[];
  nonGoals: string[];
  timeline: string;
  riskAssumptions: string[];
  // Enhanced fields
  estimatedComplexity: "simple" | "moderate" | "complex";
  suggestedPhases: number;
  keyEntities: string[];
  convexSchema: ConvexSchemaHint[];
}

export interface ConvexSchemaHint {
  tableName: string;
  fields: { name: string; type: string; indexed?: boolean }[];
  description: string;
}

export function deriveBeginnerPRD(answers: BeginnerAnswers): DerivedPRD {
  const projectName = extractProjectName(answers.projectDescription);
  const inferredEntities = inferEntitiesFromDescription(answers.projectDescription);
  const complexity = assessComplexity(answers);
  
  return {
    projectName,
    techStack: {
      frontend: "Next.js 16 (App Router)",
      backend: "Convex",
      database: answers.dataStorage === "none" ? "None" : "Convex",
      auth: deriveAuth(answers.userAuth),
      hosting: "Vercel",
      additional: deriveAdditionalTech(answers),
    },
    targetUser: deriveTargetUser(answers),
    jobsToBeDone: deriveJobsToBeDone(answers),
    successCriteria: deriveSuccessCriteria(answers),
    criticalPaths: deriveCriticalPaths(answers),
    nonGoals: deriveNonGoals(answers),
    timeline: answers.timeline,
    riskAssumptions: deriveRisks(answers),
    estimatedComplexity: complexity,
    suggestedPhases: complexity === "simple" ? 3 : complexity === "moderate" ? 4 : 5,
    keyEntities: inferredEntities,
    convexSchema: deriveConvexSchema(answers, inferredEntities),
  };
}

// Enhanced project name extraction with NLP-like pattern matching
function extractProjectName(description: string): string {
  const words = description.split(/\s+/);
  
  // Pattern 1: "A [adjective]? [noun] [app/site/platform/tool]"
  const appKeywords = ["app", "application", "site", "website", "platform", "tool", "system", "service", "portal", "hub", "dashboard", "manager"];
  for (let i = 0; i < words.length - 1; i++) {
    const nextWord = words[i + 1]?.toLowerCase().replace(/[^a-z]/g, "");
    if (appKeywords.includes(nextWord)) {
      const noun = words[i].replace(/[^a-zA-Z]/g, "");
      if (noun.length > 2) {
        return capitalize(noun) + capitalize(nextWord);
      }
    }
  }
  
  // Pattern 2: Look for domain-specific nouns
  const domainNouns = extractDomainNouns(description);
  if (domainNouns.length > 0) {
    const primary = domainNouns[0];
    return capitalize(primary) + "Hub";
  }
  
  // Pattern 3: First capitalized multi-letter word
  for (const word of words) {
    const clean = word.replace(/[^a-zA-Z]/g, "");
    if (clean.length > 3 && /^[A-Z]/.test(clean)) {
      return clean;
    }
  }
  
  // Pattern 4: Extract meaningful verb → noun conversion
  const verbs = ["share", "track", "manage", "organize", "build", "create", "find", "discover"];
  for (const verb of verbs) {
    if (description.toLowerCase().includes(verb)) {
      const idx = description.toLowerCase().indexOf(verb);
      const after = description.slice(idx + verb.length).trim().split(/\s+/)[0];
      if (after && after.length > 2) {
        return capitalize(after.replace(/[^a-zA-Z]/g, "")) + "App";
      }
    }
  }
  
  return "MyProject";
}

// Extract domain-specific nouns from description
function extractDomainNouns(description: string): string[] {
  const commonNouns = new Set([
    "app", "site", "users", "user", "people", "things", "data", "information",
    "way", "system", "platform", "tool", "service", "application",
  ]);
  
  const words = description.toLowerCase().split(/\s+/);
  const nouns: string[] = [];
  
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, "");
    if (clean.length > 3 && !commonNouns.has(clean)) {
      // Check if it's likely a noun (not a verb/adjective)
      if (!clean.endsWith("ly") && !clean.endsWith("ing") && !clean.endsWith("ed")) {
        nouns.push(clean);
      }
    }
  }
  
  return nouns.slice(0, 5);
}

// Infer key entities from project description for schema generation
function inferEntitiesFromDescription(description: string): string[] {
  const entities: string[] = [];
  const desc = description.toLowerCase();
  
  // Common entity patterns
  const entityPatterns: Record<string, string[]> = {
    user: ["user", "account", "profile", "member"],
    post: ["post", "article", "blog", "content", "story"],
    product: ["product", "item", "goods", "merchandise"],
    order: ["order", "purchase", "transaction", "cart"],
    message: ["message", "chat", "conversation", "comment"],
    file: ["file", "document", "upload", "media", "image", "photo"],
    task: ["task", "todo", "project", "assignment"],
    recipe: ["recipe", "meal", "dish", "ingredient"],
    event: ["event", "booking", "appointment", "schedule"],
    review: ["review", "rating", "feedback"],
  };
  
  for (const [entity, patterns] of Object.entries(entityPatterns)) {
    for (const pattern of patterns) {
      if (desc.includes(pattern)) {
        entities.push(entity);
        break;
      }
    }
  }
  
  // Always include user if auth is needed
  if (!entities.includes("user")) {
    entities.unshift("user");
  }
  
  return [...new Set(entities)].slice(0, 5);
}

// Assess project complexity based on answers
function assessComplexity(answers: BeginnerAnswers): "simple" | "moderate" | "complex" {
  let score = 0;
  
  // Project type complexity
  const typeScores: Record<string, number> = {
    landing: 1, portfolio: 1, blog: 2, webapp: 3,
    dashboard: 3, ecommerce: 4, saas: 5, api: 3,
  };
  score += typeScores[answers.projectType] || 2;
  
  // Feature complexity
  const featureScores: Record<string, number> = {
    content: 1, auth: 2, create: 2, files: 3,
    analytics: 3, commerce: 4, messaging: 4, search: 2, tasks: 3,
  };
  score += featureScores[answers.primaryFeature] || 2;
  
  // Auth adds complexity
  if (answers.userAuth === "both") score += 2;
  else if (answers.userAuth !== "none") score += 1;
  
  // Data storage
  if (answers.dataStorage === "heavy") score += 2;
  else if (answers.dataStorage === "light") score += 1;
  
  // Conditional features add complexity
  if (answers.paymentProvider && answers.paymentProvider !== "later") score += 3;
  if (answers.messagingType === "chat") score += 2;
  
  if (score <= 6) return "simple";
  if (score <= 12) return "moderate";
  return "complex";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function deriveAuth(userAuth: string): string {
  switch (userAuth) {
    case "email": return "Convex Auth (email/password)";
    case "social": return "Convex Auth (Google, GitHub)";
    case "both": return "Convex Auth (email + social)";
    case "none": return "None";
    default: return "Convex Auth";
  }
}

// Derive additional tech based on features needed
function deriveAdditionalTech(answers: BeginnerAnswers): string[] {
  const tech: string[] = [];
  
  // Payment providers
  if (answers.paymentProvider === "stripe" || answers.paymentProvider === "both") {
    tech.push("Stripe");
  }
  if (answers.paymentProvider === "paypal" || answers.paymentProvider === "both") {
    tech.push("PayPal");
  }
  
  // File handling
  if (answers.primaryFeature === "files" || answers.fileTypes) {
    tech.push("Convex File Storage");
    if (answers.fileTypes === "media" || answers.fileTypes === "images") {
      tech.push("sharp (image optimization)");
    }
  }
  
  // Real-time features
  if (answers.messagingType === "chat" || answers.dataSource === "realtime") {
    tech.push("Convex Realtime");
  }
  
  // Analytics/charts
  if (answers.primaryFeature === "analytics" || answers.projectType === "dashboard") {
    tech.push("Recharts");
  }
  
  // Rich text editing
  if (answers.contentType === "rich" || answers.contentType === "text") {
    tech.push("Tiptap (rich text editor)");
  }
  
  return tech;
}

function deriveTargetUser(answers: BeginnerAnswers): string {
  const typeDescriptions: Record<string, string> = {
    webapp: "Users who need a web-based solution for",
    landing: "Visitors interested in learning about",
    dashboard: "Administrators and analysts who need to monitor",
    ecommerce: "Shoppers looking to browse and purchase",
    blog: "Readers interested in",
    api: "Developers who need to integrate with",
    portfolio: "Potential clients and employers viewing",
    saas: "Businesses and professionals who need",
  };
  
  const base = typeDescriptions[answers.projectType] || "Users who want to";
  const cleanDesc = answers.projectDescription.toLowerCase().replace(/^(a|an)\s+/i, "");
  return `${base} ${cleanDesc}`;
}

function deriveJobsToBeDone(answers: BeginnerAnswers): string[] {
  const jobs: string[] = [];
  
  // Auth jobs
  if (answers.userAuth !== "none") {
    jobs.push("Sign up and manage my account securely");
  }
  
  // Feature-based jobs (enhanced)
  const featureJobs: Record<string, string[]> = {
    auth: ["Manage my profile and preferences", "Reset my password when forgotten"],
    content: ["Browse and discover relevant content", "Search and filter to find what I need"],
    commerce: ["Find and purchase products easily", "Track my orders and returns"],
    files: ["Upload, organize, and share files", "Preview and download my files"],
    analytics: ["View and analyze my data at a glance", "Export reports for sharing"],
    messaging: ["Communicate with others in real-time", "Receive notifications for new messages"],
    create: ["Create and publish content easily", "Edit and manage my published work"],
    search: ["Find exactly what I'm looking for quickly", "Save searches for later"],
    tasks: ["Create and organize my tasks", "Track progress toward goals"],
  };
  
  if (featureJobs[answers.primaryFeature]) {
    jobs.push(...featureJobs[answers.primaryFeature]);
  }
  
  // Type-based jobs
  const typeJobs: Record<string, string[]> = {
    dashboard: ["Monitor key metrics at a glance", "Drill down into detailed data"],
    ecommerce: ["Complete purchases securely", "Review products before buying"],
    blog: ["Read engaging content", "Subscribe for updates"],
    saas: ["Access features based on my plan", "Upgrade when I need more"],
    portfolio: ["View showcased work", "Contact the creator"],
  };
  
  if (typeJobs[answers.projectType]) {
    jobs.push(...typeJobs[answers.projectType]);
  }
  
  // Dedupe and limit
  return [...new Set(jobs)].slice(0, 5);
}

function deriveSuccessCriteria(answers: BeginnerAnswers): string[] {
  const criteria: string[] = [];
  
  // Auth criteria
  if (answers.userAuth !== "none") {
    criteria.push("Users can sign up and log in successfully");
    criteria.push("Sessions persist across page reloads");
    criteria.push("Password reset flow works end-to-end");
  }
  
  // Feature criteria (enhanced with Playwright-testable conditions)
  const featureCriteria: Record<string, string[]> = {
    auth: ["Profile updates are saved and displayed correctly"],
    content: ["Content loads within 2 seconds", "Search returns relevant results within 1 second"],
    commerce: ["Products display with correct prices", "Cart updates correctly", "Checkout completes with test payment"],
    files: ["Files up to 10MB upload successfully", "Uploaded files can be downloaded/viewed"],
    analytics: ["Charts render with correct data", "Date filters update visualizations"],
    messaging: ["Messages appear within 500ms of sending", "Typing indicators show in real-time"],
    create: ["Content saves as draft automatically", "Published content is immediately visible"],
    search: ["Search suggestions appear while typing", "Results are relevant to query"],
    tasks: ["Tasks can be created, edited, and deleted", "Task status changes persist"],
  };
  
  if (featureCriteria[answers.primaryFeature]) {
    criteria.push(...featureCriteria[answers.primaryFeature]);
  }
  
  // Universal criteria (Vercel best practices)
  criteria.push("Largest Contentful Paint under 2.5 seconds");
  criteria.push("No hydration errors in console");
  criteria.push("All interactive elements are keyboard accessible");
  criteria.push("Core Web Vitals pass on mobile");
  
  return [...new Set(criteria)].slice(0, 10);
}

function deriveCriticalPaths(answers: BeginnerAnswers): string[] {
  const paths: string[] = [];
  
  // Auth path
  if (answers.userAuth !== "none") {
    if (answers.userAuth === "email" || answers.userAuth === "both") {
      paths.push("Sign up with email → Verify email → Log in → Access dashboard");
    }
    if (answers.userAuth === "social" || answers.userAuth === "both") {
      paths.push("Click social login → Authorize → Redirect → Access dashboard");
    }
  }
  
  // Feature paths (enhanced with error states)
  const featurePaths: Record<string, string[]> = {
    content: [
      "Browse → Search → View detail → Bookmark/save",
      "Browse with slow connection → Show loading skeleton → Display content",
    ],
    commerce: [
      "Browse products → Add to cart → Enter shipping → Complete payment → See confirmation",
      "Add to cart → Remove item → Cart updates → Continue shopping",
    ],
    files: [
      "Click upload → Select file → See progress → File appears in list",
      "Upload large file → Progress bar → Handle failure gracefully",
    ],
    analytics: [
      "Open dashboard → Select date range → Charts update → Export PDF",
      "Dashboard with no data → Show empty state → Guide to add data",
    ],
    messaging: [
      "Open conversation → Type message → Send → See in thread → Recipient notified",
      "Receive message while offline → Sync when reconnected",
    ],
    create: [
      "Create new → Add content → Auto-save → Preview → Publish → Share link",
      "Edit existing → Make changes → Undo → Save → See updated version",
    ],
    search: [
      "Enter query → See suggestions → Select result → View detail",
      "Search with no results → Show helpful message → Suggest alternatives",
    ],
    tasks: [
      "Create task → Set due date → Mark complete → Archive",
      "Drag task to reorder → Order persists on reload",
    ],
  };
  
  if (featurePaths[answers.primaryFeature]) {
    paths.push(...featurePaths[answers.primaryFeature]);
  }
  
  // Universal paths
  if (answers.projectType !== "api") {
    paths.push("Landing page → Understand value proposition → Sign up");
    paths.push("404 error → See helpful message → Navigate back");
  }
  
  return [...new Set(paths)].slice(0, 6);
}

function deriveNonGoals(answers: BeginnerAnswers): string[] {
  const nonGoals = [
    "Native mobile app (web-responsive is sufficient)",
    "Offline support (online-first approach)",
    "Multi-tenancy / white-labeling",
    "Internationalization (English-only for MVP)",
  ];
  
  // Add context-specific non-goals
  if (answers.projectType !== "saas") {
    nonGoals.push("Subscription billing management");
  }
  if (answers.primaryFeature !== "messaging") {
    nonGoals.push("Real-time chat features");
  }
  if (answers.primaryFeature !== "analytics") {
    nonGoals.push("Advanced reporting and analytics");
  }
  if (answers.projectType !== "ecommerce") {
    nonGoals.push("E-commerce checkout flow");
  }
  
  return nonGoals.slice(0, 6);
}

function deriveRisks(answers: BeginnerAnswers): string[] {
  const risks: string[] = [];
  
  // Complexity-based risks
  const complexity = assessComplexity(answers);
  if (complexity === "complex") {
    risks.push("Scope may need reduction to meet timeline");
  }
  
  // Feature-specific risks
  if (answers.paymentProvider && answers.paymentProvider !== "later") {
    risks.push("Payment integration requires merchant account setup");
  }
  if (answers.messagingType === "chat") {
    risks.push("Real-time features may need connection handling for poor networks");
  }
  if (answers.dataStorage === "heavy") {
    risks.push("Data model may evolve as requirements become clearer");
  }
  if (answers.primaryFeature === "files") {
    risks.push("File storage costs may increase with usage");
  }
  
  // Timeline risks
  if (answers.timeline === "asap") {
    risks.push("Fast timeline may require trade-offs on polish");
  }
  
  return risks;
}

// Generate Convex schema hints based on inferred entities
function deriveConvexSchema(answers: BeginnerAnswers, entities: string[]): ConvexSchemaHint[] {
  const schemas: ConvexSchemaHint[] = [];
  
  // User table (if auth)
  if (answers.userAuth !== "none" && entities.includes("user")) {
    schemas.push({
      tableName: "users",
      fields: [
        { name: "name", type: "string" },
        { name: "email", type: "string", indexed: true },
        { name: "imageUrl", type: "string?" },
        { name: "role", type: '"user" | "admin"' },
        { name: "createdAt", type: "number", indexed: true },
      ],
      description: "User accounts and profiles",
    });
  }
  
  // Entity-specific schemas
  const entitySchemas: Record<string, ConvexSchemaHint> = {
    post: {
      tableName: "posts",
      fields: [
        { name: "title", type: "string" },
        { name: "content", type: "string" },
        { name: "authorId", type: "Id<'users'>", indexed: true },
        { name: "status", type: '"draft" | "published"', indexed: true },
        { name: "publishedAt", type: "number?", indexed: true },
        { name: "createdAt", type: "number" },
      ],
      description: "Blog posts or articles",
    },
    product: {
      tableName: "products",
      fields: [
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "price", type: "number" },
        { name: "imageUrl", type: "string?" },
        { name: "category", type: "string", indexed: true },
        { name: "inStock", type: "boolean" },
      ],
      description: "Products for sale",
    },
    order: {
      tableName: "orders",
      fields: [
        { name: "userId", type: "Id<'users'>", indexed: true },
        { name: "items", type: "array" },
        { name: "total", type: "number" },
        { name: "status", type: '"pending" | "paid" | "shipped" | "delivered"', indexed: true },
        { name: "createdAt", type: "number", indexed: true },
      ],
      description: "Customer orders",
    },
    message: {
      tableName: "messages",
      fields: [
        { name: "conversationId", type: "Id<'conversations'>", indexed: true },
        { name: "senderId", type: "Id<'users'>" },
        { name: "content", type: "string" },
        { name: "createdAt", type: "number", indexed: true },
      ],
      description: "Chat messages",
    },
    file: {
      tableName: "files",
      fields: [
        { name: "userId", type: "Id<'users'>", indexed: true },
        { name: "storageId", type: "Id<'_storage'>" },
        { name: "filename", type: "string" },
        { name: "mimeType", type: "string" },
        { name: "size", type: "number" },
        { name: "createdAt", type: "number" },
      ],
      description: "Uploaded files",
    },
    task: {
      tableName: "tasks",
      fields: [
        { name: "userId", type: "Id<'users'>", indexed: true },
        { name: "title", type: "string" },
        { name: "description", type: "string?" },
        { name: "status", type: '"todo" | "in_progress" | "done"', indexed: true },
        { name: "dueDate", type: "number?", indexed: true },
        { name: "order", type: "number" },
      ],
      description: "User tasks",
    },
    recipe: {
      tableName: "recipes",
      fields: [
        { name: "userId", type: "Id<'users'>", indexed: true },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "ingredients", type: "array" },
        { name: "instructions", type: "string" },
        { name: "imageUrl", type: "string?" },
        { name: "prepTime", type: "number?" },
        { name: "tags", type: "array" },
      ],
      description: "Cooking recipes",
    },
  };
  
  for (const entity of entities) {
    if (entity !== "user" && entitySchemas[entity]) {
      schemas.push(entitySchemas[entity]);
    }
  }
  
  return schemas;
}

// ============================================================================
// INTELLIGENT PHASE SYSTEM - Dynamic phases with validation gates
// ============================================================================

export interface PhaseTask {
  id: string;
  description: string;
  estimatedMinutes: number;
  validationCommand?: string;
  validationExpected?: string;
  dependencies?: string[];
  optional?: boolean;
}

export interface PhaseDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  tasks: PhaseTask[];
  transitionGate: PhaseTransitionGate;
  hitlCheckpoint: HITLCheckpoint;
}

export interface PhaseTransitionGate {
  type: "all_tasks" | "build_pass" | "critical_paths" | "validation_pass";
  minCompletionPercent: number;
  requiredTasks?: string[];
  validationTests?: string[];
  allowSkipOnTimeout?: boolean;
  timeoutMinutes?: number;
}

export interface HITLCheckpoint {
  type: "demo" | "review" | "approve" | "screenshot";
  prompt: string;
  demoUrl?: string;
  deployUrl?: string;
  screenshotPaths?: string[];
  criticalPathsToVerify?: string[];
  metrics?: CheckpointMetric[];
}

export interface CheckpointMetric {
  name: string;
  target: string;
  command: string;
}

// Dynamic phase generator based on PRD
export function generatePhases(prd: DerivedPRD): PhaseDefinition[] {
  const phases: PhaseDefinition[] = [];
  
  // Phase 1: Foundation (always present)
  phases.push({
    id: "foundation",
    name: "Foundation",
    emoji: "🏗️",
    description: "Project setup, auth, and base layout",
    tasks: generateFoundationTasks(prd),
    transitionGate: {
      type: "build_pass",
      minCompletionPercent: 100,
      requiredTasks: ["project-init", "convex-setup"],
    },
    hitlCheckpoint: {
      type: "demo",
      prompt: "Review the login flow and basic navigation. Does this match your expectations?",
      demoUrl: "http://localhost:3000",
      screenshotPaths: [
        "screenshots/foundation-landing.png",
        "screenshots/foundation-auth.png",
      ],
      metrics: [
        { name: "Build time", target: "<30s", command: "npm run build" },
        { name: "TypeScript errors", target: "0", command: "npx tsc --noEmit" },
      ],
    },
  });
  
  // Phase 2: Data Layer
  if (prd.techStack.database !== "None" && prd.convexSchema.length > 0) {
    phases.push({
      id: "data-layer",
      name: "Data Layer",
      emoji: "🗄️",
      description: "Database schema and backend functions",
      tasks: generateDataLayerTasks(prd),
      transitionGate: {
        type: "validation_pass",
        minCompletionPercent: 90,
        validationTests: ["convex/schema.test.ts"],
      },
      hitlCheckpoint: {
        type: "review",
        prompt: "Database schema is ready. Review the data model before we build the UI.",
        screenshotPaths: ["screenshots/convex-dashboard.png"],
      },
    });
  }
  
  // Phase 3: Core Feature (always present)
  phases.push({
    id: "core-feature",
    name: "Core Feature",
    emoji: "⭐",
    description: `Primary feature: ${prd.jobsToBeDone[0] || "main functionality"}`,
    tasks: generateCoreFeatureTasks(prd),
    transitionGate: {
      type: "critical_paths",
      minCompletionPercent: 80,
      requiredTasks: ["main-ui", "api-integration"],
    },
    hitlCheckpoint: {
      type: "demo",
      prompt: "Test the main workflow. Can you complete the primary user journey?",
      demoUrl: "http://localhost:3000",
      criticalPathsToVerify: prd.criticalPaths.slice(0, 2),
      screenshotPaths: [
        "screenshots/core-main.png",
        "screenshots/core-flow.png",
      ],
      metrics: [
        { name: "Page load", target: "<2.5s", command: "npm run lighthouse" },
        { name: "E2E tests", target: "pass", command: "npm run test:e2e" },
      ],
    },
  });
  
  // Phase 4: Polish (for moderate+ complexity)
  if (prd.estimatedComplexity !== "simple") {
    phases.push({
      id: "polish",
      name: "Polish",
      emoji: "✨",
      description: "UI refinement, error handling, and edge cases",
      tasks: generatePolishTasks(prd),
      transitionGate: {
        type: "all_tasks",
        minCompletionPercent: 75,
        allowSkipOnTimeout: true,
        timeoutMinutes: 60,
      },
      hitlCheckpoint: {
        type: "review",
        prompt: "Review the polished app. Any issues or missing features before deploy?",
        screenshotPaths: [
          "screenshots/polish-mobile.png",
          "screenshots/polish-loading.png",
          "screenshots/polish-error.png",
        ],
        metrics: [
          { name: "Accessibility", target: "100%", command: "npm run a11y" },
          { name: "Mobile responsive", target: "pass", command: "npm run test:mobile" },
        ],
      },
    });
  }
  
  // Phase N: Deploy (always last)
  phases.push({
    id: "deploy",
    name: "Deploy",
    emoji: "🚀",
    description: "Deploy to production on Vercel",
    tasks: [
      {
        id: "final-tests",
        description: "Run final test suite",
        estimatedMinutes: 5,
        validationCommand: "npm test",
        validationExpected: "All tests pass",
      },
      {
        id: "build-prod",
        description: "Build for production",
        estimatedMinutes: 3,
        validationCommand: "npm run build",
        validationExpected: "Build succeeds without errors",
      },
      {
        id: "deploy-vercel",
        description: "Deploy to Vercel",
        estimatedMinutes: 5,
        validationCommand: "npx vercel --prod",
        validationExpected: "Deployment URL returned",
      },
      {
        id: "verify-prod",
        description: "Verify production deployment",
        estimatedMinutes: 2,
        validationCommand: "curl -s -o /dev/null -w '%{http_code}' $DEPLOY_URL",
        validationExpected: "200",
      },
    ],
    transitionGate: {
      type: "all_tasks",
      minCompletionPercent: 100,
      requiredTasks: ["deploy-vercel", "verify-prod"],
    },
    hitlCheckpoint: {
      type: "approve",
      prompt: "Your app is ready to go live! Approve deployment?",
      deployUrl: "https://your-app.vercel.app",
      screenshotPaths: ["screenshots/deploy-final.png"],
      metrics: [
        { name: "Lighthouse Performance", target: ">90", command: "npm run lighthouse:prod" },
        { name: "Core Web Vitals", target: "pass", command: "npm run cwv" },
      ],
    },
  });
  
  return phases;
}

function generateFoundationTasks(prd: DerivedPRD): PhaseTask[] {
  const tasks: PhaseTask[] = [
    {
      id: "project-init",
      description: "Initialize Next.js 16 project with TypeScript",
      estimatedMinutes: 2,
      validationCommand: "test -f package.json && test -f tsconfig.json",
      validationExpected: "Files exist",
    },
    {
      id: "convex-setup",
      description: "Set up Convex backend and connect to deployment",
      estimatedMinutes: 3,
      validationCommand: "npx convex dev --once",
      validationExpected: "Connected to Convex",
      dependencies: ["project-init"],
    },
    {
      id: "tailwind-setup",
      description: "Configure Tailwind CSS with design system",
      estimatedMinutes: 2,
      validationCommand: "test -f tailwind.config.ts",
      validationExpected: "Config exists",
      dependencies: ["project-init"],
    },
    {
      id: "layout-base",
      description: "Create base layout with header and navigation",
      estimatedMinutes: 5,
      validationCommand: "test -f src/app/layout.tsx",
      validationExpected: "Layout exists",
      dependencies: ["tailwind-setup"],
    },
  ];
  
  // Add auth tasks if needed
  if (prd.techStack.auth !== "None") {
    tasks.push({
      id: "auth-setup",
      description: "Implement Convex Auth with configured providers",
      estimatedMinutes: 10,
      validationCommand: "test -f convex/auth.config.ts",
      validationExpected: "Auth config exists",
      dependencies: ["convex-setup"],
    });
    tasks.push({
      id: "auth-ui",
      description: "Create login/signup UI components",
      estimatedMinutes: 8,
      validationCommand: "test -f src/app/(auth)/login/page.tsx",
      validationExpected: "Auth pages exist",
      dependencies: ["auth-setup", "layout-base"],
    });
    tasks.push({
      id: "auth-protect",
      description: "Add route protection and session handling",
      estimatedMinutes: 5,
      validationCommand: "grep -r 'useAuth' src/",
      validationExpected: "Auth hooks used",
      dependencies: ["auth-ui"],
    });
  }
  
  return tasks;
}

function generateDataLayerTasks(prd: DerivedPRD): PhaseTask[] {
  const tasks: PhaseTask[] = [];
  
  // Schema task
  tasks.push({
    id: "schema-define",
    description: `Define Convex schema with ${prd.convexSchema.length} tables`,
    estimatedMinutes: 5,
    validationCommand: "npx convex dev --once",
    validationExpected: "Schema synced",
  });
  
  // Generate tasks for each entity
  for (const schema of prd.convexSchema) {
    tasks.push({
      id: `crud-${schema.tableName}`,
      description: `Create CRUD functions for ${schema.tableName}`,
      estimatedMinutes: 8,
      validationCommand: `test -f convex/${schema.tableName}.ts`,
      validationExpected: "Functions file exists",
      dependencies: ["schema-define"],
    });
  }
  
  // Add seed data task
  tasks.push({
    id: "seed-data",
    description: "Create seed data for development",
    estimatedMinutes: 5,
    validationCommand: "test -f convex/seed.ts",
    validationExpected: "Seed file exists",
    dependencies: prd.convexSchema.map(s => `crud-${s.tableName}`),
    optional: true,
  });
  
  return tasks;
}

function generateCoreFeatureTasks(prd: DerivedPRD): PhaseTask[] {
  const tasks: PhaseTask[] = [];
  
  // Main UI component
  tasks.push({
    id: "main-ui",
    description: "Build main feature UI components",
    estimatedMinutes: 15,
    validationCommand: "npm run build",
    validationExpected: "Build passes",
  });
  
  // API integration
  tasks.push({
    id: "api-integration",
    description: "Connect UI to Convex backend",
    estimatedMinutes: 10,
    validationCommand: "grep -r 'useQuery\\|useMutation' src/",
    validationExpected: "Convex hooks used",
    dependencies: ["main-ui"],
  });
  
  // Add feature-specific tasks based on primary feature
  const featureTasks: Record<string, PhaseTask[]> = {
    commerce: [
      { id: "product-list", description: "Product listing with filters", estimatedMinutes: 10 },
      { id: "cart-system", description: "Shopping cart functionality", estimatedMinutes: 12 },
      { id: "checkout-flow", description: "Checkout and payment UI", estimatedMinutes: 15 },
    ],
    files: [
      { id: "upload-ui", description: "File upload with progress", estimatedMinutes: 10 },
      { id: "file-browser", description: "File browser and preview", estimatedMinutes: 12 },
      { id: "share-system", description: "File sharing functionality", estimatedMinutes: 8 },
    ],
    messaging: [
      { id: "chat-ui", description: "Chat interface with real-time updates", estimatedMinutes: 15 },
      { id: "conversation-list", description: "Conversation list and search", estimatedMinutes: 10 },
      { id: "notifications", description: "Message notifications", estimatedMinutes: 8 },
    ],
    analytics: [
      { id: "dashboard-layout", description: "Dashboard grid layout", estimatedMinutes: 10 },
      { id: "charts", description: "Interactive charts with Recharts", estimatedMinutes: 15 },
      { id: "filters", description: "Date range and data filters", estimatedMinutes: 8 },
    ],
    create: [
      { id: "editor", description: "Content editor UI", estimatedMinutes: 15 },
      { id: "preview", description: "Live preview functionality", estimatedMinutes: 8 },
      { id: "publish", description: "Publish workflow", estimatedMinutes: 10 },
    ],
    tasks: [
      { id: "task-list", description: "Task list with drag-drop", estimatedMinutes: 12 },
      { id: "task-detail", description: "Task detail and editing", estimatedMinutes: 8 },
      { id: "task-filters", description: "Status filters and search", estimatedMinutes: 6 },
    ],
  };
  
  // Find matching feature tasks
  for (const [feature, featureTaskList] of Object.entries(featureTasks)) {
    if (prd.jobsToBeDone.some(job => job.toLowerCase().includes(feature))) {
      for (const task of featureTaskList) {
        tasks.push({
          ...task,
          dependencies: ["api-integration"],
        });
      }
      break;
    }
  }
  
  // E2E test for critical path
  tasks.push({
    id: "e2e-critical",
    description: "Write E2E test for primary critical path",
    estimatedMinutes: 10,
    validationCommand: "npm run test:e2e",
    validationExpected: "E2E tests pass",
    dependencies: ["api-integration"],
  });
  
  return tasks;
}

function generatePolishTasks(prd: DerivedPRD): PhaseTask[] {
  return [
    {
      id: "loading-states",
      description: "Add skeleton loading states for all data fetches",
      estimatedMinutes: 8,
      validationCommand: "grep -r 'Skeleton\\|loading' src/components/",
      validationExpected: "Loading states present",
    },
    {
      id: "error-handling",
      description: "Implement error boundaries and toast notifications",
      estimatedMinutes: 10,
      validationCommand: "test -f src/components/error-boundary.tsx",
      validationExpected: "Error boundary exists",
    },
    {
      id: "responsive-design",
      description: "Ensure mobile responsiveness (320px - 1920px)",
      estimatedMinutes: 12,
      validationCommand: "npm run test:mobile",
      validationExpected: "Mobile tests pass",
      dependencies: ["loading-states"],
    },
    {
      id: "empty-states",
      description: "Add helpful empty states for lists and searches",
      estimatedMinutes: 5,
      validationCommand: "grep -r 'EmptyState\\|no-results' src/",
      validationExpected: "Empty states present",
      optional: true,
    },
    {
      id: "keyboard-nav",
      description: "Ensure keyboard navigation and focus management",
      estimatedMinutes: 8,
      validationCommand: "npm run a11y",
      validationExpected: "Accessibility passes",
    },
    {
      id: "seo-meta",
      description: "Add SEO metadata and Open Graph tags",
      estimatedMinutes: 5,
      validationCommand: "grep -r 'generateMetadata\\|metadata' src/app/",
      validationExpected: "Metadata present",
      optional: true,
    },
  ];
}

// ============================================================================
// RALPH LOOP EXECUTION ENGINE
// ============================================================================

export interface RalphLoopState {
  currentPhase: string;
  currentTask: string | null;
  tasksCompleted: string[];
  tasksFailed: string[];
  iteration: number;
  startTime: number;
  lastCheckpoint: number;
  errorPatterns: ErrorPattern[];
  metrics: RalphMetrics;
}

export interface ErrorPattern {
  pattern: string;
  occurrences: number;
  lastSeen: number;
  autoFixAttempted: boolean;
  resolution?: string;
}

export interface RalphMetrics {
  totalIterations: number;
  successfulBuilds: number;
  failedBuilds: number;
  testsRun: number;
  testsPassed: number;
  commitsCreated: number;
  averageTaskTime: number;
}

export function createInitialRalphState(phases: PhaseDefinition[]): RalphLoopState {
  return {
    currentPhase: phases[0]?.id || "foundation",
    currentTask: null,
    tasksCompleted: [],
    tasksFailed: [],
    iteration: 0,
    startTime: Date.now(),
    lastCheckpoint: Date.now(),
    errorPatterns: [],
    metrics: {
      totalIterations: 0,
      successfulBuilds: 0,
      failedBuilds: 0,
      testsRun: 0,
      testsPassed: 0,
      commitsCreated: 0,
      averageTaskTime: 0,
    },
  };
}

// Common error patterns with auto-fix strategies
export const COMMON_ERROR_PATTERNS: Record<string, { regex: RegExp; fix: string; confidence: number }> = {
  missingImport: {
    regex: /Cannot find module ['"]([^'"]+)['"]/,
    fix: "Add missing import: npm install $1 or check import path",
    confidence: 0.9,
  },
  typeError: {
    regex: /Type ['"]([^'"]+)['"] is not assignable to type/,
    fix: "Update type annotation or add type assertion",
    confidence: 0.7,
  },
  hydrationMismatch: {
    regex: /Hydration failed because/,
    fix: "Wrap dynamic content in useEffect or add suppressHydrationWarning",
    confidence: 0.8,
  },
  convexSchemaError: {
    regex: /Schema validation failed/,
    fix: "Run npx convex dev to sync schema, check field types",
    confidence: 0.85,
  },
  convexAuthError: {
    regex: /Unauthenticated/,
    fix: "Add authentication check or use public query/mutation",
    confidence: 0.9,
  },
  nextjsRouteError: {
    regex: /Page .* does not exist/,
    fix: "Create missing page.tsx or check route structure",
    confidence: 0.95,
  },
  tailwindClassError: {
    regex: /Unknown utility class/,
    fix: "Check Tailwind class name or add to tailwind.config.ts",
    confidence: 0.8,
  },
  eslintError: {
    regex: /ESLint: .* \(([^)]+)\)/,
    fix: "Fix lint error or add eslint-disable comment if intentional",
    confidence: 0.75,
  },
};

// Evaluate if phase transition should occur
export function evaluatePhaseTransition(
  state: RalphLoopState,
  phase: PhaseDefinition,
): { shouldTransition: boolean; reason: string; blockers?: string[] } {
  const { tasksCompleted, tasksFailed } = state;
  const { transitionGate, tasks } = phase;
  
  // Calculate completion percentage
  const totalRequired = tasks.filter(t => !t.optional).length;
  const completed = tasks.filter(t => tasksCompleted.includes(t.id) && !t.optional).length;
  const completionPercent = totalRequired > 0 ? (completed / totalRequired) * 100 : 0;
  
  // Check required tasks
  if (transitionGate.requiredTasks) {
    const missingRequired = transitionGate.requiredTasks.filter(
      t => !tasksCompleted.includes(t)
    );
    if (missingRequired.length > 0) {
      return {
        shouldTransition: false,
        reason: "Required tasks not complete",
        blockers: missingRequired,
      };
    }
  }
  
  // Check minimum completion
  if (completionPercent < transitionGate.minCompletionPercent) {
    return {
      shouldTransition: false,
      reason: `Only ${Math.round(completionPercent)}% complete (need ${transitionGate.minCompletionPercent}%)`,
      blockers: tasks.filter(t => !tasksCompleted.includes(t.id) && !t.optional).map(t => t.id),
    };
  }
  
  // Check timeout if allowed
  if (transitionGate.allowSkipOnTimeout && transitionGate.timeoutMinutes) {
    const elapsedMinutes = (Date.now() - state.lastCheckpoint) / 60000;
    if (elapsedMinutes > transitionGate.timeoutMinutes) {
      return {
        shouldTransition: true,
        reason: `Timeout reached (${Math.round(elapsedMinutes)} min), proceeding with ${Math.round(completionPercent)}% complete`,
      };
    }
  }
  
  return {
    shouldTransition: true,
    reason: `Phase complete: ${Math.round(completionPercent)}% done`,
  };
}

// Legacy static phases for backward compatibility
export const BEGINNER_PHASES = [
  {
    id: "foundation",
    name: "Foundation",
    description: "Project setup, auth, and base layout",
    tasks: [
      "Initialize project structure",
      "Set up Convex backend",
      "Implement authentication",
      "Create base layout and navigation",
    ],
    hitlCheckpoint: {
      type: "demo" as const,
      prompt: "Review the login flow and basic navigation. Does this match your expectations?",
      demoUrl: "http://localhost:3000/auth",
    },
  },
  {
    id: "core",
    name: "Core Feature",
    description: "Primary feature implementation",
    tasks: [
      "Create database schema",
      "Build API endpoints",
      "Implement main UI components",
      "Connect frontend to backend",
    ],
    hitlCheckpoint: {
      type: "demo" as const,
      prompt: "Test the main workflow. Can you complete the primary user journey?",
      demoUrl: "http://localhost:3000",
    },
  },
  {
    id: "polish",
    name: "Polish",
    description: "UI refinement and error handling",
    tasks: [
      "Add loading states",
      "Implement error handling",
      "Improve UI/UX",
      "Add responsive design",
    ],
    hitlCheckpoint: {
      type: "review" as const,
      prompt: "Review the complete app. Any issues or missing features?",
    },
  },
  {
    id: "deploy",
    name: "Deploy",
    description: "Deploy to production",
    tasks: [
      "Run final tests",
      "Build for production",
      "Deploy to Vercel",
      "Verify production deployment",
    ],
    hitlCheckpoint: {
      type: "approve" as const,
      prompt: "Approve deployment? Your app will be live at the provided URL.",
      deployUrl: "https://your-app.vercel.app",
    },
  },
];
