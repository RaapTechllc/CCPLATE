"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Agent } from "@/lib/agent-builder/schema";

interface AgentListProps {
  agents: Agent[];
  onDelete: (id: string) => Promise<void>;
}

export function AgentList({ agents, onDelete }: AgentListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
    }
  };

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">No agents created yet.</p>
          <Link href="/agent-builder/new">
            <Button>Create Your First Agent</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <Card key={agent.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            {agent.description && (
              <CardDescription className="line-clamp-2">
                {agent.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Model: {agent.model || "default"}</p>
              <p>Tools: {agent.tools.length}</p>
              <p>Max iterations: {agent.maxIterations}</p>
            </div>
          </CardContent>
          <div className="p-4 pt-0 flex gap-2">
            <Link href={`/agent-builder/${agent.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                Edit
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(agent.id)}
              loading={deleting === agent.id}
            >
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
