"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PromptList } from "@/components/features/prompt-builder";
import type { Prompt } from "@/lib/prompt-builder";

export default function PromptBuilderPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPrompts = useCallback(async () => {
    try {
      const response = await fetch("/api/prompts");
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (error) {
      console.error("Failed to load prompts:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Prompt",
          userPrompt: "Enter your prompt here...",
        }),
      });

      const data = await response.json();
      if (data.prompt) {
        router.push(`/prompt-builder/${data.prompt.id}`);
      }
    } catch (error) {
      console.error("Failed to create prompt:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/prompts/${id}`, { method: "DELETE" });
      await loadPrompts();
    } catch (error) {
      console.error("Failed to delete prompt:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <PromptList
        prompts={prompts}
        onDelete={handleDelete}
        onCreate={handleCreate}
      />
    </div>
  );
}
