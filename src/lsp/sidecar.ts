import { spawn, ChildProcess } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";

interface Position {
  line: number;
  character: number;
}

interface Diagnostic {
  range: {
    start: Position;
    end: Position;
  };
  severity: number;
  message: string;
  source?: string;
}



export class LSPClient {
  private process: ChildProcess | null = null;
  private messageId = 0;
  private pendingRequests: Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  > = new Map();
  private buffer = "";
  private rootPath: string;
  private initialized = false;

  constructor(rootPath: string) {
    this.rootPath = resolve(rootPath);
  }

  async start(): Promise<void> {
    if (this.process) return;

    const tsserverPath = this.findTsServer();
    if (!tsserverPath) {
      throw new Error(
        "tsserver not found. Install TypeScript: npm install typescript"
      );
    }

    this.process = spawn(tsserverPath, ["--stdio"], {
      cwd: this.rootPath,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process.stdout?.on("data", (data: Buffer) => {
      this.handleData(data.toString());
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      console.error("tsserver stderr:", data.toString());
    });

    this.process.on("exit", (code) => {
      this.process = null;
      this.initialized = false;
      if (code !== 0) {
        console.error(`tsserver exited with code ${code}`);
      }
    });

    await this.initialize();
  }

  private findTsServer(): string | null {
    const localPath = join(
      this.rootPath,
      "node_modules",
      ".bin",
      "tsserver"
    );
    if (existsSync(localPath)) return localPath;

    const localTypescriptPath = join(
      this.rootPath,
      "node_modules",
      "typescript",
      "bin",
      "tsserver"
    );
    if (existsSync(localTypescriptPath)) return localTypescriptPath;

    try {
      const globalPath = require.resolve("typescript/bin/tsserver");
      if (existsSync(globalPath)) return globalPath;
    } catch {
      // Not found globally
    }

    return null;
  }

  private async initialize(): Promise<void> {
    await this.sendCommand("configure", {
      hostInfo: "ccplate-cli",
      preferences: {
        includeCompletionsForModuleExports: true,
        includeCompletionsWithInsertText: true,
      },
    });
    this.initialized = true;
  }

  private handleData(data: string): void {
    this.buffer += data;

    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const header = this.buffer.slice(0, headerEnd);
      const contentLengthMatch = header.match(/Content-Length: (\d+)/);
      if (!contentLengthMatch) {
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;

      if (this.buffer.length < bodyEnd) break;

      const body = this.buffer.slice(bodyStart, bodyEnd);
      this.buffer = this.buffer.slice(bodyEnd);

      try {
        const message = JSON.parse(body);
        this.handleMessage(message);
      } catch {
        // Ignore parse errors
      }
    }
  }

  private handleMessage(message: {
    type: string;
    request_seq?: number;
    success?: boolean;
    body?: unknown;
    message?: string;
  }): void {
    if (message.type === "response" && message.request_seq !== undefined) {
      const pending = this.pendingRequests.get(message.request_seq);
      if (pending) {
        this.pendingRequests.delete(message.request_seq);
        if (message.success) {
          pending.resolve(message.body);
        } else {
          pending.reject(new Error(message.message || "Request failed"));
        }
      }
    }
  }

  private sendCommand(
    command: string,
    args?: Record<string, unknown>
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error("tsserver not started"));
        return;
      }

      const seq = ++this.messageId;
      const request = {
        seq,
        type: "request",
        command,
        arguments: args,
      };

      this.pendingRequests.set(seq, { resolve, reject });

      const content = JSON.stringify(request);
      const message = `Content-Length: ${content.length}\r\n\r\n${content}`;
      this.process.stdin.write(message);

      setTimeout(() => {
        if (this.pendingRequests.has(seq)) {
          this.pendingRequests.delete(seq);
          reject(new Error(`Request timed out: ${command}`));
        }
      }, 10000);
    });
  }

  async openFile(filePath: string): Promise<void> {
    const absPath = resolve(this.rootPath, filePath);
    await this.sendCommand("open", { file: absPath });
  }

  async getDefinition(
    filePath: string,
    line: number,
    column: number
  ): Promise<{ file: string; line: number; column: number; text: string }[]> {
    const absPath = resolve(this.rootPath, filePath);
    await this.openFile(filePath);

    const response = (await this.sendCommand("definition", {
      file: absPath,
      line,
      offset: column,
    })) as Array<{
      file: string;
      start: { line: number; offset: number };
      contextStart?: { line: number; offset: number };
    }>;

    if (!response || !Array.isArray(response)) return [];

    return response.map((def) => ({
      file: this.relativePath(def.file),
      line: def.start.line,
      column: def.start.offset,
      text: "",
    }));
  }

  async getReferences(
    symbol: string,
    limit = 50
  ): Promise<{ file: string; line: number; column: number }[]> {
    const files = this.findTypeScriptFiles(this.rootPath);
    const results: { file: string; line: number; column: number }[] = [];

    for (const file of files) {
      if (results.length >= limit) break;

      try {
        await this.openFile(file);
        const absPath = resolve(this.rootPath, file);

        const navItems = (await this.sendCommand("navtree", {
          file: absPath,
        })) as { text: string; spans: Array<{ start: { line: number; offset: number } }> };

        if (navItems) {
          const found = this.findSymbolInNavTree(navItems, symbol);
          for (const loc of found) {
            if (results.length >= limit) break;
            results.push({
              file: this.relativePath(file),
              line: loc.line,
              column: loc.column,
            });
          }
        }
      } catch {
        // Skip files that can't be processed
      }
    }

    return results;
  }

  private findSymbolInNavTree(
    node: {
      text: string;
      spans?: Array<{ start: { line: number; offset: number } }>;
      childItems?: Array<{
        text: string;
        spans?: Array<{ start: { line: number; offset: number } }>;
        childItems?: Array<unknown>;
      }>;
    },
    symbol: string
  ): { line: number; column: number }[] {
    const results: { line: number; column: number }[] = [];

    if (node.text === symbol && node.spans?.[0]) {
      results.push({
        line: node.spans[0].start.line,
        column: node.spans[0].start.offset,
      });
    }

    if (node.childItems) {
      for (const child of node.childItems) {
        results.push(...this.findSymbolInNavTree(child as typeof node, symbol));
      }
    }

    return results;
  }

  async getDiagnostics(filePath?: string): Promise<Diagnostic[]> {
    const files = filePath
      ? [resolve(this.rootPath, filePath)]
      : this.findTypeScriptFiles(this.rootPath).map((f) =>
          resolve(this.rootPath, f)
        );

    const allDiagnostics: Diagnostic[] = [];

    for (const file of files.slice(0, 50)) {
      try {
        await this.openFile(this.relativePath(file));

        const semanticResponse = (await this.sendCommand(
          "semanticDiagnosticsSync",
          { file, includeLinePosition: true }
        )) as Array<{
          startLocation: { line: number; offset: number };
          endLocation: { line: number; offset: number };
          category: string;
          text: string;
        }>;

        const syntacticResponse = (await this.sendCommand(
          "syntacticDiagnosticsSync",
          { file, includeLinePosition: true }
        )) as Array<{
          startLocation: { line: number; offset: number };
          endLocation: { line: number; offset: number };
          category: string;
          text: string;
        }>;

        const diagnostics = [...(semanticResponse || []), ...(syntacticResponse || [])];

        for (const diag of diagnostics) {
          allDiagnostics.push({
            range: {
              start: {
                line: diag.startLocation.line,
                character: diag.startLocation.offset,
              },
              end: {
                line: diag.endLocation.line,
                character: diag.endLocation.offset,
              },
            },
            severity: diag.category === "error" ? 1 : 2,
            message: diag.text,
            source: this.relativePath(file),
          });
        }
      } catch {
        // Skip files that can't be processed
      }
    }

    return allDiagnostics;
  }

  async getSymbols(
    path: string
  ): Promise<{ name: string; kind: string; file: string; line: number }[]> {
    const absPath = resolve(this.rootPath, path);
    const files = statSync(absPath).isDirectory()
      ? this.findTypeScriptFiles(absPath)
      : [path];

    const symbols: { name: string; kind: string; file: string; line: number }[] =
      [];

    for (const file of files) {
      try {
        await this.openFile(file);
        const navTree = (await this.sendCommand("navtree", {
          file: resolve(this.rootPath, file),
        })) as {
          text: string;
          kind: string;
          spans?: Array<{ start: { line: number } }>;
          childItems?: Array<unknown>;
        };

        if (navTree) {
          this.extractSymbols(navTree, file, symbols);
        }
      } catch {
        // Skip files that can't be processed
      }
    }

    return symbols;
  }

  private extractSymbols(
    node: {
      text: string;
      kind: string;
      spans?: Array<{ start: { line: number } }>;
      childItems?: Array<unknown>;
    },
    file: string,
    symbols: { name: string; kind: string; file: string; line: number }[]
  ): void {
    const ignoredKinds = ["module", "script"];
    if (!ignoredKinds.includes(node.kind) && node.text && node.spans?.[0]) {
      symbols.push({
        name: node.text,
        kind: node.kind,
        file: this.relativePath(file),
        line: node.spans[0].start.line,
      });
    }

    if (node.childItems) {
      for (const child of node.childItems) {
        this.extractSymbols(
          child as typeof node,
          file,
          symbols
        );
      }
    }
  }

  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const ignoreDirs = ["node_modules", ".next", ".git", "dist", ".worktrees"];

    const walk = (currentDir: string) => {
      try {
        const entries = readdirSync(currentDir);
        for (const entry of entries) {
          if (ignoreDirs.includes(entry)) continue;

          const fullPath = join(currentDir, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
            files.push(this.relativePath(fullPath));
          }
        }
      } catch {
        // Skip directories we can't read
      }
    };

    walk(dir);
    return files;
  }

  private relativePath(absPath: string): string {
    if (absPath.startsWith(this.rootPath)) {
      return absPath.slice(this.rootPath.length + 1);
    }
    return absPath;
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.initialized = false;
  }
}

export function createLSPClient(rootPath: string): LSPClient {
  return new LSPClient(rootPath);
}
