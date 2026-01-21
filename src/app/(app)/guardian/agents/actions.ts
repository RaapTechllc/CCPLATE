"use server";

import { promises as fs } from "fs";
import path from "path";

export interface AgentDefinition {
  name: string;
  description: string;
  tools: string[];
  model: string;
  role?: string;
  expertise?: string[];
  filePath: string;
}

export interface WorktreeAssignment {
  worktreeName: string;
  branch: string;
  status: string;
  assignedAgent?: string;
}

export interface AgentActivity {
  agentName: string;
  status: "active" | "idle";
  assignedWorktree?: WorktreeAssignment;
  lastActivity?: string;
  consultationCount?: number;
}

interface WorkflowState {
  session_id: string | null;
  current_prp_step: number;
  total_prp_steps: number;
  files_changed: number;
  last_commit_time: string | null;
  last_test_time: string | null;
  context_pressure: number;
  active_worktrees: Array<{
    name: string;
    branch: string;
    status: string;
    assigned_agent?: string;
  }>;
  pending_nudges: string[];
  errors_detected: string[];
  lsp_diagnostics_count: number;
}

interface ContextLedger {
  session_id: string | null;
  consultations: Array<{
    timestamp: string;
    query: string;
    agent?: string;
  }>;
  total_sources_checked: number;
  total_excerpts_returned: number;
}

function parseFrontmatter(content: string): Record<string, string | string[]> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};

  const frontmatter: Record<string, string | string[]> = {};
  const lines = frontmatterMatch[1].split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (key === "tools") {
      frontmatter[key] = value.split(",").map((t) => t.trim());
    } else {
      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

function extractRole(content: string): string | undefined {
  const roleMatch = content.match(/## Role\s*\n\n([\s\S]*?)(?=\n##|\n$)/);
  if (roleMatch) {
    return roleMatch[1].trim().split("\n")[0];
  }
  return undefined;
}

function extractExpertise(content: string): string[] {
  const expertiseMatch = content.match(/## Expertise\s*\n\n([\s\S]*?)(?=\n##|\n$)/);
  if (expertiseMatch) {
    const items = expertiseMatch[1].match(/^- (.+)$/gm);
    if (items) {
      return items.map((item) => item.replace(/^- /, "").trim());
    }
  }
  return [];
}

export async function getAgentsList(): Promise<AgentDefinition[]> {
  const agentsDir = path.join(process.cwd(), ".claude", "agents");

  try {
    const files = await fs.readdir(agentsDir);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    const agents: AgentDefinition[] = [];

    for (const file of mdFiles) {
      const filePath = path.join(agentsDir, file);
      const content = await fs.readFile(filePath, "utf-8");
      const frontmatter = parseFrontmatter(content);

      if (frontmatter.name) {
        agents.push({
          name: frontmatter.name as string,
          description: frontmatter.description as string,
          tools: (frontmatter.tools as string[]) || [],
          model: (frontmatter.model as string) || "sonnet",
          role: extractRole(content),
          expertise: extractExpertise(content),
          filePath: `.claude/agents/${file}`,
        });
      }
    }

    const defaultAgents = [
      { name: "implementer", description: "Generic code implementation agent" },
      { name: "tester", description: "Generic testing agent" },
      { name: "reviewer", description: "Generic code review agent" },
    ];

    for (const def of defaultAgents) {
      if (!agents.find((a) => a.name === def.name)) {
        agents.push({
          name: def.name,
          description: def.description,
          tools: ["Read", "Write", "Bash"],
          model: "sonnet",
          filePath: "",
        });
      }
    }

    return agents;
  } catch {
    return [
      {
        name: "team-coordinator",
        description: "Orchestrates parallel development work",
        tools: ["Read", "Bash", "Task", "Glob", "Grep"],
        model: "sonnet",
        filePath: "",
      },
      {
        name: "rlm-adapter",
        description: "Infinite context navigator for large codebases",
        tools: ["Read", "Grep", "Glob", "Bash", "Task"],
        model: "sonnet",
        filePath: "",
      },
      {
        name: "implementer",
        description: "Generic code implementation agent",
        tools: ["Read", "Write", "Bash"],
        model: "sonnet",
        filePath: "",
      },
      {
        name: "tester",
        description: "Generic testing agent",
        tools: ["Read", "Write", "Bash"],
        model: "sonnet",
        filePath: "",
      },
      {
        name: "reviewer",
        description: "Generic code review agent",
        tools: ["Read", "Grep", "Glob"],
        model: "sonnet",
        filePath: "",
      },
    ];
  }
}

export async function getAgentActivity(agentName: string): Promise<AgentActivity> {
  const workflowStatePath = path.join(process.cwd(), "memory", "workflow-state.json");
  const contextLedgerPath = path.join(process.cwd(), "memory", "context-ledger.json");

  let workflowState: WorkflowState | null = null;
  let contextLedger: ContextLedger | null = null;

  try {
    const wsContent = await fs.readFile(workflowStatePath, "utf-8");
    workflowState = JSON.parse(wsContent);
  } catch {
    workflowState = null;
  }

  try {
    const clContent = await fs.readFile(contextLedgerPath, "utf-8");
    contextLedger = JSON.parse(clContent);
  } catch {
    contextLedger = null;
  }

  const activity: AgentActivity = {
    agentName,
    status: "idle",
  };

  if (workflowState?.active_worktrees) {
    const assignment = workflowState.active_worktrees.find(
      (wt) => wt.assigned_agent === agentName
    );
    if (assignment) {
      activity.status = "active";
      activity.assignedWorktree = {
        worktreeName: assignment.name,
        branch: assignment.branch,
        status: assignment.status,
        assignedAgent: assignment.assigned_agent,
      };
    }
  }

  if (contextLedger?.consultations && agentName === "rlm-adapter") {
    activity.consultationCount = contextLedger.consultations.length;
    if (contextLedger.consultations.length > 0) {
      const lastConsultation =
        contextLedger.consultations[contextLedger.consultations.length - 1];
      activity.lastActivity = lastConsultation.timestamp;
    }
  }

  return activity;
}

export async function getAllAgentActivities(): Promise<AgentActivity[]> {
  const agents = await getAgentsList();
  const activities: AgentActivity[] = [];

  for (const agent of agents) {
    const activity = await getAgentActivity(agent.name);
    activities.push(activity);
  }

  return activities;
}
