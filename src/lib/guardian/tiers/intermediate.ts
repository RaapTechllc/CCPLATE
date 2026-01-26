/**
 * Intermediate Tier - Guided Architecture with Autonomous Building
 * 
 * Full PRD with smart defaults and explanations. User reviews architecture
 * before autonomous building begins. HITL at feature boundaries.
 */

import type { TierConfig, TierQuestion } from "./index";

export const INTERMEDIATE_CONFIG: TierConfig = {
  tier: "intermediate",
  name: "Intermediate",
  description: "Guide me through the architecture, then let me watch you build",
  autonomyLevel: 0.75,
  
  interviewStyle: "guided",
  showArchitecturePreview: true,
  
  nudgeConfig: {
    suppressTypes: ["commit"],
    showTypes: [
      "test", "lint", "error", "hitl_required",
      "phase_complete", "feature_complete",
      "context_warning", "context_critical",
    ],
    nudgeFormat: "warning",
    contextThresholds: {
      warning: 0.5,
      orange: 0.7,
      critical: 0.85,
      forceHandoff: 0.95,
    },
  },
  
  hitlConfig: {
    phaseComplete: "always",
    featureComplete: "always",
    schemaChange: "suggestion",
    authChange: "always",
    buildError: "always", // After 3 auto-fix attempts
    testFailure: "always",
    newFile: "never",
    fileModify: "never",
    securityConcern: "always",
  },
  
  autoResolve: {
    lintErrors: true,
    buildErrors: false,
    testFailures: false,
    maxRetries: 3,
  },
};

// Intermediate Questions - Full PRD with guidance
export const INTERMEDIATE_QUESTIONS: TierQuestion[] = [
  {
    key: "projectName",
    type: "input",
    question: "What's your project name?",
    placeholder: "e.g., RecipeHub, TaskFlow, PhotoShare",
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  {
    key: "techStack.frontend",
    type: "select",
    question: "Frontend framework?",
    required: true,
    showRationale: true,
    options: [
      {
        label: "Next.js 16 (Recommended)",
        value: "Next.js 16",
        description: "Full-stack React with Server Components, excellent performance, built-in routing. Best choice for most projects.",
      },
      {
        label: "React + Vite",
        value: "React (Vite)",
        description: "Lightweight SPA setup. Good for client-heavy apps without SEO needs.",
      },
      {
        label: "Vue 3 + Nuxt",
        value: "Vue 3 (Nuxt)",
        description: "Vue ecosystem with SSR. Great developer experience, slightly smaller community.",
      },
    ],
    default: "Next.js 16",
  },
  {
    key: "techStack.backend",
    type: "select",
    question: "Backend approach?",
    required: true,
    showRationale: true,
    options: [
      {
        label: "Convex (Recommended)",
        value: "Convex",
        description: "Real-time backend with built-in database, auth, and file storage. Zero config, excellent DX.",
      },
      {
        label: "Next.js API Routes + Prisma",
        value: "Next.js API Routes + Prisma",
        description: "Traditional approach with more control. Requires database setup.",
      },
      {
        label: "tRPC + Prisma",
        value: "tRPC + Prisma",
        description: "End-to-end type safety. Great for TypeScript purists.",
      },
      {
        label: "Express + PostgreSQL",
        value: "Express + PostgreSQL",
        description: "Classic Node.js backend. Maximum flexibility, more boilerplate.",
      },
    ],
    default: "Convex",
  },
  {
    key: "techStack.auth",
    type: "select",
    question: "Authentication solution?",
    required: true,
    showRationale: true,
    condition: (answers) => answers["techStack.backend"] !== "none",
    options: [
      {
        label: "Convex Auth (Recommended with Convex)",
        value: "Convex Auth",
        description: "Built-in auth with Convex. Supports email, social login, and magic links.",
      },
      {
        label: "Clerk",
        value: "Clerk",
        description: "Full-featured auth with beautiful UI components. Free tier available.",
      },
      {
        label: "Auth.js (NextAuth)",
        value: "Auth.js",
        description: "Open-source auth for Next.js. Flexible but requires more setup.",
      },
      {
        label: "No authentication",
        value: "None",
        description: "Public-only access, no user accounts.",
      },
    ],
    default: "Convex Auth",
  },
  {
    key: "techStack.hosting",
    type: "select",
    question: "Where will this be hosted?",
    required: true,
    options: [
      {
        label: "Vercel (Recommended)",
        value: "Vercel",
        description: "Best Next.js hosting. Automatic deployments, edge network, analytics.",
      },
      {
        label: "Netlify",
        value: "Netlify",
        description: "Great for static sites and serverless functions.",
      },
      {
        label: "Railway",
        value: "Railway",
        description: "Simple container hosting with databases included.",
      },
      {
        label: "Self-hosted / Docker",
        value: "Self-hosted",
        description: "Maximum control, more operational overhead.",
      },
    ],
    default: "Vercel",
  },
  {
    key: "targetUser",
    type: "input",
    question: "Who is your target user? (1-2 sentences)",
    placeholder: "e.g., 'Busy professionals who want to organize their recipes and meal plans'",
    required: true,
    minLength: 20,
    maxLength: 300,
  },
  {
    key: "jobsToBeDone",
    type: "multiselect",
    question: "What are the top jobs-to-be-done?",
    description: "Select the main things users will accomplish with your app",
    required: true,
    minSelect: 2,
    maxSelect: 5,
    allowCustom: true,
    options: [
      { label: "Create and manage accounts", value: "Account management" },
      { label: "Browse and search content", value: "Content discovery" },
      { label: "Create and publish content", value: "Content creation" },
      { label: "Purchase products/services", value: "E-commerce transactions" },
      { label: "Track progress and metrics", value: "Progress tracking" },
      { label: "Collaborate with others", value: "Team collaboration" },
      { label: "Share with others", value: "Social sharing" },
      { label: "Receive notifications", value: "Notifications and alerts" },
    ],
  },
  {
    key: "successCriteria",
    type: "multiselect",
    question: "Success criteria - what MUST work?",
    description: "Select the features that are absolutely required for launch",
    required: true,
    minSelect: 3,
    maxSelect: 10,
    allowCustom: true,
    options: [
      { label: "User registration and login", value: "Users can register and log in" },
      { label: "Data persistence", value: "User data persists across sessions" },
      { label: "CRUD operations", value: "Create, read, update, delete operations work" },
      { label: "Search functionality", value: "Search returns relevant results" },
      { label: "Mobile responsiveness", value: "App works on mobile devices" },
      { label: "Fast load times (<3s)", value: "Pages load in under 3 seconds" },
      { label: "No critical errors", value: "No console errors in production" },
      { label: "Email notifications", value: "Email notifications send successfully" },
      { label: "Payment processing", value: "Payments complete successfully" },
      { label: "File uploads", value: "Files upload and display correctly" },
    ],
  },
  {
    key: "criticalPaths",
    type: "multiselect",
    question: "Critical user flows that MUST work?",
    description: "These are the journeys you'll validate at each checkpoint",
    required: true,
    minSelect: 2,
    maxSelect: 5,
    allowCustom: true,
    options: [
      { label: "Sign up → Verify → Login", value: "User registration flow" },
      { label: "Browse → Search → View detail", value: "Content discovery flow" },
      { label: "Create → Edit → Publish", value: "Content creation flow" },
      { label: "Add to cart → Checkout → Payment", value: "Purchase flow" },
      { label: "Invite → Accept → Collaborate", value: "Team collaboration flow" },
      { label: "Upload → Process → Share", value: "File sharing flow" },
    ],
  },
  {
    key: "nonGoals",
    type: "multiselect",
    question: "What's explicitly OUT OF SCOPE?",
    description: "Clarifying non-goals prevents scope creep",
    required: false,
    minSelect: 0,
    maxSelect: 10,
    allowCustom: true,
    options: [
      { label: "Mobile native app", value: "Native mobile app" },
      { label: "Offline support", value: "Offline functionality" },
      { label: "Multi-language support", value: "Internationalization (i18n)" },
      { label: "Multi-tenancy", value: "Multi-tenant architecture" },
      { label: "Advanced analytics", value: "Complex analytics dashboard" },
      { label: "Real-time features", value: "Real-time collaboration" },
      { label: "API for third parties", value: "Public API" },
      { label: "Admin panel", value: "Admin dashboard" },
    ],
  },
  {
    key: "timeline",
    type: "select",
    question: "What's your timeline?",
    required: true,
    options: [
      { label: "⚡ ASAP - Get something working", value: "asap" },
      { label: "📅 This week - MVP quality", value: "week" },
      { label: "🗓️ 2-4 weeks - Production ready", value: "month" },
      { label: "🎯 No rush - Quality over speed", value: "quality" },
    ],
    default: "week",
  },
];

// Architecture preview template
export function generateArchitecturePreview(answers: Record<string, unknown>): string {
  const frontend = answers["techStack.frontend"] as string;
  const backend = answers["techStack.backend"] as string;
  const auth = answers["techStack.auth"] as string;
  const hosting = answers["techStack.hosting"] as string;
  
  const isConvex = backend === "Convex";
  
  return `
┌─────────────────────────────────────────────────────────────┐
│                 ARCHITECTURE PREVIEW                        │
├─────────────────────────────────────────────────────────────┤

  Based on your answers, here's the planned architecture:

  📂 Project Structure:
  ├── src/
  │   ├── app/                 # ${frontend} pages (App Router)
  │   │   ├── (auth)/          # Authentication routes
  │   │   ├── (dashboard)/     # Protected routes  
  │   │   └── api/             # API routes (if needed)
  │   ├── components/          # React components
  │   │   ├── ui/              # Base UI components
  │   │   └── features/        # Feature-specific components
  │   └── lib/                 # Utilities and helpers
  ${isConvex ? `├── convex/                  # Convex backend
  │   ├── schema.ts            # Database schema
  │   ├── functions/           # Backend functions
  │   └── auth.config.ts       # Auth configuration` : `├── prisma/
  │   └── schema.prisma        # Database schema`}
  └── public/                  # Static assets

  🔧 Tech Stack:
  ├── Frontend: ${frontend}
  ├── Backend: ${backend}
  ├── Auth: ${auth}
  └── Hosting: ${hosting}

  📊 Estimated Phases: 4
  🔄 HITL Checkpoints: 4 (end of each phase)

  Key Decisions:
  ${isConvex ? `• Using Convex for real-time sync out of the box
  • Database schema will be defined in convex/schema.ts
  • Auth handled by Convex Auth with your chosen providers` : `• Traditional REST/GraphQL API approach
  • Database requires separate setup
  • Consider caching strategy for performance`}

└─────────────────────────────────────────────────────────────┘
`;
}
