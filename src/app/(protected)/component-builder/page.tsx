"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ComponentInput,
  OptionsPanel,
  CodePreview,
  PropsPreview,
  type ComponentOptions,
} from "@/components/features/component-builder";
import {
  generateComponentFromSpec,
  type ComponentBuilderOutput,
  type ComponentSpec,
} from "@/lib/component-builder";

const DEFAULT_OPTIONS: ComponentOptions = {
  type: "client",
  styling: "tailwind",
  features: [],
};

export default function ComponentBuilderPage() {
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<ComponentOptions>(DEFAULT_OPTIONS);
  const [output, setOutput] = useState<ComponentBuilderOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [useAI, setUseAI] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("Please enter a component description");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (useAI) {
        const response = await fetch("/api/component-builder/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description,
            preferences: {
              type: options.type,
              styling: options.styling,
              features: options.features,
            },
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to generate component");
        }

        const result = await response.json();
        setOutput(result);
      } else {
        const spec = parseDescriptionToSpec(description, options);
        const result = generateComponentFromSpec(spec);
        setOutput(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate component");
      setOutput(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async (output: ComponentBuilderOutput) => {
    setIsApplying(true);
    setError(null);

    try {
      const response = await fetch("/api/component-builder/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: output.spec.name,
          path: output.suggestedPath,
          content: output.code,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to apply component");
      }

      alert(`Component created at ${output.suggestedPath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply component");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Component Builder</h1>
        <p className="mt-2 text-muted-foreground">
          Generate React components from descriptions
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <CardDescription>
                Describe the component you want to create
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComponentInput
                value={description}
                onChange={setDescription}
                disabled={isLoading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
              <CardDescription>
                Configure component type and features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OptionsPanel
                options={options}
                onChange={setOptions}
                disabled={isLoading}
              />
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4"
              />
              <span className="text-sm">Use AI to generate spec</span>
            </label>
            <Button onClick={handleGenerate} disabled={isLoading || !description.trim()}>
              {isLoading ? "Generating..." : "Generate Component"}
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Code</CardTitle>
              <CardDescription>
                Preview, copy, or apply the generated component
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodePreview
                output={output}
                onApply={handleApply}
                isApplying={isApplying}
              />
            </CardContent>
          </Card>

          {output && (
            <Card>
              <CardHeader>
                <CardTitle>Props</CardTitle>
                <CardDescription>
                  Generated props interface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PropsPreview spec={output.spec} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function parseDescriptionToSpec(
  description: string,
  options: ComponentOptions
): ComponentSpec {
  const lines = description.split("\n").filter((l) => l.trim());
  const firstLine = lines[0] || description;
  
  const nameMatch = firstLine.match(/(?:a |an )?(\w+(?:\s+\w+)*?)(?:\s+(?:component|card|form|table|list|grid))?/i);
  let rawName = nameMatch ? nameMatch[1] : "Custom";
  
  rawName = rawName
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
  
  if (!rawName.match(/^[A-Z]/)) {
    rawName = "Custom" + rawName;
  }

  const name = rawName.replace(/[^a-zA-Z0-9]/g, "");

  const props: ComponentSpec["props"] = [];
  const descLower = description.toLowerCase();

  if (descLower.includes("title")) {
    props.push({ name: "title", type: "string", required: true });
  }
  if (descLower.includes("description") || descLower.includes("subtitle")) {
    props.push({ name: "description", type: "string", required: false });
  }
  if (descLower.includes("image") || descLower.includes("avatar")) {
    props.push({ name: "imageUrl", type: "string", required: false });
  }
  if (descLower.includes("click") || descLower.includes("button")) {
    props.push({ name: "onClick", type: "() => void", required: false });
  }
  if (descLower.includes("submit")) {
    props.push({ name: "onSubmit", type: "(data: unknown) => void", required: true });
  }
  if (descLower.includes("items") || descLower.includes("list") || descLower.includes("data")) {
    props.push({ name: "items", type: "unknown[]", required: true });
  }

  const hasChildren = 
    descLower.includes("children") || 
    descLower.includes("content") ||
    descLower.includes("slot");

  return {
    name,
    description: firstLine,
    type: options.type,
    props,
    hasChildren,
    styling: options.styling,
    features: options.features,
  };
}
