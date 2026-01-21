import type { HookSpec } from "../spec";

export function renderInfiniteQueryTemplate(spec: HookSpec): string {
  const queryParams = spec.params.filter((p) => p.location !== "body");
  const queryKey = spec.name.replace(/^use/, "").toLowerCase();

  const paramsSignature = spec.params
    .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
    .join(",\n  ");

  const queryKeyParams = queryParams.map((p) => p.name).join(", ");
  const queryKeyArray = queryKeyParams
    ? `["${queryKey}", ${queryKeyParams}]`
    : `["${queryKey}"]`;

  const pagination = spec.pagination;
  const cursorField = pagination?.cursorField || "cursor";
  const pageSizeParam = pagination?.pageSizeParam || "limit";
  const isCursor = pagination?.style === "cursor";

  const outputTypeName = spec.outputType || `${spec.name.replace(/^use/, "")}Response`;

  let endpointBase = spec.endpoint;
  const pathParams = spec.params.filter((p) => p.location === "path");
  for (const param of pathParams) {
    endpointBase = endpointBase.replace(`:${param.name}`, `\${${param.name}}`);
    endpointBase = endpointBase.replace(`[${param.name}]`, `\${${param.name}}`);
  }

  return `import { useInfiniteQuery, UseInfiniteQueryOptions } from "@tanstack/react-query";

export interface ${outputTypeName} {
  data: unknown[];
  ${isCursor ? `nextCursor?: string;` : `totalPages: number;`}
  // TODO: Define full response type
}

export function ${spec.name}(
  ${paramsSignature}${paramsSignature ? "," : ""}
  options?: Omit<
    UseInfiniteQueryOptions<${outputTypeName}, Error, ${outputTypeName}, ${outputTypeName}, string[], ${isCursor ? "string | undefined" : "number"}>,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  >
) {
  return useInfiniteQuery({
    queryKey: ${queryKeyArray},
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      ${isCursor ? `if (pageParam) params.set("${cursorField}", pageParam);` : `params.set("page", String(pageParam));`}
      params.set("${pageSizeParam}", "20");
      
      const response = await fetch(\`${endpointBase}?\${params.toString()}\`);
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json() as Promise<${outputTypeName}>;
    },
    initialPageParam: ${isCursor ? "undefined" : "1"},
    getNextPageParam: (lastPage) => ${isCursor ? `lastPage.nextCursor` : `lastPage.totalPages > 0 ? undefined : undefined`},
    ...options,
  });
}
`;
}
