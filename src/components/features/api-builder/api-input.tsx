"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type InputMode = "description" | "model";

interface APIInputProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (value: string) => void;
  models: string[];
  basePath: string;
  onBasePathChange: (value: string) => void;
  isLoading?: boolean;
  onGenerate: () => void;
}

export function APIInput({
  mode,
  onModeChange,
  description,
  onDescriptionChange,
  selectedModel,
  onModelChange,
  models,
  basePath,
  onBasePathChange,
  isLoading,
  onGenerate,
}: APIInputProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-lg border p-1">
        <button
          type="button"
          onClick={() => onModeChange("description")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "description"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          From Description
        </button>
        <button
          type="button"
          onClick={() => onModeChange("model")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "model"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          From Prisma Model
        </button>
      </div>

      {mode === "description" ? (
        <div className="space-y-2">
          <Label htmlFor="description">API Description *</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe the API you want to generate... e.g., 'Create a CRUD API for managing blog posts with title, content, and author'"
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="model">Prisma Model *</Label>
          <select
            id="model"
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select a model...</option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Select an existing Prisma model to generate standard CRUD endpoints
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="basePath">Base Path (optional)</Label>
        <Input
          id="basePath"
          value={basePath}
          onChange={(e) => onBasePathChange(e.target.value)}
          placeholder="/api/resources"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to auto-generate from model/description
        </p>
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={onGenerate}
        disabled={isLoading || (mode === "description" ? !description : !selectedModel)}
      >
        {isLoading ? "Generating..." : "Generate API"}
      </Button>
    </div>
  );
}
