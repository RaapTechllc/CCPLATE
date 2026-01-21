"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { PromptEditor, type PromptEditorUpdates } from "@/components/features/prompt-builder";
import type { Prompt } from "@/lib/prompt-builder";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PromptEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrompt = useCallback(async () => {
    try {
      const response = await fetch(`/api/prompts/${id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load prompt");
        return;
      }

      setPrompt(data.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prompt");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPrompt();
  }, [loadPrompt]);

  const handleSave = async (updates: PromptEditorUpdates) => {
    const response = await fetch(`/api/prompts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to save prompt");
    }

    setPrompt(data.prompt);
  };

  const handleRestore = async (version: number) => {
    const response = await fetch(`/api/prompts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restoreVersion: version }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to restore version");
    }

    setPrompt(data.prompt);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-24 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            {error || "Prompt not found"}
          </h1>
          <button
            onClick={() => router.push("/prompt-builder")}
            className="text-primary hover:underline"
          >
            ← Back to prompts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <PromptEditor
        prompt={prompt}
        onSave={handleSave}
        onRestore={handleRestore}
      />
    </div>
  );
}
