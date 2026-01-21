import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import type { APISpec } from "./spec";
import { generateRoutes } from "./generator";

export interface GeneratedFiles {
  routePath: string;
  routeContent: string;
  dynamicRoutePath: string | null;
  dynamicRouteContent: string | null;
}

export function generateFiles(spec: APISpec): GeneratedFiles {
  const routes = generateRoutes(spec);
  
  const basePath = spec.basePath.replace(/^\/api\//, "");
  const routePath = `src/app/api/${basePath}/route.ts`;
  const dynamicRoutePath = routes.dynamicRouteCode
    ? `src/app/api/${basePath}/[id]/route.ts`
    : null;
  
  return {
    routePath,
    routeContent: routes.routeCode,
    dynamicRoutePath,
    dynamicRouteContent: routes.dynamicRouteCode,
  };
}

export function writeAPIFiles(files: GeneratedFiles, projectRoot: string): void {
  const routeFullPath = join(projectRoot, files.routePath);
  const routeDir = dirname(routeFullPath);
  
  if (!existsSync(routeDir)) {
    mkdirSync(routeDir, { recursive: true });
  }
  writeFileSync(routeFullPath, files.routeContent, "utf-8");
  
  if (files.dynamicRoutePath && files.dynamicRouteContent) {
    const dynamicFullPath = join(projectRoot, files.dynamicRoutePath);
    const dynamicDir = dirname(dynamicFullPath);
    
    if (!existsSync(dynamicDir)) {
      mkdirSync(dynamicDir, { recursive: true });
    }
    writeFileSync(dynamicFullPath, files.dynamicRouteContent, "utf-8");
  }
}

export function previewFiles(files: GeneratedFiles): string {
  let preview = `## Generated Files\n\n`;
  
  preview += `### ${files.routePath}\n\`\`\`typescript\n${files.routeContent}\n\`\`\`\n\n`;
  
  if (files.dynamicRoutePath && files.dynamicRouteContent) {
    preview += `### ${files.dynamicRoutePath}\n\`\`\`typescript\n${files.dynamicRouteContent}\n\`\`\`\n`;
  }
  
  return preview;
}

export function checkFilesExist(files: GeneratedFiles, projectRoot: string): string[] {
  const existing: string[] = [];
  
  const routeFullPath = join(projectRoot, files.routePath);
  if (existsSync(routeFullPath)) {
    existing.push(files.routePath);
  }
  
  if (files.dynamicRoutePath) {
    const dynamicFullPath = join(projectRoot, files.dynamicRoutePath);
    if (existsSync(dynamicFullPath)) {
      existing.push(files.dynamicRoutePath);
    }
  }
  
  return existing;
}
