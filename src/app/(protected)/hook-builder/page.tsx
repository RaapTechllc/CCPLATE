"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HookBuilderForm, HookPreview } from "@/components/features/hook-builder";
import { generateHookFromSpec, type HookSpec, type HookBuilderOutput } from "@/lib/hook-builder";

export default function HookBuilderPage() {
  const [output, setOutput] = useState<HookBuilderOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async (spec: HookSpec) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = generateHookFromSpec(spec);
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate hook");
      setOutput(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Hook Builder</h1>
        <p className="mt-2 text-muted-foreground">
          Generate React Query hooks from natural language descriptions
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Describe the hook you want to generate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HookBuilderForm onGenerate={handleGenerate} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Hook</CardTitle>
            <CardDescription>
              Preview and download the generated code
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : (
              <HookPreview output={output} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
