# Project: CCPLATE

> Next.js + TypeScript web application with PostgreSQL database.

## Bootstrap Instructions

This is a bootstrapped Claude Code project. On first run:

1. **Detect project type** - Run `/project:detect` to determine greenfield vs brownfield
2. **Analyze existing code** (if brownfield) - Document patterns before making changes
3. **Initialize structure** (if greenfield) - Ask about tech stack, then scaffold
4. **Update this file** - Replace placeholders with discovered/chosen values
5. **Create subagents** - When specialized work emerges, use meta-agent to create them

## Commands

- **Build:** `npm run build`
- **Test:** `npm test`
- **Lint:** `npm run lint`
- **Dev:** `npm run dev`
- **Deploy:** `vercel` (or platform of choice)

## Tech Stack

- **Language:** TypeScript
- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL
- **ORM:** Prisma (recommended)
- **Styling:** Tailwind CSS
- **Hosting:** Vercel (recommended)

## Code Style

- Follow existing patterns if brownfield project
- Use strict typing (TypeScript strict mode, Python type hints, etc.)
- Prefer explicit over implicit
- Max 300 lines per file
- One logical change per commit

## Naming Conventions

- **Files:** `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- **Functions:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Types/Interfaces:** `PascalCase`

## Memory Protocol

**After completing each task:**

1. Update PLANNING.md with any architectural decisions made
2. Update TASK.md - mark completed, add new discoveries
3. Add any gotchas to the "Warnings" section below
4. If an error pattern emerges, document in `memory/learnings.md`

**Before starting new work:**

1. Check TASK.md for current priorities
2. Review recent entries in PLANNING.md for context
3. Check Warnings section for known issues

## Three-Attempt Rule

If the same error occurs 3 times:

1. **STOP** - Do not attempt a 4th time
2. **Document** - Add error pattern to Warnings section
3. **Ask** - Request user guidance before proceeding

## Git Workflow

- **NEVER** use `--no-verify` without explicit user approval
- **NEVER** force push to main/master
- Commit messages: `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Create feature branches for non-trivial changes

## Warnings

> Claude: Add discovered issues here as you encounter them.

- [No warnings yet - add as discovered]

## Architecture

### Folder Structure

```
CCPLATE/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   └── api/          # API routes
│   ├── components/       # React components
│   │   ├── ui/           # Reusable UI components
│   │   └── features/     # Feature-specific components
│   ├── lib/              # Utility functions and configs
│   └── types/            # TypeScript type definitions
├── prisma/
│   └── schema.prisma     # Database schema
├── public/               # Static assets
└── tests/                # Test files
```

### Key Patterns

- App Router with server components by default
- Client components marked with "use client" when needed
- API routes in `src/app/api/` for backend logic
- Prisma for type-safe database access

### Integration Points

- PostgreSQL database via Prisma ORM
- Environment variables in `.env.local`

---

**Last Updated:** 2026-01-20
**Bootstrap Version:** 1.0
