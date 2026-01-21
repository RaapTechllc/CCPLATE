import type { ComponentSpec } from "./spec";
import { baseTemplate } from "./templates/base.template";
import { dataTableTemplate } from "./templates/data-table.template";
import { formTemplate } from "./templates/form.template";
import { cardTemplate } from "./templates/card.template";
import { listTemplate } from "./templates/list.template";

export type ComponentTemplate = "base" | "data-table" | "form" | "card" | "list";

export function detectTemplate(spec: ComponentSpec): ComponentTemplate {
  const nameLower = spec.name.toLowerCase();
  
  if (nameLower.includes("table") || nameLower.includes("grid")) {
    return "data-table";
  }
  
  if (nameLower.includes("form") || spec.props.some((p) => p.name === "onSubmit")) {
    return "form";
  }
  
  if (nameLower.includes("card")) {
    return "card";
  }
  
  if (nameLower.includes("list") || spec.props.some((p) => p.name === "items" || p.name === "renderItem")) {
    return "list";
  }
  
  return "base";
}

export function generateComponent(spec: ComponentSpec, template?: ComponentTemplate): string {
  const templateType = template || detectTemplate(spec);
  
  switch (templateType) {
    case "data-table":
      return dataTableTemplate(spec);
    case "form":
      return formTemplate(spec);
    case "card":
      return cardTemplate(spec);
    case "list":
      return listTemplate(spec);
    case "base":
    default:
      return baseTemplate(spec);
  }
}

export function generateImports(spec: ComponentSpec): string[] {
  const imports: string[] = [];
  
  if (spec.type === "client") {
    const reactHooks: string[] = [];
    if (spec.features.some((f) => ["loading-state", "error-state", "search", "pagination", "sorting"].includes(f))) {
      reactHooks.push("useState");
    }
    if (spec.dataSource?.type === "fetch") {
      reactHooks.push("useEffect");
    }
    if (reactHooks.length > 0) {
      imports.push(`import { ${reactHooks.join(", ")} } from "react";`);
    }
  }
  
  if (spec.features.includes("loading-state")) {
    imports.push('import { Spinner } from "@/components/ui/spinner";');
  }
  
  if (spec.styling === "tailwind") {
    imports.push('import { cn } from "@/lib/utils";');
  }
  
  return imports;
}

export function generateJSX(spec: ComponentSpec): string {
  const template = detectTemplate(spec);
  const code = generateComponent(spec, template);
  
  const returnMatch = code.match(/return \(\n([\s\S]*?)\n  \);/);
  return returnMatch ? returnMatch[1] : "";
}

export function suggestFilename(spec: ComponentSpec): string {
  return `${toKebabCase(spec.name)}.tsx`;
}

export function suggestPath(spec: ComponentSpec): string {
  const filename = suggestFilename(spec);
  const template = detectTemplate(spec);
  
  if (template === "base" && !spec.features.length && !spec.dataSource) {
    return `src/components/ui/${filename}`;
  }
  
  return `src/components/features/${filename}`;
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}
