# Comparative Analysis: Archon vs. CCPLATE Guardian

## Overview

This report compares the **Archon** workflow (from the YouTube video) with the current **CCPLATE Guardian** implementation. While CCPLATE is architecturally similar and advanced in local orchestration, Archon offers key insights into **remote autonomy** and **native UX** that could be the next major evolution for CCPLATE.

---

## 1. Core Comparison Matrix

| Feature | Archon (Video) | CCPLATE Guardian | Gap / Opportunity |
|:---|:---|:---|:---|
| **Primary Interface** | GitHub Comments, Slack, Discord | CLI, Next.js Web Dashboard | **Remote Autonomy**: CCPLATE needs an "Adapter" layer for external triggers. |
| **Orchestration** | Sequential & Parallel Workflows | Team Coordinator Agent (Task tool) | **Artifact Chain**: Archon formalizes context passing between steps; CCPLATE uses shared memory. |
| **Isolation** | Remote Worktrees (moving to Docker/Cloud) | Local `.worktrees/` directory | **Cloud Scaling**: Moving isolation beyond the local machine. |
| **UX Strategy** | Native Terminal UI (**GPUI/Rust**) | Next.js App Router UI | **Native Speed**: A Rust-based TUI for real-time agent monitoring. |
| **Language** | Java (Archon Core) / TypeScript | Pure TypeScript | **Architecture**: Archon's hybrid model provides a robust "Backend" orchestrator. |

---

## 2. Key Findings & Implementation Strategies

### A. GitHub-Triggered workflows (The "GitHub Adapter")
**Finding:** Archon's "wow" factor comes from autonomous fix loops triggered by a simple comment: `@archon investigate and fix`.
- **Strategy:** Build a **Hono-based Webhook Listener** in CCPLATE.
- **Action:** Create `src/lib/guardian/adapters/github.ts` to process issue comments and invoke the `team-coordinator` agent automatically in an isolated worktree.

### B. Deterministic Artifact Chaining
**Finding:** Archon passes "artifacts" (deterministic output segments) from `investigate` → `synthesize` → `fix`.
- **Strategy:** Formalize agent outputs. Instead of just writing to the filesystem, agents should output structured `analysis.json` or `plan.md` "artifacts" that are explicitly injected into the NEXT agent in the sequence.
- **Action:** Update `team-coordinator.md` to manage artifact injection.

### C. Native Terminal UI (GPUI/Rust)
**Finding:** The "new Archon" (KPUI) uses `GPUI` for a premium, Zed-like terminal experience.
- **Strategy:** Move beyond the browser. A native Rust TUI provides lower latency and better integration with local terminal environments.
- **Action:** Propose **Phase 6: CCPLATE TUI** using Rust/GPUI to visualize Guardian state, logs, and worktree activity directly in the shell.

### D. Multi-Isolation Orchestrator
**Finding:** Archon's architecture separates the "Orchestrator" from the "Isolation Provider".
- **Strategy:** Abstract worktree management. CCPLATE should support switching from `git worktree` to `docker container` or `remote cloud vm` without changing the agent logic.
- **Action:** Refactor `WorktreeManager` into a generic `IsolationManager`.

### E. Sticky Worktree UX (Issue → PR)
**Finding:** Archon routes follow-up comments on a PR back to the same worktree used for the initial issue fix. This preserves the agent's context and development environment.
- **Strategy:** Worktree persistence. Ensure that CCPLATE's `workflow-state.json` links Issue IDs to PR IDs and their associated worktree paths.
- **Action:** Update the state schema to support `associated_entities` (e.g., `["issue#42", "pr#45"]`).

### F. Internal Workflow Visualization
**Finding:** The user in the video clones workflows/commands directly into the target repo for better visualization and debugging.
- **Strategy:** Transparency. Keep agent definitions and workflow scripts in the project root (e.g., `.claude/`) so both humans and agents can audit them easily.
- **Action:** Continue utilizing the `.claude/` directory for all agent/workflow definitions.

---

## 3. Recommended Implementation Plan (Phase 6)

### Phase 6: Remote Orchestration & Native UI (Goal: Parity with Archon)

- [ ] **Task 6.1: The GitHub Adapter**
  - Implement a Hono server to listen for GitHub webhooks.
  - Map `@guardian` comments to internal agent jobs.
  
- [ ] **Task 6.2: Artifact-Driven Workflows**
  - Define structured "Artifact" schema for agent handoffs.
  - Update `memory/workflow-state.json` to track artifact lineage.

- [ ] **Task 6.3: CCPLATE TUI (Exploratory)**
  - Initialize a Rust crate for a basic dashboard using `ratatui` or `GPUI`.
  - Stream `memory/guardian-nudges.jsonl` and `workflow-state.json` to the UI.

- [ ] **Task 6.4: Cloud Worktrees**
  - Research/Implement a basic Docker isolation provider for the `team-coordinator`.

---

## Conclusion

CCPLATE is currently a powerful **local** superpower. By adopting Archon's **remote-first** and **native-UI** philosophies, we can transform it into a truly autonomous, multi-platform coding workstation.
