import type { HookSpec } from "../spec";

export function renderFormTemplate(spec: HookSpec): string {
  const bodyParams = spec.params.filter((p) => p.location === "body");
  const pathParams = spec.params.filter((p) => p.location === "path");

  const pathParamsSignature = pathParams
    .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
    .join(",\n  ");

  const inputTypeName = spec.inputType || `${spec.name.replace(/^use/, "")}FormData`;
  const outputTypeName = spec.outputType || `${spec.name.replace(/^use/, "")}Response`;

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

  const formFields = bodyParams.length > 0
    ? bodyParams
        .map((p) => `  ${p.name}: z.${p.type === "string" ? "string()" : p.type === "number" ? "number()" : "unknown()"},`)
        .join("\n")
    : "  // TODO: Add form fields";

  const defaultValues = bodyParams.length > 0
    ? bodyParams
        .map((p) => `    ${p.name}: ${p.type === "string" ? '""' : p.type === "number" ? "0" : "undefined"},`)
        .join("\n")
    : "    // TODO: Add default values";

  return `import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";

const ${inputTypeName}Schema = z.object({
${formFields}
});

export type ${inputTypeName} = z.infer<typeof ${inputTypeName}Schema>;

export interface ${outputTypeName} {
  // TODO: Define output type
}

export interface ${spec.name}Return {
  form: UseFormReturn<${inputTypeName}>;
  mutation: ReturnType<typeof useMutation<${outputTypeName}, Error, ${inputTypeName}>>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

export function ${spec.name}(
  ${pathParamsSignature}${pathParamsSignature ? "," : ""}
  options?: {
    onSuccess?: (data: ${outputTypeName}) => void;
    onError?: (error: Error) => void;
    defaultValues?: Partial<${inputTypeName}>;
  }
): ${spec.name}Return {
  const queryClient = useQueryClient();

  const form = useForm<${inputTypeName}>({
    resolver: zodResolver(${inputTypeName}Schema),
    defaultValues: options?.defaultValues ?? {
${defaultValues}
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ${inputTypeName}) => {
      const response = await fetch(\`${endpointWithParams}\`, {
        method: "${spec.method}",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Form submission failed");
      return response.json() as Promise<${outputTypeName}>;
    },
    onSuccess: (data) => {
      ${invalidatesArray ? `queryClient.invalidateQueries({ queryKey: ${invalidatesArray} });` : "// TODO: Add cache invalidation if needed"}
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });

  const onSubmit = form.handleSubmit((data) => mutation.mutateAsync(data));

  return { form, mutation, onSubmit };
}
`;
}
