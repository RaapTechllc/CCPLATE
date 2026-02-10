# Project Architecture

> Claude updates this file after architectural decisions. Human review encouraged.

## Overview

**Project:** CCPLATE
**Purpose:** SaaS Boilerplate with AI-powered developer tooling — get 50% of the way on any project instantly, then use built-in builders (hooks, agents, prompts) to accelerate feature development.
**Status:** Foundation Complete → Building Developer Tooling

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 16 + React | Server components, App Router, Turbopack |
| Backend | Convex | Real-time, type-safe, built-in auth |
| Database | Convex (primary) | Real-time sync, automatic caching |
| ORM | Prisma (legacy) | Retained for file storage & NextAuth models |
| Styling | Tailwind CSS | Utility-first, fast development |
| Auth | Convex Auth | OAuth (GitHub, Google) + Email/Password |
| AI | OpenAI + Anthropic | Dual provider with effort levels & thinking |
| Hosting | Vercel | Optimized for Next.js, serverless |
| Monitoring | Sentry | Error tracking, performance monitoring |

## Design Decisions

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2026-01-20 | Next.js with App Router | Modern React patterns, server components | Pages Router, Remix |
| 2026-01-20 | Convex for data layer | Real-time sync, type-safe, built-in auth | Prisma + PostgreSQL |
| 2026-02-10 | Dual AI provider (OpenAI + Anthropic) | Flexibility, model-specific strengths | Single provider |
| 2026-02-10 | Effort levels in AI config | Opus 4.6 adaptive thinking, cost control | Fixed temperature |

## Constraints

> Hard limits that affect all decisions.

- [Add constraints as discovered]

## Dependencies

> External services, APIs, packages that the project relies on.

### Critical (App won't work without)

- **Convex** - Real-time backend, authentication, primary data layer
- **Next.js 16** - Frontend framework, server components, API routes

### Important (Core features need)

- **OpenAI SDK** - AI-powered builders (hook, component, schema, etc.)
- **Anthropic SDK** - Alternative AI provider with extended thinking
- **Zod** - Input validation and schema definition
- **Sentry** - Error monitoring and performance tracking

### Legacy (Migration path to Convex-only)

- **Prisma** - File storage models, NextAuth models (being migrated to Convex)
- **PostgreSQL** - Retained for Prisma-backed features only

### Nice-to-have (Enhanced functionality)

- **Resend** - Transactional emails (password reset, verification)
- **Playwright** - E2E testing and validation harness

## Data Flow

> How data moves through the system.

```
User → Next.js Frontend → Convex (real-time queries/mutations)
                        → API Routes → AI Providers (OpenAI/Anthropic)
                        → Prisma → PostgreSQL (file storage only)
```

### Data Layer Audit (2026-02-10)

| Feature | Data Layer | Notes |
|---------|-----------|-------|
| Users | **Convex** | Auth, profiles, roles |
| AI Builders | **Convex** | Feature builder metrics, generations |
| User API routes | **Convex** | `/api/users/[id]`, `/api/users/me` |
| File Storage | **Prisma** | Upload tracking, S3/R2 metadata |
| System Settings | **Prisma** | Admin configuration |
| Auth Sessions | **Convex Auth** | OAuth + Email/Password |

**Migration Path:** Convex is the primary data layer. Prisma is retained
only for file storage and system settings. Long-term, these should migrate
to Convex for a unified data layer.

## Security Considerations

- [x] Authentication method decided (NextAuth.js v4 with credentials + OAuth)
- [x] Authorization model defined (role-based: user/admin)
- [x] Secrets management approach (environment variables via `.env.local`)
- [x] Input validation strategy (Zod schemas on all API endpoints)
- [x] CSP headers configured (baseline policy in `next.config.ts`); CORS TBD

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page Load | <2s | [measure] |
| API Response | <200ms | [measure] |
| Database Query | <50ms | [measure] |

## Scaling Strategy

**Current capacity:** [estimate]
**Scaling trigger:** [when to scale]
**Scaling approach:** [horizontal/vertical/both]

## Product Vision

### What CCPLATE Provides Out-of-the-Box

1. **Authentication** — Login, register, OAuth, password reset, email verification
2. **User Management** — Profile, settings, role-based access
3. **Admin Panel** — User management, system settings, stats dashboard
4. **File Storage** — Upload, manage, serve files (local/S3/R2)
5. **API Layer** — REST endpoints with rate limiting, validation
6. **UI Components** — Reusable component library

### AI-Powered Developer Tooling (To Build)

| Tool | Purpose |
|------|---------|
| **Hook Builder** | Generate React hooks from natural language descriptions |
| **Agent Builder** | Create AI agents with specific skills/tools |
| **Prompt Builder** | Design, test, and version prompts |
| **Schema Builder** | Generate Prisma models from descriptions |
| **API Builder** | Scaffold CRUD endpoints from schema |
| **Component Builder** | Generate UI components from descriptions |

### Developer Workflow Vision

```
Developer describes feature in natural language
         ↓
   AI Builder generates:
   - Prisma schema changes
   - API routes
   - React hooks
   - UI components
   - Tests
         ↓
   Developer reviews & refines
         ↓
   Feature deployed
```

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Developer Tools                       │
│  Hook Builder │ Agent Builder │ Prompt Builder │ etc.   │
├─────────────────────────────────────────────────────────┤
│                    Application Layer                     │
│  Pages │ Components │ Hooks │ API Routes                │
├─────────────────────────────────────────────────────────┤
│                    Service Layer                         │
│  Auth (Convex) │ AI (OpenAI/Anthropic) │ Files │ Admin  │
├─────────────────────────────────────────────────────────┤
│                    Data Layer                            │
│  Convex (primary) │ Prisma/PostgreSQL (legacy/files)    │
├─────────────────────────────────────────────────────────┤
│                    Infrastructure                        │
│  Vercel │ Sentry │ Structured Logging │ Rate Limiting   │
└─────────────────────────────────────────────────────────┘
```

## Future Considerations

> Things we're not doing now but might need later.

- Multi-tenancy / Organizations
- Subscription billing (Stripe)
- Webhook system
- Plugin architecture for custom builders
- CLI tool for scaffolding new projects from CCPLATE

---

**Last Updated:** 2026-02-10
**Review Cadence:** After each major feature
