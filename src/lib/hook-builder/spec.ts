import { z } from "zod";

export const HookParamSchema = z.object({
  name: z.string(),
  type: z.string(),
  location: z.enum(["path", "query", "body"]).default("query"),
  optional: z.boolean().default(false),
});

export const PaginationSchema = z.object({
  style: z.enum(["cursor", "offset"]),
  cursorField: z.string().optional(),
  pageSizeParam: z.string().default("limit"),
});

export const HookSpecSchema = z.object({
  name: z.string().regex(/^use[A-Z]/, "Hook name must start with 'use'"),
  description: z.string().optional(),
  kind: z.enum(["query", "infiniteQuery", "mutation", "form"]),
  endpoint: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  inputType: z.string().optional(),
  outputType: z.string().optional(),
  params: z.array(HookParamSchema).default([]),
  pagination: PaginationSchema.optional(),
  invalidates: z.array(z.string()).default([]),
});

export type HookSpec = z.infer<typeof HookSpecSchema>;
export type HookParam = z.infer<typeof HookParamSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
