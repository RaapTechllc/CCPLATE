/**
 * Guardian Progress Stream API
 * 
 * Server-Sent Events (SSE) endpoint for real-time workflow progress.
 * Streams task status, build output, test results, and phase transitions.
 */

import { NextRequest } from "next/server";
import {
  progressEmitter,
  loadProgressEvents,
  type ProgressUpdate,
  type ProgressType
} from "@/lib/guardian/progress-emitter";
import { requireAuth } from "@/lib/auth";

// Force dynamic rendering for SSE
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Maximum connection time (5 minutes)
const MAX_CONNECTION_TIME = 5 * 60 * 1000;

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

/**
 * GET /api/guardian/stream
 * 
 * Establishes SSE connection for real-time progress updates.
 * 
 * Query params:
 * - types: Comma-separated list of event types to filter
 * - since: ISO timestamp to replay events from
 * - replay: "true" to replay buffered events on connect
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { authenticated } = await requireAuth();
  if (!authenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  
  // Parse filters
  const typesParam = searchParams.get("types");
  const types = typesParam 
    ? typesParam.split(",") as ProgressType[]
    : undefined;
  
  const since = searchParams.get("since") || undefined;
  const replay = searchParams.get("replay") === "true";
  
  // Create response stream
  const encoder = new TextEncoder();
  let closed = false;
  let subscriptionId: string | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let connectionTimer: NodeJS.Timeout | null = null;
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectEvent = formatSSE({
        type: "workflow",
        status: "running",
        message: "Connected to progress stream",
        timestamp: new Date().toISOString(),
      }, "connect");
      controller.enqueue(encoder.encode(connectEvent));
      
      // Replay buffered events if requested
      if (replay || since) {
        const rootDir = process.cwd();
        const events = loadProgressEvents(rootDir, since);
        
        // Filter by types if specified
        const filteredEvents = types 
          ? events.filter(e => types.includes(e.type))
          : events;
        
        for (const event of filteredEvents) {
          if (closed) break;
          const data = formatSSE(event, "replay");
          controller.enqueue(encoder.encode(data));
        }
      }
      
      // Subscribe to new events
      subscriptionId = progressEmitter.subscribe((update) => {
        if (closed) return;
        
        try {
          const data = formatSSE(update, "update");
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error("Error sending SSE update:", error);
        }
      }, types);
      
      // Set up heartbeat
      heartbeatTimer = setInterval(() => {
        if (closed) return;
        
        try {
          const heartbeat = `: heartbeat ${Date.now()}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          cleanup();
        }
      }, HEARTBEAT_INTERVAL);
      
      // Set max connection time
      connectionTimer = setTimeout(() => {
        if (!closed) {
          const endEvent = formatSSE({
            type: "workflow",
            status: "completed",
            message: "Connection timeout - reconnect to continue",
            timestamp: new Date().toISOString(),
          }, "timeout");
          
          try {
            controller.enqueue(encoder.encode(endEvent));
          } catch {
            // Ignore
          }
          
          cleanup();
          controller.close();
        }
      }, MAX_CONNECTION_TIME);
      
      function cleanup() {
        closed = true;
        
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        
        if (connectionTimer) {
          clearTimeout(connectionTimer);
          connectionTimer = null;
        }
        
        if (subscriptionId) {
          progressEmitter.unsubscribe(subscriptionId);
          subscriptionId = null;
        }
      }
    },
    
    cancel() {
      closed = true;
      
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      
      if (connectionTimer) {
        clearTimeout(connectionTimer);
      }
      
      if (subscriptionId) {
        progressEmitter.unsubscribe(subscriptionId);
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Format progress update as SSE message
 */
function formatSSE(update: ProgressUpdate, eventType: string): string {
  const lines: string[] = [];
  
  lines.push(`event: ${eventType}`);
  lines.push(`id: ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  lines.push(`data: ${JSON.stringify(update)}`);
  lines.push("");
  lines.push("");
  
  return lines.join("\n");
}

/**
 * POST /api/guardian/stream
 * 
 * Manually emit a progress event (for testing or external integrations).
 */
export async function POST(request: NextRequest): Promise<Response> {
  const { authenticated } = await requireAuth();
  if (!authenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    const { type, status, message, phaseId, taskId, data } = body;
    
    if (!type || !status || !message) {
      return Response.json(
        { error: "Missing required fields: type, status, message" },
        { status: 400 }
      );
    }
    
    const update: ProgressUpdate = {
      type,
      status,
      message,
      timestamp: new Date().toISOString(),
      phaseId,
      taskId,
      data,
    };
    
    progressEmitter.emit(update);
    
    return Response.json({ success: true, update });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}
