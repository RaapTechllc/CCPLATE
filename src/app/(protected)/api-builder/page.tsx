"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APIInput,
  APIOptions,
  EndpointPreview,
  CodePreview,
  type InputMode,
  type AuthLevel,
} from "@/components/features/api-builder";
import type { APISpec, GeneratedFiles } from "@/lib/api-builder";
import { showToast } from "@/lib/toast";

interface GenerateResponse {
  spec: APISpec;
  files: GeneratedFiles;
  existingFiles: string[];
}

export default function APIBuilderPage() {
  const [mode, setMode] = useState<InputMode>("model");
  const [description, setDescription] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [basePath, setBasePath] = useState("");
  const [auth, setAuth] = useState<AuthLevel>("required");
  const [pagination, setPagination] = useState(true);
  const [models, setModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch("/api/api-builder/models");
        if (res.ok) {
          const data = await res.json();
          setModels(data.models || []);
        }
      } catch {
        console.error("Failed to load models");
      } finally {
        setIsLoadingModels(false);
      }
    }
    loadModels();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/api-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          description: mode === "description" ? description : undefined,
          model: mode === "model" ? selectedModel : undefined,
          basePath: basePath || undefined,
          options: { auth, pagination },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate API");
      }

      setResult(data);
      showToast.success("API generated successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate API";
      setError(message);
      showToast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;

    setIsApplying(true);

    try {
      const res = await fetch("/api/api-builder/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec: result.spec,
          overwrite: result.existingFiles.length > 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to apply API");
      }

      showToast.success(`Created ${data.createdFiles.length} file(s)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to apply API";
      showToast.error(message);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">API Builder</h1>
        <p className="mt-2 text-muted-foreground">
          Generate CRUD API routes from Prisma models or descriptions
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Select a Prisma model or describe the API you want to generate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <APIInput
                mode={mode}
                onModeChange={setMode}
                description={description}
                onDescriptionChange={setDescription}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                models={isLoadingModels ? [] : models}
                basePath={basePath}
                onBasePathChange={setBasePath}
                isLoading={isGenerating}
                onGenerate={handleGenerate}
              />
            </CardContent>
          </Card>

          <APIOptions
            auth={auth}
            onAuthChange={setAuth}
            pagination={pagination}
            onPaginationChange={setPagination}
          />

          <Card>
            <CardHeader>
              <CardTitle>Endpoints</CardTitle>
              <CardDescription>
                Preview the API endpoints that will be generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              ) : (
                <EndpointPreview spec={result?.spec || null} />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Generated Code</CardTitle>
            <CardDescription>
              Preview the route handlers that will be created
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodePreview
              files={result?.files || null}
              onApply={handleApply}
              isApplying={isApplying}
              existingFiles={result?.existingFiles}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
