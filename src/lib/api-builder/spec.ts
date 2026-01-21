import { z } from "zod";

export const EndpointMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export const EndpointParamSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
});

export const EndpointSchema = z.object({
  method: EndpointMethodSchema,
  path: z.string(),
  description: z.string().optional(),
  auth: z.enum(["none", "required", "admin"]).default("required"),
  input: z.object({
    params: z.array(EndpointParamSchema).default([]),
    query: z.array(EndpointParamSchema).default([]),
    body: z.string().optional(),
  }).optional(),
  output: z.string().optional(),
  pagination: z.boolean().default(false),
});

export const APISpecSchema = z.object({
  name: z.string(),
  basePath: z.string(),
  model: z.string(),
  endpoints: z.array(EndpointSchema),
});

export type EndpointMethod = z.infer<typeof EndpointMethodSchema>;
export type EndpointParam = z.infer<typeof EndpointParamSchema>;
export type Endpoint = z.infer<typeof EndpointSchema>;
export type APISpec = z.infer<typeof APISpecSchema>;
