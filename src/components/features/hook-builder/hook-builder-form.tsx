"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HookSpec } from "@/lib/hook-builder";

interface HookBuilderFormProps {
  onGenerate: (spec: HookSpec) => void;
  isLoading?: boolean;
}

type HookKind = "query" | "mutation" | "infiniteQuery" | "form";

export function HookBuilderForm({ onGenerate, isLoading }: HookBuilderFormProps) {
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<HookKind>("query");
  const [endpoint, setEndpoint] = useState("");
  const [hookName, setHookName] = useState("");
  const [preferences, setPreferences] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const name = hookName || inferHookName(description, kind);
    const method = inferMethod(kind);
    const inferredEndpoint = endpoint || inferEndpoint(description);

    const spec: HookSpec = {
      name,
      description: description || undefined,
      kind,
      endpoint: inferredEndpoint,
      method,
      params: [],
      invalidates: [],
    };

    onGenerate(spec);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what your hook should do... e.g., 'Fetch a list of projects for the current user'"
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="kind">Hook Kind *</Label>
          <select
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as HookKind)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="query">Query (useQuery)</option>
            <option value="mutation">Mutation (useMutation)</option>
            <option value="infiniteQuery">Infinite Query (useInfiniteQuery)</option>
            <option value="form">Form (useForm + useMutation)</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hookName">Hook Name (optional)</Label>
          <Input
            id="hookName"
            value={hookName}
            onChange={(e) => setHookName(e.target.value)}
            placeholder="useMyHook"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to auto-generate from description
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="endpoint">API Endpoint (optional)</Label>
        <Input
          id="endpoint"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="/api/resource"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to infer from description
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferences">Additional Preferences (optional)</Label>
        <textarea
          id="preferences"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="Any specific requirements... e.g., 'Include pagination with cursor-based approach'"
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <Button type="submit" className="w-full" loading={isLoading}>
        Generate Hook
      </Button>
    </form>
  );
}

function inferHookName(description: string, kind: HookKind): string {
  const words = description.toLowerCase().split(/\s+/);
  const actionWords = ["fetch", "get", "create", "update", "delete", "list", "submit"];
  const resourceWords = words.filter(
    (w) => !actionWords.includes(w) && w.length > 3
  );

  let resource = resourceWords[0] || "data";
  resource = resource.charAt(0).toUpperCase() + resource.slice(1);

  switch (kind) {
    case "query":
      return `use${resource}`;
    case "mutation":
      if (description.toLowerCase().includes("create")) return `useCreate${resource}`;
      if (description.toLowerCase().includes("update")) return `useUpdate${resource}`;
      if (description.toLowerCase().includes("delete")) return `useDelete${resource}`;
      return `use${resource}Mutation`;
    case "infiniteQuery":
      return `use${resource}List`;
    case "form":
      return `use${resource}Form`;
    default:
      return `use${resource}`;
  }
}

function inferMethod(kind: HookKind): "GET" | "POST" | "PUT" | "PATCH" | "DELETE" {
  switch (kind) {
    case "query":
    case "infiniteQuery":
      return "GET";
    case "mutation":
    case "form":
      return "POST";
    default:
      return "GET";
  }
}

function inferEndpoint(description: string): string {
  const words = description.toLowerCase().split(/\s+/);
  const resourcePatterns = ["users", "projects", "items", "posts", "comments", "tasks"];

  for (const pattern of resourcePatterns) {
    if (words.some((w) => w.includes(pattern.slice(0, -1)))) {
      return `/api/${pattern}`;
    }
  }

  const nouns = words.filter((w) => w.length > 3 && !["fetch", "get", "create", "update", "delete", "list", "the", "for", "with"].includes(w));
  if (nouns.length > 0) {
    return `/api/${nouns[0]}s`;
  }

  return "/api/resource";
}
