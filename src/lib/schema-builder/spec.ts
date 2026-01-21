import { z } from "zod";

export const FieldTypeSchema = z.enum([
  "String",
  "Int",
  "Float",
  "Boolean",
  "DateTime",
  "Json",
  "Bytes",
  "BigInt",
  "Decimal",
]);

export const RelationTypeSchema = z.enum([
  "one-to-one",
  "one-to-many",
  "many-to-many",
]);

export const FieldSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  isOptional: z.boolean().default(false),
  isUnique: z.boolean().default(false),
  isId: z.boolean().default(false),
  default: z.string().optional(),
  dbType: z.string().optional(),
});

export const RelationSchema = z.object({
  name: z.string(),
  model: z.string(),
  type: RelationTypeSchema,
  fields: z.array(z.string()).optional(),
  references: z.array(z.string()).optional(),
  onDelete: z.enum(["Cascade", "SetNull", "Restrict", "NoAction"]).optional(),
});

export const IndexSchema = z.object({
  fields: z.array(z.string()),
  unique: z.boolean().default(false),
});

export const ModelSchema = z.object({
  name: z.string(),
  tableName: z.string().optional(),
  fields: z.array(FieldSchema),
  relations: z.array(RelationSchema).default([]),
  indexes: z.array(IndexSchema).default([]),
});

export type FieldType = z.infer<typeof FieldTypeSchema>;
export type RelationType = z.infer<typeof RelationTypeSchema>;
export type Field = z.infer<typeof FieldSchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type Index = z.infer<typeof IndexSchema>;
export type Model = z.infer<typeof ModelSchema>;
