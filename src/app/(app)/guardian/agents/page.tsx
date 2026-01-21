import { Metadata } from "next";
import { getAgentsList, getAllAgentActivities } from "./actions";
import { AgentCard } from "@/components/features/guardian/agent-card";

export const metadata: Metadata = {
  title: "Agents | Guardian | CCPLATE",
  description: "Monitor CCPLATE Guardian agents and their activity",
};

export default async function AgentsPage() {
  const [agents, activities] = await Promise.all([
    getAgentsList(),
    getAllAgentActivities(),
  ]);

  const activityMap = new Map(activities.map((a) => [a.agentName, a]));
  const activeCount = activities.filter((a) => a.status === "active").length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Agent Activity
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Monitor the status and activity of all CCPLATE Guardian agents.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatsCard label="Total Agents" value={agents.length} />
        <StatsCard
          label="Active"
          value={activeCount}
          variant={activeCount > 0 ? "success" : "default"}
        />
        <StatsCard
          label="Idle"
          value={agents.length - activeCount}
          variant="muted"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.name}
            agent={agent}
            activity={activityMap.get(agent.name)}
          />
        ))}
      </div>

      {agents.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">
            No agents found. Add agent definitions to{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">
              .claude/agents/
            </code>
          </p>
        </div>
      )}
    </div>
  );
}

function StatsCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "success" | "muted";
}) {
  const valueColors = {
    default: "text-zinc-900 dark:text-zinc-100",
    success: "text-green-600 dark:text-green-400",
    muted: "text-zinc-500 dark:text-zinc-400",
  };

  return (
    <div className="rounded-lg border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${valueColors[variant]}`}>
        {value}
      </p>
    </div>
  );
}
