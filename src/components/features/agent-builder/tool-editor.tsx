"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tool, ToolParameter } from "@/lib/agent-builder/schema";

interface ToolEditorProps {
  tools: Tool[];
  onChange: (tools: Tool[]) => void;
}

export function ToolEditor({ tools, onChange }: ToolEditorProps) {
  const [editingTool, setEditingTool] = useState<Partial<Tool> | null>(null);

  const customTools = tools.filter((t) => !t.handler.startsWith("builtIn:"));

  const handleSave = () => {
    if (!editingTool?.name || !editingTool?.description) return;

    const tool: Tool = {
      id: editingTool.id || `custom_${Date.now()}`,
      name: editingTool.name,
      description: editingTool.description,
      parameters: editingTool.parameters || [],
      handler: editingTool.handler || `custom:${editingTool.name}`,
    };

    if (editingTool.id) {
      onChange(tools.map((t) => (t.id === tool.id ? tool : t)));
    } else {
      onChange([...tools, tool]);
    }
    setEditingTool(null);
  };

  const handleDelete = (id: string) => {
    onChange(tools.filter((t) => t.id !== id));
  };

  const addParameter = () => {
    if (!editingTool) return;
    setEditingTool({
      ...editingTool,
      parameters: [
        ...(editingTool.parameters || []),
        { name: "", type: "string", description: "", required: true },
      ],
    });
  };

  const updateParameter = (index: number, param: Partial<ToolParameter>) => {
    if (!editingTool) return;
    const params = [...(editingTool.parameters || [])];
    params[index] = { ...params[index], ...param } as ToolParameter;
    setEditingTool({ ...editingTool, parameters: params });
  };

  const removeParameter = (index: number) => {
    if (!editingTool) return;
    const params = [...(editingTool.parameters || [])];
    params.splice(index, 1);
    setEditingTool({ ...editingTool, parameters: params });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Custom Tools</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditingTool({ parameters: [] })}
        >
          Add Custom Tool
        </Button>
      </div>

      {customTools.length === 0 && !editingTool && (
        <p className="text-sm text-muted-foreground">
          No custom tools defined. Click &quot;Add Custom Tool&quot; to create one.
        </p>
      )}

      {customTools.map((tool) => (
        <Card key={tool.id}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{tool.name}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTool(tool)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(tool.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{tool.description}</p>
          </CardHeader>
        </Card>
      ))}

      {editingTool && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {editingTool.id ? "Edit Tool" : "New Tool"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingTool.name || ""}
                  onChange={(e) =>
                    setEditingTool({ ...editingTool, name: e.target.value })
                  }
                  placeholder="my_tool"
                />
              </div>
              <div className="space-y-2">
                <Label>Handler</Label>
                <Input
                  value={editingTool.handler || ""}
                  onChange={(e) =>
                    setEditingTool({ ...editingTool, handler: e.target.value })
                  }
                  placeholder="custom:my_tool"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={editingTool.description || ""}
                onChange={(e) =>
                  setEditingTool({ ...editingTool, description: e.target.value })
                }
                placeholder="What does this tool do?"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Parameters</Label>
                <Button variant="outline" size="sm" onClick={addParameter}>
                  Add Parameter
                </Button>
              </div>
              {editingTool.parameters?.map((param, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    value={param.name}
                    onChange={(e) =>
                      updateParameter(index, { name: e.target.value })
                    }
                    placeholder="name"
                    className="flex-1"
                  />
                  <select
                    value={param.type}
                    onChange={(e) =>
                      updateParameter(index, {
                        type: e.target.value as ToolParameter["type"],
                      })
                    }
                    className="h-10 rounded-md border border-input bg-background px-3"
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="array">array</option>
                    <option value="object">object</option>
                  </select>
                  <Input
                    value={param.description}
                    onChange={(e) =>
                      updateParameter(index, { description: e.target.value })
                    }
                    placeholder="description"
                    className="flex-1"
                  />
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={param.required}
                      onChange={(e) =>
                        updateParameter(index, { required: e.target.checked })
                      }
                    />
                    Req
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeParameter(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>Save Tool</Button>
              <Button variant="outline" onClick={() => setEditingTool(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
