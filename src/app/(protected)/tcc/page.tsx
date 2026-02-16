import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { AgentStatusWidget } from "@/components/tcc/AgentStatusWidget";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Team Command Center | TCC",
  description: "Fleet agent monitoring and mission control dashboard",
};

export default async function TCCPage() {
  const { authenticated } = await requireAuth();

  if (!authenticated) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">
          Team Command Center
        </h1>
        <p className="mt-2 text-zinc-400">
          Real-time agent monitoring and fleet operations dashboard
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent Status Widget */}
        <div className="lg:col-span-2">
          <AgentStatusWidget />
        </div>

        {/* Placeholder for future widgets */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold mb-4">Task Queue</h2>
          <p className="text-sm text-zinc-500">Coming soon...</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold mb-4">Infrastructure Health</h2>
          <p className="text-sm text-zinc-500">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}
