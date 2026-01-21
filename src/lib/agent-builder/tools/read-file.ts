import type { Tool } from "../schema";

export const readFileTool: Tool = {
  id: "read-file",
  name: "read_file",
  description: "Read the contents of a file at a given path.",
  parameters: [
    {
      name: "path",
      type: "string",
      description: "The file path to read",
      required: true,
    },
  ],
  handler: "builtIn:readFile",
};

export async function executeReadFile(args: {
  path: string;
}): Promise<{ content: string; error?: string }> {
  return {
    content: `Mock file content for: ${args.path}. Implement actual file reading with proper sandboxing.`,
  };
}
