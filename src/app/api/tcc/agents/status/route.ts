import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/tcc/agents";

export const dynamic = "force-dynamic";

interface AgentStatus {
  id: string;
  name: string;
  emoji: string;
  model: string;
  role: string;
  sessions: number;
  status: "online" | "offline" | "unknown";
  lastActivity?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Fetch session counts from each agent's gateway
    const agentStatuses = await Promise.all(
      AGENTS.map(async (agent): Promise<AgentStatus> => {
        try {
          // Get gateway URL and token from environment
          const gatewayUrl = process.env[`OPENCLAW_GATEWAY_URL_${agent.id.toUpperCase()}`]
            || `http://${agent.tailscaleIp}:${agent.gatewayPort}`;
          const gatewayToken = process.env[`OPENCLAW_GATEWAY_TOKEN_${agent.id.toUpperCase()}`]
            || process.env.OPENCLAW_GATEWAY_TOKEN;

          if (!gatewayToken) {
            return {
              id: agent.id,
              name: agent.name,
              emoji: agent.emoji,
              model: agent.model,
              role: agent.role,
              sessions: 0,
              status: "unknown",
              error: "Gateway token not configured",
            };
          }

          // Call gateway API to get sessions list
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const res = await fetch(`${gatewayUrl}/tools/invoke`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${gatewayToken}`,
            },
            body: JSON.stringify({ 
              tool: "sessions_list", 
              args: { limit: 100 } 
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            return {
              id: agent.id,
              name: agent.name,
              emoji: agent.emoji,
              model: agent.model,
              role: agent.role,
              sessions: 0,
              status: "offline",
              error: `Gateway returned ${res.status}`,
            };
          }

          const data = await res.json();
          const sessions = data.result?.details?.sessions || [];
          
          // Get last activity from most recent session
          let lastActivity: string | undefined;
          if (sessions.length > 0) {
            const sortedSessions = [...sessions].sort((a: any, b: any) => {
              const aTime = new Date(a.lastActivity || a.createdAt).getTime();
              const bTime = new Date(b.lastActivity || b.createdAt).getTime();
              return bTime - aTime;
            });
            lastActivity = sortedSessions[0].lastActivity || sortedSessions[0].createdAt;
          }

          return {
            id: agent.id,
            name: agent.name,
            emoji: agent.emoji,
            model: agent.model,
            role: agent.role,
            sessions: sessions.length,
            status: sessions.length > 0 ? "online" : "offline",
            lastActivity,
          };
        } catch (error) {
          // Network error or timeout
          return {
            id: agent.id,
            name: agent.name,
            emoji: agent.emoji,
            model: agent.model,
            role: agent.role,
            sessions: 0,
            status: "unknown",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    // Calculate summary stats
    const summary = {
      online: agentStatuses.filter(a => a.status === "online").length,
      offline: agentStatuses.filter(a => a.status === "offline").length,
      unknown: agentStatuses.filter(a => a.status === "unknown").length,
      totalSessions: agentStatuses.reduce((sum, a) => sum + a.sessions, 0),
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      agents: agentStatuses,
      summary,
    });
  } catch (error) {
    console.error("TCC agents status error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch agent statuses",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
