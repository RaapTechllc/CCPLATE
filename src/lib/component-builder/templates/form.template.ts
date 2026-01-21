import type { ComponentSpec } from "../spec";

export function formTemplate(spec: ComponentSpec): string {
  const hasLoadingState = spec.features.includes("loading-state");
  const hasErrorState = spec.features.includes("error-state");

  const imports = [
    '"use client";',
    "",
    'import { useState } from "react";',
    'import { Button } from "@/components/ui/button";',
    'import { Input } from "@/components/ui/input";',
    'import { Label } from "@/components/ui/label";',
    'import { cn } from "@/lib/utils";',
    hasLoadingState ? 'import { Spinner } from "@/components/ui/spinner";' : "",
  ].filter(Boolean).join("\n");

  const formFields = spec.props.filter((p) => p.name !== "onSubmit" && p.name !== "className");

  const stateInit = formFields.map((field) => {
    const defaultValue = field.defaultValue || (field.type === "string" ? '""' : field.type === "number" ? "0" : field.type === "boolean" ? "false" : '""');
    return `    ${field.name}: ${defaultValue},`;
  }).join("\n");

  const fieldComponents = formFields.map((field) => {
    const inputType = field.type === "number" ? "number" : field.type === "boolean" ? "checkbox" : "text";
    return `
        <div className="space-y-2">
          <Label htmlFor="${field.name}">${field.description || field.name}</Label>
          <Input
            id="${field.name}"
            name="${field.name}"
            type="${inputType}"
            value={formData.${field.name}}
            onChange={(e) => setFormData((prev) => ({ ...prev, ${field.name}: e.target.value }))}
            ${field.required ? "required" : ""}
            placeholder="${field.description || `Enter ${field.name}`}"
          />
        </div>`;
  }).join("\n");

  return `${imports}

interface ${spec.name}Data {
${formFields.map((f) => `  ${f.name}: ${f.type};`).join("\n")}
}

interface ${spec.name}Props {
  onSubmit: (data: ${spec.name}Data) => void | Promise<void>;
  className?: string;
  initialData?: Partial<${spec.name}Data>;
${spec.hasChildren ? "  children?: React.ReactNode;\n" : ""}}

export function ${spec.name}({
  onSubmit,
  className,
  initialData,
${spec.hasChildren ? "  children,\n" : ""}}: ${spec.name}Props) {
  const [formData, setFormData] = useState<${spec.name}Data>({
${stateInit}
    ...initialData,
  });
${hasLoadingState ? "  const [isLoading, setIsLoading] = useState(false);\n" : ""}${hasErrorState ? "  const [error, setError] = useState<string | null>(null);\n" : ""}
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
${hasErrorState ? "    setError(null);\n" : ""}${hasLoadingState ? "    setIsLoading(true);\n" : ""}
    try {
      await onSubmit(formData);
    } catch (err) {
${hasErrorState ? `      setError(err instanceof Error ? err.message : "An error occurred");\n` : "      console.error(err);\n"}    }${hasLoadingState ? " finally {\n      setIsLoading(false);\n    }" : ""}
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
${hasErrorState ? `      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
` : ""}${fieldComponents}
${spec.hasChildren ? "\n      {children}\n" : ""}
      <Button type="submit" ${hasLoadingState ? "disabled={isLoading}" : ""} className="w-full">
        ${hasLoadingState ? '{isLoading ? <Spinner className="h-4 w-4" /> : "Submit"}' : '"Submit"'}
      </Button>
    </form>
  );
}
`;
}
