---
description: Detect if this is a greenfield (new) or brownfield (existing) project
---

# Project Detection

Run this sequence to determine project type:

## Signal 1: Git History

```bash
git rev-list --count HEAD 2>/dev/null || echo "0"
```

- **0 commits** = Greenfield signal
- **1+ commits** = Brownfield signal

## Signal 2: Source Files

```bash
find . -maxdepth 3 -type f \( \
  -name "*.ts" -o \
  -name "*.tsx" -o \
  -name "*.js" -o \
  -name "*.jsx" -o \
  -name "*.py" -o \
  -name "*.go" -o \
  -name "*.rs" -o \
  -name "*.java" -o \
  -name "*.rb" -o \
  -name "*.php" -o \
  -name "*.swift" -o \
  -name "*.kt" \
\) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/venv/*" ! -path "*/__pycache__/*" ! -path "*/dist/*" ! -path "*/build/*" 2>/dev/null | wc -l
```

- **0 files** = Greenfield signal
- **1+ files** = Brownfield signal

## Signal 3: Package Configuration

```bash
ls -la package.json requirements.txt Cargo.toml go.mod pom.xml pyproject.toml composer.json Gemfile build.gradle 2>/dev/null
```

- **No files** = Greenfield signal
- **1+ files** = Brownfield signal

## Decision Matrix

| Git | Source | Package | Result |
|-----|--------|---------|--------|
| 0 | 0 | No | **GREENFIELD** |
| Any | Any | Any | **BROWNFIELD** (if any signal is positive) |

## Report Format

After detection, report:

```
PROJECT DETECTION RESULTS
========================
Git History: [X commits found / No git history]
Source Files: [X files found / No source files]
Package Config: [Found: package.json, etc. / No package files]

VERDICT: [GREENFIELD / BROWNFIELD]

Detected Stack: [TypeScript/Python/Go/etc. or "None detected"]
Detected Framework: [Next.js/FastAPI/etc. or "None detected"]
```

## Next Steps

**If GREENFIELD:**
- Proceed with `/project:bootstrap` 
- Will ask for tech stack preferences

**If BROWNFIELD:**
- Proceed with `/project:bootstrap`
- Will analyze and document existing patterns
- Will NOT modify existing config files
