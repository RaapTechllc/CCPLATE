import type { HookSpec } from "../spec";

export function renderQueryTemplate(spec: HookSpec): string {
  const queryParams = spec.params.filter((p) => p.location !== "body");
  const queryKey = spec.name.replace(/^use/, "").toLowerCase();

  const paramsSignature = spec.params
    .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
    .join(",\n  ");

  const queryKeyParams = queryParams.map((p) => p.name).join(", ");
  const queryKeyArray = queryKeyParams
    ? `["${queryKey}", ${queryKeyParams}]`
    : `["${queryKey}"]`;

  const endpointWithParams = buildEndpointUrl(spec.endpoint, spec.params);

  return `import { useQuery, UseQueryOptions } from "@tanstack/react-query";

${spec.inputType ? `export interface ${spec.inputType} {\n  // TODO: Define input type\n}\n` : ""}
${spec.outputType ? `export interface ${spec.outputType} {\n  // TODO: Define output type\n}\n` : ""}
export function ${spec.name}(
  ${paramsSignature}${paramsSignature ? "," : ""}
  options?: Omit<UseQueryOptions<${spec.outputType || "unknown"}>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ${queryKeyArray},
    queryFn: async () => {
      const response = await fetch(\`${endpointWithParams}\`);
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json() as Promise<${spec.outputType || "unknown"}>;
    },
    ...options,
  });
}
`;
}

function buildEndpointUrl(
  endpoint: string,
  params: HookSpec["params"]
): string {
  let url = endpoint;
  const pathParams = params.filter((p) => p.location === "path");
  const queryParams = params.filter((p) => p.location === "query");

  for (const param of pathParams) {
    url = url.replace(`:${param.name}`, `\${${param.name}}`);
    url = url.replace(`[${param.name}]`, `\${${param.name}}`);
  }

  if (queryParams.length > 0) {
    const queryString = queryParams
      .map((p) => `${p.name}=\${${p.name}}`)
      .join("&");
    url += `?${queryString}`;
  }

  return url;
}
