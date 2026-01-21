import type { Tool } from "../schema";
import { webSearchTool, executeWebSearch } from "./web-search";
import { readFileTool, executeReadFile } from "./read-file";
import { httpRequestTool, executeHttpRequest } from "./http-request";

export const builtInTools: Record<string, Tool> = {
  webSearch: webSearchTool,
  readFile: readFileTool,
  httpRequest: httpRequestTool,
};

export const builtInToolsList: Tool[] = Object.values(builtInTools);

type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown>;

export const toolExecutors: Record<string, ToolExecutor> = {
  "builtIn:webSearch": executeWebSearch as ToolExecutor,
  "builtIn:readFile": executeReadFile as ToolExecutor,
  "builtIn:httpRequest": executeHttpRequest as ToolExecutor,
};

export function getToolByHandler(handler: string): ToolExecutor | undefined {
  return toolExecutors[handler];
}

export { webSearchTool, readFileTool, httpRequestTool };
