import { z } from "zod";
import path from "path";
import type { Tool } from "../schema";

export const readFileTool: Tool = {
  id: "read-file",
  name: "read_file",
  description: "Read the contents of a file at a given path (relative to project root).",
  parameters: [
    {
      name: "path",
      type: "string",
      description: "The file path to read (relative to project root)",
      required: true,
    },
    {
      name: "projectRoot",
      type: "string",
      description: "The project root directory (injected by runtime)",
      required: false,
    },
  ],
  handler: "builtIn:readFile",
};

const readFileArgsSchema = z.object({
  path: z.string().min(1),
  projectRoot: z.string().optional(),
});

const BLOCKED_PATTERNS = [
  /\.\./,
  /^\/etc/,
  /^\/var/,
  /^\/usr/,
  /^\/root/,
  /^\/home(?!\/)/,
  /^~\//,
  /^[A-Z]:\\/i,
  /\.env/i,
  /\.pem$/i,
  /\.key$/i,
  /id_rsa/i,
  /\.ssh/i,
];

function validatePath(
  filePath: string,
  projectRoot?: string
): { valid: boolean; resolvedPath?: string; error?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(filePath)) {
      return { valid: false, error: `Blocked path pattern: ${filePath}` };
    }
  }

  if (path.isAbsolute(filePath)) {
    return { valid: false, error: "Absolute paths are not allowed. Use relative paths." };
  }

  const effectiveRoot = projectRoot || process.cwd();
  const resolvedPath = path.resolve(effectiveRoot, filePath);
  const normalizedRoot = path.resolve(effectiveRoot);

  if (!resolvedPath.startsWith(normalizedRoot + path.sep) && resolvedPath !== normalizedRoot) {
    return { valid: false, error: "Path traversal detected: path escapes project root" };
  }

  return { valid: true, resolvedPath };
}

export async function executeReadFile(
  args: Record<string, unknown>
): Promise<{ content: string; error?: string }> {
  const parseResult = readFileArgsSchema.safeParse(args);
  if (!parseResult.success) {
    return {
      content: "",
      error: `Invalid arguments: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const { path: filePath, projectRoot } = parseResult.data;

  const validation = validatePath(filePath, projectRoot);
  if (!validation.valid) {
    return {
      content: "",
      error: `Security: ${validation.error}`,
    };
  }

  return {
    content: `Mock file content for: ${validation.resolvedPath}. Implement actual file reading with fs.readFile.`,
  };
}
