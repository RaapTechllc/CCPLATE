"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentDefinition, AgentActivity } from "@/app/(app)/guardian/agents/actions";

interface AgentCardProps {
  agent: AgentDefinition;
  activity?: AgentActivity;
  className?: string;
}

const agentIcons: Record<string, string> = {
  "team-coordinator": "👥",
  "rlm-adapter": "🔍",
  "meta-agent": "🤖",
  implementer: "⚙️",
  tester: "🧪",
  reviewer: "📋",
};

const modelColors: Record<string, string> = {
  haiku: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  sonnet: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  opus: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export function AgentCard({ agent, activity, className }: AgentCardProps) {
  const icon = agentIcons[agent.name] || "🤖";
  const isActive = activity?.status === "active";
  const modelColor = modelColors[agent.model] || modelColors.sonnet;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all hover:shadow-md",
        isActive && "ring-2 ring-green-500 dark:ring-green-400",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-2xl dark:bg-zinc-800">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                  modelColor
                )}
              >
                {agent.model}
              </span>
            </div>
          </div>
          <StatusIndicator status={activity?.status || "idle"} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {agent.description}
        </p>

        {agent.role && (
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            <span className="font-medium">Role:</span> {agent.role}
          </p>
        )}

        {agent.tools.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.tools.slice(0, 5).map((tool) => (
              <span
                key={tool}
                className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {tool}
              </span>
            ))}
            {agent.tools.length > 5 && (
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                +{agent.tools.length - 5}
              </span>
            )}
          </div>
        )}

        {activity?.assignedWorktree && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-xs font-medium text-green-800 dark:text-green-200">
              Active in worktree
            </p>
            <p className="mt-1 font-mono text-sm text-green-700 dark:text-green-300">
              {activity.assignedWorktree.worktreeName}
            </p>
            <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
              Branch: {activity.assignedWorktree.branch}
            </p>
          </div>
        )}

        {activity?.consultationCount !== undefined && activity.consultationCount > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              Consultations
            </span>
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {activity.consultationCount}
            </span>
          </div>
        )}

        {activity?.lastActivity && (
          <p className="text-xs text-zinc-500">
            Last active: {new Date(activity.lastActivity).toLocaleString()}
          </p>
        )}

        {agent.filePath && (
          <a
            href={`vscode://file/${agent.filePath}`}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            View Definition →
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIndicator({ status }: { status: "active" | "idle" }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          status === "active"
            ? "animate-pulse bg-green-500"
            : "bg-zinc-300 dark:bg-zinc-600"
        )}
      />
      <span
        className={cn(
          "text-xs font-medium",
          status === "active"
            ? "text-green-600 dark:text-green-400"
            : "text-zinc-500 dark:text-zinc-400"
        )}
      >
        {status === "active" ? "Active" : "Idle"}
      </span>
    </div>
  );
}
