# Agent Orchestration

## Available Agents

Located in `.claude/agents/`:

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **meta-agent** | Creates new specialized agents | Recurring task patterns |
| **rlm-adapter** | Context-aware exploration | Large codebases, >20k tokens |
| **team-coordinator** | Multi-worktree orchestration | Parallel work |
| **merge-resolver** | Auto-resolve git conflicts | Merge failures |
| **code-reviewer** | Code quality review | After writing code |
| **security-reviewer** | Security analysis | Before commits with auth/input |
| **tdd-guide** | Test-driven development | New features, bug fixes |
| **build-error-resolver** | Fix build errors | When build/tsc fails |
| **refactor-cleaner** | Dead code cleanup | Code maintenance |

## Immediate Agent Usage

No user prompt needed:
1. Complex feature requests → Use **planner** agent
2. Code just written/modified → Use **code-reviewer** agent
3. Bug fix or new feature → Use **tdd-guide** agent
4. Build failing → Use **build-error-resolver** agent
5. Security-sensitive code → Use **security-reviewer** agent

## Parallel Task Execution

ALWAYS use parallel Task execution for independent operations:

```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth.ts
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utils.ts

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## CCPLATE-Specific Agents

### meta-agent
Creates new specialized subagents when recurring task patterns emerge.

### rlm-adapter
Context-aware exploration using the context ledger. Use when:
- Exploring unfamiliar code
- Answering "where is X" questions
- Context would exceed 20k tokens

### team-coordinator
Orchestrates work across multiple worktrees:
- Decomposes tasks into independent chunks
- Assigns work to worktrees
- Coordinates merge back to main

### merge-resolver
Auto-resolves simple git merge conflicts:
- Analyzes conflicted files
- Attempts automatic resolution
- Escalates complex conflicts to HITL

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:
- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker
