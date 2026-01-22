"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tool } from "@/lib/agent-builder/schema";
import { builtInToolsList } from "@/lib/agent-builder/tools";

interface ToolSelectorProps {
  selectedTools: Tool[];
  onChange: (tools: Tool[]) => void;
}

export function ToolSelector({ selectedTools, onChange }: ToolSelectorProps) {
  const selectedIds = new Set(selectedTools.map((t) => t.id));

  const toggleTool = (tool: Tool) => {
    if (selectedIds.has(tool.id)) {
      onChange(selectedTools.filter((t) => t.id !== tool.id));
    } else {
      onChange([...selectedTools, tool]);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Built-in Tools</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {builtInToolsList.map((tool) => {
          const isSelected = selectedIds.has(tool.id);
          return (
            <Card
              key={tool.id}
              className={`cursor-pointer transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "hover:border-muted-foreground/50"
              }`}
              onClick={() => toggleTool(tool)}
            >
              <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTool(tool)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div>
                    <CardTitle className="text-sm">{tool.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {tool.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
