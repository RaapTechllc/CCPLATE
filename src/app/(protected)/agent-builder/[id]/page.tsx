"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { AgentEditor } from "@/components/features/agent-builder";
import type { Agent, CreateAgentInput } from "@/lib/agent-builder/schema";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAgentPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgent() {
      try {
        const response = await fetch(`/api/agents/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            router.push("/agent-builder");
            return;
          }
          throw new Error("Failed to fetch agent");
        }
        const data = await response.json();
        setAgent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agent");
      } finally {
        setLoading(false);
      }
    }

    fetchAgent();
  }, [id, router]);

  const handleSave = async (data: CreateAgentInput): Promise<Agent> => {
    const response = await fetch(`/api/agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update agent");
    }

    const updated = await response.json();
    setAgent(updated);
    return updated;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">Loading agent...</div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12 text-destructive">
          {error || "Agent not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Agent</h1>
        <p className="text-muted-foreground mt-1">
          Update your agent&apos;s configuration and test it
        </p>
      </div>
      <AgentEditor agent={agent} onSave={handleSave} />
    </div>
  );
}
