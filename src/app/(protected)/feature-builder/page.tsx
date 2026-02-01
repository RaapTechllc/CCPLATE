"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CodeBlock } from "@/components/ui/code-block";
import { showToast } from "@/lib/toast";
import type {
  FeatureBuilderMetrics,
  FeatureBuilderResponse,
} from "@/lib/feature-builder/types";

const DEFAULT_OPTIONS = {
  includeSchema: true,
  includeApi: true,
  includeHooks: true,
  includeComponents: true,
};

export default function FeatureBuilderPage() {
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [result, setResult] = useState<FeatureBuilderResponse | null>(null);
  const [metrics, setMetrics] = useState<FeatureBuilderMetrics | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overwriteApi, setOverwriteApi] = useState(false);
  const [applySchema, setApplySchema] = useState(true);
  const [applyApi, setApplyApi] = useState(true);
  const [selectedHooks, setSelectedHooks] = useState<Record<string, boolean>>({});
  const [selectedComponents, setSelectedComponents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadMetrics() {
      try {
        const response = await fetch("/api/feature-builder/metrics");
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as FeatureBuilderMetrics;
        setMetrics(data);
      } catch {
        setMetrics(null);
      }
    }

    loadMetrics();
  }, []);

  useEffect(() => {
    if (!result) {
      return;
    }

    setOverwriteApi(false);
    setApplySchema(!!result.schema && options.includeSchema);
    setApplyApi(!!result.api && options.includeApi);

    const hookSelections: Record<string, boolean> = {};
    result.hooks?.forEach((hook) => {
      hookSelections[hook.suggestedPath] = !hook.exists;
    });
    setSelectedHooks(hookSelections);

    const componentSelections: Record<string, boolean> = {};
    result.components?.forEach((component) => {
      componentSelections[component.suggestedPath] = !component.exists;
    });
    setSelectedComponents(componentSelections);
  }, [result, options.includeSchema, options.includeApi]);

  const selectedHookOutputs = useMemo(() => {
    if (!result?.hooks) return [];
    return result.hooks.filter((hook) => selectedHooks[hook.suggestedPath]);
  }, [result, selectedHooks]);

  const selectedComponentOutputs = useMemo(() => {
    if (!result?.components) return [];
    return result.components.filter((component) => selectedComponents[component.suggestedPath]);
  }, [result, selectedComponents]);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("Please describe the feature you want to build.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/feature-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          ...options,
          apiOptions: { auth: "required", pagination: true },
        }),
      });

      const data = (await response.json()) as FeatureBuilderResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setResult(data);
      showToast.success("Feature workflow generated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      showToast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;

    setIsApplying(true);
    setError(null);

    try {
      const response = await fetch("/api/feature-builder/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureName: result.featureName,
          estimatedMinutesSaved: result.metrics.estimatedMinutesSaved,
          schema: applySchema && result.schema
            ? { modelCode: result.schema.modelCode }
            : undefined,
          api: applyApi && result.api
            ? { spec: result.api.spec, overwrite: overwriteApi }
            : undefined,
          hooks: selectedHookOutputs.map((hook) => ({
            spec: hook.spec,
            code: hook.code,
            filename: hook.filename,
            path: hook.suggestedPath,
          })),
          components: selectedComponentOutputs.map((component) => ({
            name: component.spec.name,
            path: component.suggestedPath,
            content: component.code,
          })),
        }),
      });

      const data = (await response.json()) as { error?: string; conflicts?: Record<string, string[]> };

      if (!response.ok) {
        if (response.status === 409 && data.conflicts) {
          const conflictMessage = Object.entries(data.conflicts)
            .map(([key, items]) => `${key}: ${items.join(", ")}`)
            .join(" | ");
          throw new Error(`Conflicts detected: ${conflictMessage}`);
        }
        throw new Error(data.error || "Apply failed");
      }

      showToast.success("Feature workflow applied");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Apply failed";
      setError(message);
      showToast.error(message);
    } finally {
      setIsApplying(false);
    }
  };

  const estimatedTime = result?.metrics
    ? formatMinutes(result.metrics.estimatedMinutesSaved)
    : "-";

  const totalTimeSaved = metrics
    ? formatMinutes(metrics.totalMinutesSaved)
    : "-";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Feature Builder</h1>
        <p className="mt-2 text-muted-foreground">
          Chain schema, API, hooks, and components into a full-stack feature.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1.6fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Describe the feature</CardTitle>
              <CardDescription>
                Example: &quot;A projects feature with titles, statuses, and owner relationships.&quot;
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                className="w-full rounded-md border border-input bg-background p-3 text-sm"
                placeholder="Describe the feature you want to generate..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workflow options</CardTitle>
              <CardDescription>Choose which builders to include.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OptionToggle
                label="Schema (Prisma model + diff)"
                checked={options.includeSchema}
                onChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeSchema: checked }))
                }
              />
              <OptionToggle
                label="API routes (CRUD endpoints)"
                checked={options.includeApi}
                onChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeApi: checked }))
                }
              />
              <OptionToggle
                label="Hooks (React Query)"
                checked={options.includeHooks}
                onChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeHooks: checked }))
                }
              />
              <OptionToggle
                label="Components (list + form)"
                checked={options.includeComponents}
                onChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeComponents: checked }))
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Impact</CardTitle>
              <CardDescription>Track time saved across workflows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">This workflow</span>
                <span className="font-semibold">{estimatedTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total saved</span>
                <span className="font-semibold">{totalTimeSaved}</span>
              </div>
              {metrics && (
                <div className="text-xs text-muted-foreground">
                  {metrics.totalEvents} builder events tracked
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Feature"}
            </Button>
            <Button
              variant="outline"
              onClick={handleApply}
              disabled={!result || isApplying}
            >
              {isApplying ? "Applying..." : "Apply Selected"}
            </Button>
          </div>

          {result?.api?.existingFiles?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Overwrite API files?</CardTitle>
                <CardDescription>
                  Existing API files detected. Enable overwrite to apply.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {result.api.existingFiles.join(", ")}
                </span>
                <Switch checked={overwriteApi} onCheckedChange={setOverwriteApi} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Workflow summary</CardTitle>
                <CardDescription>
                  Feature: {result.featureName} · Base path: {result.basePath}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm">
                  {result.metrics.steps.map((step) => (
                    <div key={step.step} className="flex items-center justify-between">
                      <span className="capitalize text-muted-foreground">{step.step}</span>
                      <span className="font-medium">{formatMinutes(step.minutesSaved)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result?.schema && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Schema output</span>
                  <SelectionToggle
                    checked={applySchema}
                    onChange={setApplySchema}
                    disabled={!result.schema}
                  />
                </CardTitle>
                <CardDescription>
                  Prisma model + diff preview.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock code={result.schema.modelCode} language="prisma" />
                <CodeBlock code={result.schema.diff} language="bash" />
              </CardContent>
            </Card>
          )}

          {result?.api && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>API routes</span>
                  <SelectionToggle checked={applyApi} onChange={setApplyApi} disabled={!result.api} />
                </CardTitle>
                <CardDescription>
                  CRUD endpoints generated at {result.api.spec.basePath}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {result.api.spec.endpoints.map((endpoint) => (
                    <div key={`${endpoint.method}-${endpoint.path}`}>
                      {endpoint.method} {endpoint.path}
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {result.api.files.routePath}
                    </Label>
                    <CodeBlock code={result.api.files.routeContent} language="typescript" />
                  </div>
                  {result.api.files.dynamicRoutePath && result.api.files.dynamicRouteContent && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {result.api.files.dynamicRoutePath}
                      </Label>
                      <CodeBlock code={result.api.files.dynamicRouteContent} language="typescript" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {result?.hooks && result.hooks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Hooks</CardTitle>
                <CardDescription>Generated React Query hooks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.hooks.map((hook) => (
                  <div key={hook.suggestedPath} className="rounded-md border p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{hook.spec.name}</p>
                        <p className="text-xs text-muted-foreground">{hook.suggestedPath}</p>
                        {hook.exists && (
                          <p className="text-xs text-amber-600">
                            File exists — uncheck to skip.
                          </p>
                        )}
                      </div>
                      <SelectionToggle
                        checked={!!selectedHooks[hook.suggestedPath]}
                        onChange={(checked) =>
                          setSelectedHooks((prev) => ({
                            ...prev,
                            [hook.suggestedPath]: checked,
                          }))
                        }
                        disabled={hook.exists}
                      />
                    </div>
                    <CodeBlock code={hook.code} language="typescript" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result?.components && result.components.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Components</CardTitle>
                <CardDescription>Generated list + form components.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.components.map((component) => (
                  <div key={component.suggestedPath} className="rounded-md border p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{component.spec.name}</p>
                        <p className="text-xs text-muted-foreground">{component.suggestedPath}</p>
                        {component.exists && (
                          <p className="text-xs text-amber-600">
                            File exists — uncheck to skip.
                          </p>
                        )}
                      </div>
                      <SelectionToggle
                        checked={!!selectedComponents[component.suggestedPath]}
                        onChange={(checked) =>
                          setSelectedComponents((prev) => ({
                            ...prev,
                            [component.suggestedPath]: checked,
                          }))
                        }
                        disabled={component.exists}
                      />
                    </div>
                    <CodeBlock code={component.code} language="tsx" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SelectionToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="h-4 w-4"
      />
      Apply
    </label>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (remainder === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainder} min`;
}
