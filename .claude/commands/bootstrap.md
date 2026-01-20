---
description: Initialize Claude Code infrastructure for this project. Run this first.
---

# Project Bootstrap

Execute these steps in order:

## Step 1: Detect Project Type

Run the detection command first:

```bash
# Check for git history
GIT_COMMITS=$(git rev-list --count HEAD 2>/dev/null || echo "0")

# Check for source files
SOURCE_FILES=$(find . -maxdepth 3 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/venv/*" ! -path "*/__pycache__/*" 2>/dev/null | head -5)

# Check for package files
PACKAGE_FILES=$(ls package.json requirements.txt Cargo.toml go.mod pom.xml pyproject.toml 2>/dev/null | head -1)
```

**Decision Logic:**
- If GIT_COMMITS > 0 OR SOURCE_FILES exist OR PACKAGE_FILES exist → **BROWNFIELD**
- Otherwise → **GREENFIELD**

## Step 2A: Greenfield Setup

If this is a new project:

1. Initialize git: `git init`
2. Ask user: "What tech stack do you want? (e.g., Next.js + TypeScript, Python + FastAPI)"
3. Based on answer, update CLAUDE.md:
   - Fill in Tech Stack section
   - Set appropriate Commands (build, test, lint, dev)
4. Create initial folder structure based on stack
5. Create appropriate package.json / requirements.txt / etc.
6. Commit: `git add -A && git commit -m "chore: initial project setup with Claude Code bootstrap"`

## Step 2B: Brownfield Setup

If this is an existing project:

1. **DO NOT** modify existing configuration files
2. Analyze the codebase:
   - Detect tech stack from package files and imports
   - Identify existing folder structure patterns
   - Find test and build commands from scripts
3. Update CLAUDE.md:
   - Fill Tech Stack section with detected values
   - Fill Commands section with discovered scripts
   - Document existing patterns in Architecture section
4. Update PLANNING.md:
   - Document current architecture
   - Note any technical debt observed
5. Commit: `git add .claude/ CLAUDE.md PLANNING.md TASK.md && git commit -m "chore: add Claude Code bootstrap to existing project"`

## Step 3: Verify Setup

Run these checks:

```bash
# Verify core files exist
ls -la CLAUDE.md PLANNING.md TASK.md

# Verify .claude folder
ls -la .claude/

# Verify git is initialized
git status
```

## Step 4: Report Status

Tell the user:

1. Project type detected (greenfield/brownfield)
2. Tech stack identified or chosen
3. Commands configured
4. What to do next: "Run `/project:phase2-setup` when ready for damage control hooks (requires Bun)"

## Notes

- Phase 1 is complete after this command
- Phase 2 adds TypeScript hooks for additional safety
- Phase 2 requires Bun runtime to be installed
- Memory/learning system is active from Phase 1
