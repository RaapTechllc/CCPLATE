"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SchemaInput,
  ModelPreview,
  SchemaDiff,
  ModelHistory,
  type GeneratedModel,
} from "@/components/features/schema-builder";

interface GenerateResponse {
  model: {
    name: string;
    tableName?: string;
    fields: unknown[];
    relations: unknown[];
    indexes: unknown[];
  };
  modelCode: string;
  diff: string;
  existingModels: string[];
  error?: string;
}

interface ApplyResponse {
  success: boolean;
  modelName: string;
  backupPath?: string;
  message: string;
  error?: string;
}

export default function SchemaBuilderPage() {
  const [modelCode, setModelCode] = useState<string | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [currentDescription, setCurrentDescription] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [history, setHistory] = useState<GeneratedModel[]>([]);

  const handleGenerate = useCallback(async (description: string) => {
    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);
    setCurrentDescription(description);

    try {
      const response = await fetch("/api/schema-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      const data: GenerateResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setModelCode(data.modelCode);
      setDiff(data.diff);

      const newHistoryItem: GeneratedModel = {
        id: crypto.randomUUID(),
        description,
        modelName: data.model.name,
        modelCode: data.modelCode,
        createdAt: new Date(),
        applied: false,
      };

      setHistory((prev) => [newHistoryItem, ...prev].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setModelCode(null);
      setDiff(null);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleApply = useCallback(async () => {
    if (!modelCode) return;

    setIsApplying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/schema-builder/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelCode, confirm: true }),
      });

      const data: ApplyResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Apply failed");
      }

      setSuccessMessage(data.message);

      setHistory((prev) =>
        prev.map((item) =>
          item.modelCode === modelCode ? { ...item, applied: true } : item
        )
      );

      setModelCode(null);
      setDiff(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setIsApplying(false);
    }
  }, [modelCode]);

  const handleSelectFromHistory = useCallback((model: GeneratedModel) => {
    setModelCode(model.modelCode);
    setCurrentDescription(model.description);
    setError(null);
    setSuccessMessage(null);
    setDiff(null);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Schema Builder</h1>
        <p className="mt-2 text-muted-foreground">
          Generate Prisma models from natural language descriptions
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-green-500 bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-700 dark:text-green-400">
          {successMessage}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Describe Your Model</CardTitle>
              <CardDescription>
                Tell us what model you need and we&apos;ll generate the Prisma schema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchemaInput onGenerate={handleGenerate} isLoading={isGenerating} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
              <CardDescription>
                Previously generated models in this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModelHistory history={history} onSelect={handleSelectFromHistory} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Model</CardTitle>
              <CardDescription>
                {currentDescription
                  ? `Model for: "${currentDescription.slice(0, 50)}${currentDescription.length > 50 ? "..." : ""}"`
                  : "Preview and apply the generated model"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModelPreview
                modelCode={modelCode}
                onApply={handleApply}
                isApplying={isApplying}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview Changes</CardTitle>
              <CardDescription>
                See what will be added to your schema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchemaDiff diff={diff} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
