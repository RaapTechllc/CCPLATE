import { completeJson } from "@/lib/ai";
import { ModelSchema, type Model } from "./spec";

const SCHEMA_GENERATION_PROMPT = `You are a Prisma schema generator. Given a description, generate a model specification.

Rules:
- Model names are PascalCase (e.g., BlogPost, UserProfile)
- Field names are camelCase (e.g., createdAt, firstName)
- Always include these standard fields:
  - id: String @id @default(cuid())
  - createdAt: DateTime @default(now())
  - updatedAt: DateTime @updatedAt
- Use appropriate field types:
  - String for text
  - Int for whole numbers
  - Float/Decimal for decimals
  - Boolean for true/false
  - DateTime for dates/times
  - Json for complex objects
- Add indexes for frequently queried fields (e.g., email, slug, status)
- Use @@map with snake_case table names (e.g., BlogPost -> "blog_posts")
- For optional fields, set isOptional: true
- For unique fields, set isUnique: true
- Common defaults:
  - id: "cuid()"
  - createdAt: "now()"
  - timestamps should use @updatedAt annotation (use default: "updatedAt" in the spec)

Output valid JSON matching this schema:
{
  "name": "ModelName",
  "tableName": "model_names",
  "fields": [
    { "name": "id", "type": "String", "isId": true, "default": "cuid()" },
    { "name": "fieldName", "type": "FieldType", "isOptional": false, "isUnique": false }
  ],
  "relations": [],
  "indexes": [{ "fields": ["fieldName"], "unique": false }]
}`;

export async function generateModelFromDescription(
  description: string
): Promise<Model> {
  const response = await completeJson(ModelSchema, {
    messages: [
      {
        role: "system",
        content: SCHEMA_GENERATION_PROMPT,
      },
      {
        role: "user",
        content: `Generate a Prisma model for: ${description}`,
      },
    ],
  });

  return response;
}

export async function generateModelWithContext(
  description: string,
  existingModels: string[]
): Promise<Model> {
  const contextPrompt = existingModels.length > 0
    ? `\n\nExisting models in the schema: ${existingModels.join(", ")}\nYou can create relations to these existing models if appropriate.`
    : "";

  const response = await completeJson(ModelSchema, {
    messages: [
      {
        role: "system",
        content: SCHEMA_GENERATION_PROMPT + contextPrompt,
      },
      {
        role: "user",
        content: `Generate a Prisma model for: ${description}`,
      },
    ],
  });

  return response;
}

export function getExampleDescriptions(): string[] {
  return [
    "A blog post with title, content, published status, and author relationship",
    "A product with name, description, price, stock quantity, and category",
    "A comment with text content, author, and parent post relationship",
    "An order with items, total amount, status, and customer information",
    "A tag that can be applied to multiple posts (many-to-many)",
    "A notification with message, read status, type, and recipient",
  ];
}
