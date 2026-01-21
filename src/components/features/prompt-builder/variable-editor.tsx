"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PromptVariable } from "@/lib/prompt-builder";

interface VariableEditorProps {
  variables: PromptVariable[];
  onChange: (variables: PromptVariable[]) => void;
}

const VARIABLE_TYPES = ["string", "number", "boolean", "array", "object"] as const;

export function VariableEditor({ variables, onChange }: VariableEditorProps) {
  const addVariable = () => {
    onChange([
      ...variables,
      {
        name: "",
        type: "string",
        description: "",
        required: true,
        defaultValue: undefined,
      },
    ]);
  };

  const updateVariable = (index: number, updates: Partial<PromptVariable>) => {
    const newVariables = [...variables];
    newVariables[index] = { ...newVariables[index], ...updates };
    onChange(newVariables);
  };

  const removeVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Variables</Label>
        <Button type="button" variant="outline" size="sm" onClick={addVariable}>
          Add Variable
        </Button>
      </div>

      {variables.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No variables defined. Use {"{{variableName}}"} syntax in your prompts.
        </p>
      ) : (
        <div className="space-y-3">
          {variables.map((variable, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-start p-3 border rounded-md"
            >
              <div className="col-span-3">
                <Label className="text-xs">Name</Label>
                <Input
                  value={variable.name}
                  onChange={(e) => updateVariable(index, { name: e.target.value })}
                  placeholder="variableName"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Type</Label>
                <select
                  value={variable.type}
                  onChange={(e) =>
                    updateVariable(index, {
                      type: e.target.value as PromptVariable["type"],
                    })
                  }
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  {VARIABLE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Description</Label>
                <Input
                  value={variable.description || ""}
                  onChange={(e) => updateVariable(index, { description: e.target.value })}
                  placeholder="Optional description"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Default</Label>
                <Input
                  value={String(variable.defaultValue ?? "")}
                  onChange={(e) =>
                    updateVariable(index, {
                      defaultValue: e.target.value || undefined,
                    })
                  }
                  placeholder="Default value"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-1 flex items-end gap-1">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={variable.required}
                    onChange={(e) =>
                      updateVariable(index, { required: e.target.checked })
                    }
                    className="rounded"
                  />
                  Req
                </label>
              </div>
              <div className="col-span-1 flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVariable(index)}
                  className="h-8 px-2 text-destructive hover:text-destructive"
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
