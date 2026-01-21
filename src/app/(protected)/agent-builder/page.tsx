"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AgentList } from "@/components/features/agent-builder";
import type { Agent } from "@/lib/agent-builder/schema";

export default function AgentBuilderPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch("/api/agents");
      if (!response.ok) throw new Error("Failed to fetch agents");
      const data = await response.json();
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete agent");
    setAgents((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agent Builder</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage AI agents with custom tools and configurations
          </p>
        </div>
        <Link href="/agent-builder/new">
          <Button>Create Agent</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading agents...</div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : (
        <AgentList agents={agents} onDelete={handleDelete} />
      )}
    </div>
  );
}
