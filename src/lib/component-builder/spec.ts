import { z } from "zod";

export const PropSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean().default(true),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
});

export const ComponentSpecSchema = z.object({
  name: z.string().regex(/^[A-Z]/, "Component name must be PascalCase"),
  description: z.string().optional(),
  type: z.enum(["client", "server"]).default("client"),
  props: z.array(PropSchema).default([]),
  hasChildren: z.boolean().default(false),
  styling: z.enum(["tailwind", "css-modules", "inline"]).default("tailwind"),
  features: z.array(z.enum([
    "loading-state",
    "error-state",
    "empty-state",
    "pagination",
    "search",
    "sorting",
    "responsive",
    "dark-mode",
    "animations",
  ])).default([]),
  dataSource: z.object({
    type: z.enum(["props", "fetch", "hook"]),
    endpoint: z.string().optional(),
    hookName: z.string().optional(),
  }).optional(),
});

export type Prop = z.infer<typeof PropSchema>;
export type ComponentSpec = z.infer<typeof ComponentSpecSchema>;
