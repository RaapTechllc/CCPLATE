"use client";

import { AgentEditor } from "@/components/features/agent-builder";
import type { CreateAgentInput, Agent } from "@/lib/agent-builder/schema";

export default function NewAgentPage() {
  const handleSave = async (data: CreateAgentInput): Promise<Agent> => {
    const response = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create agent");
    }

    return response.json();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Agent</h1>
        <p className="text-muted-foreground mt-1">
          Configure your AI agent with a system prompt and tools
        </p>
      </div>
      <AgentEditor onSave={handleSave} />
    </div>
  );
}
