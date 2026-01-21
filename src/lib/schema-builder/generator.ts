import type { Model, Field, Relation, Index } from "./spec";

const RESERVED_WORDS = new Set([
  "model",
  "enum",
  "datasource",
  "generator",
  "type",
  "abstract",
  "embed",
]);

export function validateModelName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: "Model name is required" };
  }

  if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
    return { valid: false, error: "Model name must be PascalCase (start with uppercase letter)" };
  }

  if (RESERVED_WORDS.has(name.toLowerCase())) {
    return { valid: false, error: `"${name}" is a reserved Prisma keyword` };
  }

  return { valid: true };
}

function generateFieldLine(field: Field): string {
  const parts: string[] = [field.name];

  let typeStr = field.type;
  if (field.isOptional) {
    typeStr += "?";
  }
  parts.push(typeStr);

  const attributes: string[] = [];

  if (field.isId) {
    attributes.push("@id");
  }

  if (field.isUnique && !field.isId) {
    attributes.push("@unique");
  }

  if (field.default) {
    attributes.push(`@default(${field.default})`);
  }

  if (field.dbType) {
    attributes.push(field.dbType);
  }

  if (attributes.length > 0) {
    parts.push(attributes.join(" "));
  }

  return "  " + parts.join(" ");
}

function generateRelationField(relation: Relation): string[] {
  const lines: string[] = [];

  if (relation.type === "one-to-many") {
    lines.push(`  ${relation.name} ${relation.model}[]`);
  } else if (relation.type === "many-to-many") {
    lines.push(`  ${relation.name} ${relation.model}[]`);
  } else {
    const isOptional = relation.type === "one-to-one";
    const fieldRef = relation.fields?.[0] || `${relation.name.toLowerCase()}Id`;
    const refField = relation.references?.[0] || "id";
    const onDelete = relation.onDelete ? `, onDelete: ${relation.onDelete}` : "";

    lines.push(`  ${fieldRef} String${isOptional ? "?" : ""}`);
    lines.push(
      `  ${relation.name} ${relation.model}${isOptional ? "?" : ""} @relation(fields: [${fieldRef}], references: [${refField}]${onDelete})`
    );
  }

  return lines;
}

function generateIndex(index: Index): string {
  const fields = index.fields.join(", ");
  if (index.unique) {
    return `  @@unique([${fields}])`;
  }
  return `  @@index([${fields}])`;
}

export function generatePrismaModel(model: Model): string {
  const validation = validateModelName(model.name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const lines: string[] = [];
  lines.push(`model ${model.name} {`);

  for (const field of model.fields) {
    lines.push(generateFieldLine(field));
  }

  if (model.relations.length > 0) {
    lines.push("");
    for (const relation of model.relations) {
      lines.push(...generateRelationField(relation));
    }
  }

  if (model.indexes.length > 0 || model.tableName) {
    lines.push("");

    for (const index of model.indexes) {
      lines.push(generateIndex(index));
    }

    if (model.tableName) {
      lines.push(`  @@map("${model.tableName}")`);
    }
  }

  lines.push("}");

  return lines.join("\n");
}

export function generateRelationFields(model: Model): Map<string, string[]> {
  const relatedFields = new Map<string, string[]>();

  for (const relation of model.relations) {
    const relatedModel = relation.model;

    if (!relatedFields.has(relatedModel)) {
      relatedFields.set(relatedModel, []);
    }

    const fields = relatedFields.get(relatedModel)!;

    if (relation.type === "one-to-many") {
      const fieldName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
      const foreignKey = `${fieldName}Id`;
      fields.push(`  ${foreignKey} String`);
      fields.push(
        `  ${fieldName} ${model.name} @relation(fields: [${foreignKey}], references: [id])`
      );
    } else if (relation.type === "many-to-many") {
      const fieldName = model.name.charAt(0).toLowerCase() + model.name.slice(1) + "s";
      fields.push(`  ${fieldName} ${model.name}[]`);
    } else if (relation.type === "one-to-one") {
      const fieldName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
      fields.push(`  ${fieldName} ${model.name}?`);
    }
  }

  return relatedFields;
}

export function formatPrismaModel(modelBlock: string): string {
  const lines = modelBlock.split("\n");
  const formatted: string[] = [];

  let maxNameLength = 0;
  let maxTypeLength = 0;

  const fieldLines: { original: string; name: string; type: string; rest: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("model ") ||
      trimmed === "}" ||
      trimmed === "" ||
      trimmed.startsWith("@@")
    ) {
      fieldLines.push({ original: line, name: "", type: "", rest: "" });
      continue;
    }

    const match = trimmed.match(/^(\w+)\s+(\w+\??)\s*(.*)?$/);
    if (match) {
      const [, name, type, rest = ""] = match;
      maxNameLength = Math.max(maxNameLength, name.length);
      maxTypeLength = Math.max(maxTypeLength, type.length);
      fieldLines.push({ original: line, name, type, rest });
    } else {
      fieldLines.push({ original: line, name: "", type: "", rest: "" });
    }
  }

  for (const field of fieldLines) {
    if (field.name) {
      const paddedName = field.name.padEnd(maxNameLength);
      const paddedType = field.type.padEnd(maxTypeLength);
      formatted.push(`  ${paddedName} ${paddedType} ${field.rest}`.trimEnd());
    } else {
      formatted.push(field.original);
    }
  }

  return formatted.join("\n");
}
