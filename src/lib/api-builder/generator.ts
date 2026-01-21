import type { APISpec } from "./spec";
import { crudRouteTemplate } from "./templates/crud-route.template";
import { dynamicRouteTemplate } from "./templates/dynamic-route.template";

export interface GeneratedRoutes {
  routeCode: string;
  dynamicRouteCode: string | null;
}

export function generateRouteFile(spec: APISpec): string {
  return crudRouteTemplate(spec);
}

export function generateDynamicRouteFile(spec: APISpec): string | null {
  const hasDynamicEndpoints = spec.endpoints.some(e => e.path.includes("[id]"));
  if (!hasDynamicEndpoints) return null;
  return dynamicRouteTemplate(spec);
}

export function generateRoutes(spec: APISpec): GeneratedRoutes {
  return {
    routeCode: generateRouteFile(spec),
    dynamicRouteCode: generateDynamicRouteFile(spec),
  };
}

export function createStandardCRUDSpec(
  modelName: string,
  basePath?: string
): APISpec {
  const path = basePath || `/api/${modelName.toLowerCase()}s`;
  
  return {
    name: `${modelName.toLowerCase()}s`,
    basePath: path,
    model: modelName,
    endpoints: [
      {
        method: "GET",
        path,
        description: `List all ${modelName}s`,
        auth: "required",
        pagination: true,
      },
      {
        method: "POST",
        path,
        description: `Create a new ${modelName}`,
        auth: "required",
        pagination: false,
        input: { params: [], query: [], body: `Create${modelName}Input` },
      },
      {
        method: "GET",
        path: `${path}/[id]`,
        description: `Get a single ${modelName}`,
        auth: "required",
        pagination: false,
        input: { params: [{ name: "id", type: "string", required: true }], query: [] },
      },
      {
        method: "PUT",
        path: `${path}/[id]`,
        description: `Update a ${modelName}`,
        auth: "required",
        pagination: false,
        input: { 
          params: [{ name: "id", type: "string", required: true }],
          query: [],
          body: `Update${modelName}Input`,
        },
      },
      {
        method: "PATCH",
        path: `${path}/[id]`,
        description: `Partially update a ${modelName}`,
        auth: "required",
        pagination: false,
        input: {
          params: [{ name: "id", type: "string", required: true }],
          query: [],
          body: `Partial${modelName}Input`,
        },
      },
      {
        method: "DELETE",
        path: `${path}/[id]`,
        description: `Delete a ${modelName}`,
        auth: "required",
        pagination: false,
        input: { params: [{ name: "id", type: "string", required: true }], query: [] },
      },
    ],
  };
}
