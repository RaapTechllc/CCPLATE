# Project Architecture

> Claude updates this file after architectural decisions. Human review encouraged.

## Overview

**Project:** CCPLATE
**Purpose:** SaaS Boilerplate with AI-powered developer tooling — get 50% of the way on any project instantly, then use built-in builders (hooks, agents, prompts) to accelerate feature development.
**Status:** Foundation Complete → Building Developer Tooling

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14 + React | Server components, App Router, strong ecosystem |
| Backend | Next.js API Routes | Unified codebase, serverless-ready |
| Database | PostgreSQL | Robust relational database, great for structured data |
| ORM | Prisma | Type-safe queries, migrations, excellent DX |
| Styling | Tailwind CSS | Utility-first, fast development |
| Auth | TBD | To be decided based on requirements |
| Hosting | Vercel | Optimized for Next.js, easy deployment |

## Design Decisions

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2026-01-20 | Next.js 14 with App Router | Modern React patterns, server components | Pages Router, Remix, plain React |
| 2026-01-20 | PostgreSQL for database | Robust, scalable, well-supported | MongoDB, SQLite |
| 2026-01-20 | Prisma as ORM | Type safety, great migrations, DX | Drizzle, TypeORM, raw SQL |
| 2026-01-20 | Tailwind CSS | Fast styling, consistent design | CSS Modules, styled-components |

## Constraints

> Hard limits that affect all decisions.

- [Add constraints as discovered]

## Dependencies

> External services, APIs, packages that the project relies on.

### Critical (App won't work without)

- [None documented yet]

### Important (Core features need)

- [None documented yet]

### Nice-to-have (Enhanced functionality)

- [None documented yet]

## Data Flow

> How data moves through the system.

```
[To be documented after architecture is established]

Example:
User → Frontend → API → Database
                    ↓
              External Services
```

## Security Considerations

- [ ] Authentication method decided
- [ ] Authorization model defined
- [ ] Secrets management approach
- [ ] Input validation strategy
- [ ] CORS/CSP policies

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
│  Auth │ Files │ Admin │ AI Agents                       │
├─────────────────────────────────────────────────────────┤
│                    Data Layer                            │
│  Prisma │ PostgreSQL │ File Storage                     │
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

**Last Updated:** 2026-01-21
**Review Cadence:** After each major feature
