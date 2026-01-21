import type { HookSpec } from "../spec";

export function renderMutationTemplate(spec: HookSpec): string {
  const pathParams = spec.params.filter((p) => p.location === "path");
  const bodyParams = spec.params.filter((p) => p.location === "body");

  const pathParamsSignature = pathParams
    .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
    .join(",\n  ");

  const mutationKey = spec.name.replace(/^use/, "").toLowerCase();

  let endpointWithParams = spec.endpoint;
  for (const param of pathParams) {
    endpointWithParams = endpointWithParams.replace(
      `:${param.name}`,
      `\${${param.name}}`
    );
    endpointWithParams = endpointWithParams.replace(
      `[${param.name}]`,
      `\${${param.name}}`
    );
  }

  const invalidatesArray =
    spec.invalidates.length > 0
      ? spec.invalidates.map((i) => `["${i}"]`).join(", ")
      : "";

  const inputTypeName = spec.inputType || `${spec.name.replace(/^use/, "")}Input`;
  const outputTypeName = spec.outputType || `${spec.name.replace(/^use/, "")}Output`;

  return `import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";

export interface ${inputTypeName} {
  ${bodyParams.map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type};`).join("\n  ") || "// TODO: Define input fields"}
}

export interface ${outputTypeName} {
  // TODO: Define output type
}

export function ${spec.name}(
  ${pathParamsSignature}${pathParamsSignature ? "," : ""}
  options?: Omit<UseMutationOptions<${outputTypeName}, Error, ${inputTypeName}>, "mutationFn">
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["${mutationKey}"${pathParams.length > 0 ? ", " + pathParams.map((p) => p.name).join(", ") : ""}],
    mutationFn: async (data: ${inputTypeName}) => {
      const response = await fetch(\`${endpointWithParams}\`, {
        method: "${spec.method}",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Mutation failed");
      return response.json() as Promise<${outputTypeName}>;
    },
    onSuccess: () => {
      ${invalidatesArray ? `queryClient.invalidateQueries({ queryKey: ${invalidatesArray} });` : "// TODO: Add cache invalidation if needed"}
    },
    ...options,
  });
}
`;
}
