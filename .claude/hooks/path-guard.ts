/**
 * Claude Code Path Guard Hook
 * Protects sensitive files from Write/Edit operations
 * 
 * Cross-platform (Windows/Mac/Linux) using Bun
 * 
 * Exit codes:
 * - 0: Allow the operation
 * - 2: Block the operation (with reason)
 */

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id: string;
  cwd: string;
}

interface BlockResponse {
  decision: "block";
  reason: string;
}

interface AllowResponse {
  decision: "approve";
}

// Files that should NEVER be written to
const NEVER_WRITE: string[] = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "secrets/",
  "*.pem",
  "*.key",
  "*.p12",
  "*.pfx",
  "id_rsa",
  "id_ed25519",
  "credentials.json",
  "service-account.json",
];

// Files that require explicit confirmation (logged but allowed)
const SENSITIVE_WRITE: string[] = [
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
  "requirements.txt",
  "pyproject.toml",
  ".gitignore",
  "tsconfig.json",
  "next.config.js",
  "next.config.ts",
  "vite.config.ts",
  "tailwind.config.js",
  "tailwind.config.ts",
];

// System paths that should never be modified
const SYSTEM_PATHS: string[] = [
  "/etc/",
  "/usr/",
  "/bin/",
  "/sbin/",
  "/var/",
  "C:\\Windows\\",
  "C:\\Program Files\\",
];

function normalizePath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/~/g, process.env.HOME || "~");
}

function matchesPattern(filePath: string, pattern: string): boolean {
  const normalizedPath = normalizePath(filePath);
  const normalizedPattern = normalizePath(pattern);
  
  // Handle glob patterns
  if (normalizedPattern.includes("*")) {
    const regexPattern = normalizedPattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*");
    return new RegExp(regexPattern).test(normalizedPath);
  }
  
  // Handle directory patterns (ending with /)
  if (normalizedPattern.endsWith("/")) {
    return normalizedPath.startsWith(normalizedPattern) ||
           normalizedPath.includes(`/${normalizedPattern}`);
  }
  
  // Exact match or filename match
  return normalizedPath === normalizedPattern ||
         normalizedPath.endsWith(`/${normalizedPattern}`) ||
         normalizedPath.endsWith(normalizedPattern);
}

function checkNeverWrite(filePath: string): string | null {
  for (const pattern of NEVER_WRITE) {
    if (matchesPattern(filePath, pattern)) {
      return `Protected file: ${pattern} cannot be modified`;
    }
  }
  return null;
}

function checkSystemPaths(filePath: string): string | null {
  const normalizedPath = normalizePath(filePath);
  for (const systemPath of SYSTEM_PATHS) {
    if (normalizedPath.startsWith(normalizePath(systemPath))) {
      return `System path: ${systemPath} cannot be modified`;
    }
  }
  return null;
}

function isSensitiveFile(filePath: string): boolean {
  for (const pattern of SENSITIVE_WRITE) {
    if (matchesPattern(filePath, pattern)) {
      return true;
    }
  }
  return false;
}

// Log sensitive file modifications for review
async function logSensitiveModification(
  filePath: string,
  toolName: string
): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    file: filePath,
    tool: toolName,
    action: "sensitive_file_modified",
  };
  
  const logPath = `${process.env.CLAUDE_PROJECT_DIR || "."}/memory/file-modifications.jsonl`;
  
  try {
    await Bun.write(
      Bun.file(logPath),
      JSON.stringify(logEntry) + "\n",
      { append: true }
    );
  } catch {
    // Silently fail if logging doesn't work
  }
}

async function main(): Promise<void> {
  let input: HookInput;
  
  try {
    const text = await Bun.stdin.text();
    input = JSON.parse(text) as HookInput;
  } catch (error) {
    const response: BlockResponse = {
      decision: "block",
      reason: "Failed to parse hook input",
    };
    console.log(JSON.stringify(response));
    process.exit(2);
  }
  
  // Only check Write and Edit tools
  if (input.tool_name !== "Write" && input.tool_name !== "Edit") {
    const response: AllowResponse = { decision: "approve" };
    console.log(JSON.stringify(response));
    process.exit(0);
  }
  
  // Get the file path from tool input
  const filePath = (input.tool_input?.file_path as string) ||
                   (input.tool_input?.path as string) ||
                   "";
  
  if (!filePath) {
    // No file path found, allow (might be a different operation)
    const response: AllowResponse = { decision: "approve" };
    console.log(JSON.stringify(response));
    process.exit(0);
  }
  
  // Check against never-write list
  const neverWriteReason = checkNeverWrite(filePath);
  if (neverWriteReason) {
    const response: BlockResponse = {
      decision: "block",
      reason: `BLOCKED: ${neverWriteReason}`,
    };
    console.log(JSON.stringify(response));
    process.exit(2);
  }
  
  // Check against system paths
  const systemPathReason = checkSystemPaths(filePath);
  if (systemPathReason) {
    const response: BlockResponse = {
      decision: "block",
      reason: `BLOCKED: ${systemPathReason}`,
    };
    console.log(JSON.stringify(response));
    process.exit(2);
  }
  
  // Log sensitive file modifications (but allow)
  if (isSensitiveFile(filePath)) {
    await logSensitiveModification(filePath, input.tool_name);
  }
  
  // Allow the operation
  const response: AllowResponse = { decision: "approve" };
  console.log(JSON.stringify(response));
  process.exit(0);
}

main().catch((error) => {
  const response: BlockResponse = {
    decision: "block",
    reason: `Hook error: ${error instanceof Error ? error.message : "Unknown error"}`,
  };
  console.log(JSON.stringify(response));
  process.exit(2);
});
