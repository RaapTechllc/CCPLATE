import { z } from "zod";
import { extractJsonFromText } from "./json";
import { AIError } from "../errors";

export function parseWithSchema<T extends z.ZodSchema>(
  text: string,
  schema: T
): z.infer<T> {
  let jsonString = text;

  try {
    JSON.parse(text);
  } catch {
    const extracted = extractJsonFromText(text);
    if (!extracted) {
      throw new AIError(
        "Could not extract JSON from AI response",
        "JSON_EXTRACTION_FAILED"
      );
    }
    jsonString = extracted;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new AIError(
      `Invalid JSON in AI response: ${(error as Error).message}`,
      "JSON_PARSE_FAILED"
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new AIError(
      `AI response validation failed: ${issues}`,
      "VALIDATION_FAILED"
    );
  }

  return result.data;
}
