"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { VariableEditor } from "./variable-editor";
import { TestPanel } from "./test-panel";
import { VersionHistory } from "./version-history";
import type { Prompt, PromptVariable } from "@/lib/prompt-builder";

interface PromptEditorProps {
  prompt: Prompt;
  onSave: (updates: PromptEditorUpdates) => Promise<void>;
  onRestore: (version: number) => Promise<void>;
}

export interface PromptEditorUpdates {
  name?: string;
  description?: string;
  category?: string;
  systemPrompt?: string;
  userPrompt?: string;
  variables?: PromptVariable[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  notes?: string;
}

export function PromptEditor({ prompt, onSave, onRestore }: PromptEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedVersionNum, setSelectedVersionNum] = useState(prompt.currentVersion);

  const currentVersionData = prompt.versions.find(
    (v) => v.version === prompt.currentVersion
  );
  const selectedVersionData = prompt.versions.find(
    (v) => v.version === selectedVersionNum
  );

  const [name, setName] = useState(prompt.name);
  const [description, setDescription] = useState(prompt.description || "");
  const [category, setCategory] = useState(prompt.category);
  const [systemPrompt, setSystemPrompt] = useState(currentVersionData?.systemPrompt || "");
  const [userPrompt, setUserPrompt] = useState(currentVersionData?.userPrompt || "");
  const [variables, setVariables] = useState<PromptVariable[]>(
    currentVersionData?.variables || []
  );
  const [model, setModel] = useState(currentVersionData?.model || "");
  const [temperature, setTemperature] = useState<string>(
    currentVersionData?.temperature?.toString() || ""
  );
  const [maxTokens, setMaxTokens] = useState<string>(
    currentVersionData?.maxTokens?.toString() || ""
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (selectedVersionData) {
      setSystemPrompt(selectedVersionData.systemPrompt || "");
      setUserPrompt(selectedVersionData.userPrompt || "");
      setVariables(selectedVersionData.variables || []);
      setModel(selectedVersionData.model || "");
      setTemperature(selectedVersionData.temperature?.toString() || "");
      setMaxTokens(selectedVersionData.maxTokens?.toString() || "");
    }
  }, [selectedVersionData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name,
        description: description || undefined,
        category,
        systemPrompt: systemPrompt || undefined,
        userPrompt,
        variables,
        model: model || undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        maxTokens: maxTokens ? parseInt(maxTokens) : undefined,
        notes: notes || undefined,
      });
      setNotes("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async (version: number) => {
    if (!confirm(`Restore to version ${version}? This will create a new version.`)) {
      return;
    }
    await onRestore(version);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/prompt-builder")}>
          ← Back
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !userPrompt}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Prompt"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="general"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this prompt do?"
              />
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="0.7"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="1"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  placeholder="1000"
                />
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userPrompt">User Prompt *</Label>
              <textarea
                id="userPrompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Use {{variableName}} for template variables..."
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
          </Card>

          <Card className="p-4">
            <VariableEditor variables={variables} onChange={setVariables} />
          </Card>

          <Card className="p-4 space-y-2">
            <Label htmlFor="notes">Version Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this version..."
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4">
            <TestPanel
              promptId={prompt.id}
              variables={variables}
              versionNumber={selectedVersionNum}
            />
          </Card>

          <Card className="p-4">
            <VersionHistory
              versions={prompt.versions}
              currentVersion={prompt.currentVersion}
              onSelectVersion={setSelectedVersionNum}
              onRestoreVersion={handleRestore}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
