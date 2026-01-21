"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToolSelector } from "./tool-selector";
import { ToolEditor } from "./tool-editor";
import { AgentChat } from "./agent-chat";
import type { Agent, Tool, CreateAgentInput } from "@/lib/agent-builder/schema";

interface AgentEditorProps {
  agent?: Agent;
  onSave: (data: CreateAgentInput) => Promise<Agent>;
}

export function AgentEditor({ agent, onSave }: AgentEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(agent?.name || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [systemPrompt, setSystemPrompt] = useState(
    agent?.systemPrompt || "You are a helpful AI assistant."
  );
  const [model, setModel] = useState(agent?.model || "");
  const [temperature, setTemperature] = useState(agent?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState<number | undefined>(agent?.maxTokens);
  const [maxIterations, setMaxIterations] = useState(agent?.maxIterations ?? 10);
  const [tools, setTools] = useState<Tool[]>(agent?.tools || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) {
      setError("Name and system prompt are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data: CreateAgentInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim(),
        model: model.trim() || undefined,
        temperature,
        maxTokens,
        maxIterations,
        tools,
      };

      const saved = await onSave(data);
      router.push(`/agent-builder/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My AI Agent"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this agent do?"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Prompt *</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful AI assistant that..."
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="model">Model (optional)</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Leave empty for default"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Temperature: {temperature.toFixed(1)}
                </Label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens (optional)</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={maxTokens ?? ""}
                  onChange={(e) =>
                    setMaxTokens(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="Leave empty for default"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxIterations">Max Iterations</Label>
                <Input
                  id="maxIterations"
                  type="number"
                  min="1"
                  max="100"
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(parseInt(e.target.value) || 10)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ToolSelector
              selectedTools={tools.filter((t) => t.handler.startsWith("builtIn:"))}
              onChange={(builtIn) => {
                const custom = tools.filter((t) => !t.handler.startsWith("builtIn:"));
                setTools([...builtIn, ...custom]);
              }}
            />
            <ToolEditor
              tools={tools}
              onChange={setTools}
            />
          </CardContent>
        </Card>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <Button type="submit" loading={saving}>
            {agent ? "Save Changes" : "Create Agent"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/agent-builder")}
          >
            Cancel
          </Button>
        </div>
      </form>

      <div className="lg:sticky lg:top-20 lg:self-start">
        {agent ? (
          <AgentChat agentId={agent.id} agentName={agent.name} />
        ) : (
          <Card className="h-[600px] flex items-center justify-center">
            <p className="text-muted-foreground">
              Save the agent to enable the test chat
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
