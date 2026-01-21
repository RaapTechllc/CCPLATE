"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import type { PromptVariable } from "@/lib/prompt-builder";
import type { TestResult } from "@/lib/prompt-builder/tester";

interface TestPanelProps {
  promptId: string;
  variables: PromptVariable[];
  versionNumber?: number;
}

export function TestPanel({ promptId, variables, versionNumber }: TestPanelProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/prompts/${promptId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variables: values,
          versionNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          error: data.error || "Test failed",
          latencyMs: 0,
        });
        return;
      }

      setResult(data.result);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Network error",
        latencyMs: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Test Prompt</h3>

      {variables.length > 0 ? (
        <div className="space-y-3">
          {variables.map((variable) => (
            <div key={variable.name} className="space-y-1">
              <Label htmlFor={`var-${variable.name}`} className="text-sm">
                {variable.name}
                {variable.required && <span className="text-destructive ml-1">*</span>}
                <span className="text-muted-foreground ml-2 text-xs">
                  ({variable.type})
                </span>
              </Label>
              {variable.description && (
                <p className="text-xs text-muted-foreground">{variable.description}</p>
              )}
              {variable.type === "object" || variable.type === "array" ? (
                <textarea
                  id={`var-${variable.name}`}
                  value={values[variable.name] || ""}
                  onChange={(e) =>
                    setValues({ ...values, [variable.name]: e.target.value })
                  }
                  placeholder={
                    variable.defaultValue
                      ? String(variable.defaultValue)
                      : variable.type === "array"
                        ? '["item1", "item2"]'
                        : '{"key": "value"}'
                  }
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              ) : (
                <Input
                  id={`var-${variable.name}`}
                  type={variable.type === "number" ? "number" : "text"}
                  value={values[variable.name] || ""}
                  onChange={(e) =>
                    setValues({ ...values, [variable.name]: e.target.value })
                  }
                  placeholder={
                    variable.defaultValue ? String(variable.defaultValue) : undefined
                  }
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No variables defined for this prompt.
        </p>
      )}

      <Button onClick={handleTest} disabled={isLoading} className="w-full">
        {isLoading ? "Testing..." : "Test Prompt"}
      </Button>

      {result && (
        <Card className={`p-4 ${result.success ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={result.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                {result.success ? "Success" : "Failed"}
              </span>
              <span className="text-muted-foreground">{result.latencyMs}ms</span>
            </div>

            {result.tokensUsed && (
              <p className="text-xs text-muted-foreground">
                Tokens: {result.tokensUsed.input} in / {result.tokensUsed.output} out
              </p>
            )}

            {result.success && result.response ? (
              <div className="mt-2">
                <Label className="text-xs">Response:</Label>
                <div className="mt-1 max-h-64 overflow-auto">
                  <CodeBlock code={result.response} language="typescript" showLineNumbers={false} />
                </div>
              </div>
            ) : result.error ? (
              <div className="mt-2">
                <Label className="text-xs text-red-700 dark:text-red-300">Error:</Label>
                <pre className="mt-1 p-3 bg-red-100 dark:bg-red-900 rounded text-sm text-red-800 dark:text-red-200 overflow-auto">
                  {result.error}
                </pre>
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}
