"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Activity } from "lucide-react";

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

interface AgentStatusResponse {
  success: boolean;
  timestamp: string;
  agents: AgentStatus[];
  summary: {
    online: number;
    offline: number;
    unknown: number;
    totalSessions: number;
  };
}

export function AgentStatusWidget() {
  const [data, setData] = useState<AgentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchAgentStatus = async () => {
    try {
      setError(null);
      const res = await fetch("/api/tcc/agents/status");
      
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }

      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Agent status fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentStatus();
    
    // Poll every 60 seconds
    const interval = setInterval(fetchAgentStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: AgentStatus["status"]) => {
    switch (status) {
      case "online": return "text-green-500";
      case "offline": return "text-zinc-500";
      case "unknown": return "text-yellow-500";
    }
  };

  const getStatusDot = (status: AgentStatus["status"]) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "offline": return "bg-zinc-600";
      case "unknown": return "bg-yellow-500";
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "—";
    
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Agent Status
          </h2>
        </div>
        <div className="flex items-center justify-center py-12 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading agent status...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Agent Status
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <p className="text-red-500 mb-3">Failed to load agent status</p>
          <p className="text-sm text-zinc-600 mb-4">{error}</p>
          <button
            onClick={fetchAgentStatus}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Agent Status
        </h2>
        <button
          onClick={fetchAgentStatus}
          className="p-1.5 hover:bg-zinc-800 rounded transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Summary Bar */}
      {data && (
        <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-zinc-800/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{data.summary.online}</div>
            <div className="text-xs text-zinc-500">Online</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-500">{data.summary.offline}</div>
            <div className="text-xs text-zinc-500">Offline</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">{data.summary.unknown}</div>
            <div className="text-xs text-zinc-500">Unknown</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{data.summary.totalSessions}</div>
            <div className="text-xs text-zinc-500">Sessions</div>
          </div>
        </div>
      )}

      {/* Agent Cards */}
      {data && (
        <div className="space-y-2">
          {data.agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition"
            >
              {/* Status Indicator */}
              <div className="relative">
                <span className="text-2xl">{agent.emoji}</span>
                <span 
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${getStatusDot(agent.status)} border-2 border-zinc-900`}
                />
              </div>

              {/* Agent Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-zinc-100">{agent.name}</span>
                  <span className="text-xs text-zinc-600">•</span>
                  <span className="text-xs text-zinc-500">{agent.role}</span>
                </div>
                <div className="text-xs text-zinc-600">{agent.model}</div>
              </div>

              {/* Session Count */}
              <div className="text-right">
                <div className={`text-lg font-semibold ${agent.sessions > 0 ? 'text-blue-400' : 'text-zinc-600'}`}>
                  {agent.sessions}
                </div>
                <div className="text-[10px] text-zinc-600">
                  {agent.sessions === 1 ? 'session' : 'sessions'}
                </div>
              </div>

              {/* Last Activity */}
              <div className="text-right min-w-[60px]">
                <div className={`text-xs ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </div>
                <div className="text-[10px] text-zinc-600">
                  {formatTimeAgo(agent.lastActivity)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {lastUpdate && (
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <div className="text-xs text-zinc-600 text-center">
            Last updated: {formatTimeAgo(lastUpdate.toISOString())}
          </div>
        </div>
      )}
    </div>
  );
}
