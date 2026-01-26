"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProgressUpdate, ProgressStatus, ProgressType } from "@/lib/guardian/progress-emitter";

interface ConnectionState {
  status: "connecting" | "connected" | "disconnected" | "error";
  lastConnected?: Date;
  reconnectAttempt?: number;
}

interface PhaseProgress {
  id: string;
  name: string;
  status: ProgressStatus;
  tasksCompleted: number;
  tasksTotal: number;
}

interface TaskState {
  id: string;
  status: ProgressStatus;
  message: string;
  phaseId?: string;
  timestamp: string;
  error?: string;
}

export default function GuardianLivePage() {
  const [connection, setConnection] = useState<ConnectionState>({ status: "disconnected" });
  const [events, setEvents] = useState<ProgressUpdate[]>([]);
  const [phases, setPhases] = useState<Map<string, PhaseProgress>>(new Map());
  const [tasks, setTasks] = useState<Map<string, TaskState>>(new Map());
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [errors, setErrors] = useState<ProgressUpdate[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buildLogRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);
  
  const MAX_EVENTS = 100;
  const MAX_BUILD_LOG_LINES = 200;
  const RECONNECT_DELAY = 3000;
  
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setConnection(prev => ({ ...prev, status: "connecting" }));
    
    const url = new URL("/api/guardian/stream", window.location.origin);
    url.searchParams.set("replay", "true");
    
    const es = new EventSource(url.toString());
    eventSourceRef.current = es;
    
    es.onopen = () => {
      setConnection({
        status: "connected",
        lastConnected: new Date(),
        reconnectAttempt: 0,
      });
    };
    
    es.onerror = () => {
      setConnection(prev => ({
        status: "error",
        lastConnected: prev.lastConnected,
        reconnectAttempt: (prev.reconnectAttempt || 0) + 1,
      }));
      
      es.close();
      
      // Auto-reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, RECONNECT_DELAY);
    };
    
    es.addEventListener("connect", (e: MessageEvent) => {
      handleEvent(JSON.parse(e.data));
    });
    
    es.addEventListener("replay", (e: MessageEvent) => {
      handleEvent(JSON.parse(e.data));
    });
    
    es.addEventListener("update", (e: MessageEvent) => {
      handleEvent(JSON.parse(e.data));
    });
    
    es.addEventListener("timeout", (e: MessageEvent) => {
      handleEvent(JSON.parse(e.data));
      // Will auto-reconnect via onerror
    });
  }, []);
  
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setConnection({ status: "disconnected" });
  }, []);
  
  const handleEvent = useCallback((update: ProgressUpdate) => {
    // Add to events list
    setEvents(prev => {
      const newEvents = [...prev, update];
      if (newEvents.length > MAX_EVENTS) {
        return newEvents.slice(-MAX_EVENTS);
      }
      return newEvents;
    });
    
    // Update state based on event type
    switch (update.type) {
      case "phase":
        setPhases(prev => {
          const newPhases = new Map(prev);
          const existing = newPhases.get(update.phaseId || "unknown");
          newPhases.set(update.phaseId || "unknown", {
            id: update.phaseId || "unknown",
            name: update.message,
            status: update.status,
            tasksCompleted: existing?.tasksCompleted || 0,
            tasksTotal: existing?.tasksTotal || 0,
          });
          return newPhases;
        });
        break;
        
      case "task":
        setTasks(prev => {
          const newTasks = new Map(prev);
          newTasks.set(update.taskId || "unknown", {
            id: update.taskId || "unknown",
            status: update.status,
            message: update.message,
            phaseId: update.phaseId,
            timestamp: update.timestamp,
            error: update.data?.error as string | undefined,
          });
          return newTasks;
        });
        
        // Update phase task counts
        if (update.phaseId && update.status === "completed") {
          setPhases(prev => {
            const newPhases = new Map(prev);
            const existing = newPhases.get(update.phaseId!);
            if (existing) {
              newPhases.set(update.phaseId!, {
                ...existing,
                tasksCompleted: existing.tasksCompleted + 1,
              });
            }
            return newPhases;
          });
        }
        break;
        
      case "build":
        if (update.data?.output) {
          setBuildLog(prev => {
            const lines = (update.data!.output as string).split("\n");
            const newLog = [...prev, ...lines];
            if (newLog.length > MAX_BUILD_LOG_LINES) {
              return newLog.slice(-MAX_BUILD_LOG_LINES);
            }
            return newLog;
          });
        }
        break;
        
      case "error":
        setErrors(prev => [...prev, update]);
        break;
        
      case "workflow":
        if (update.data?.progress) {
          setOverallProgress(update.data.progress as number);
        }
        break;
    }
    
    // Calculate overall progress from tasks
    setTasks(current => {
      const completed = Array.from(current.values()).filter(t => t.status === "completed").length;
      const total = current.size;
      if (total > 0) {
        setOverallProgress(Math.round((completed / total) * 100));
      }
      return current;
    });
  }, []);
  
  // Auto-scroll build log
  useEffect(() => {
    if (buildLogRef.current) {
      buildLogRef.current.scrollTop = buildLogRef.current.scrollHeight;
    }
  }, [buildLog]);
  
  // Auto-scroll events
  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [events]);
  
  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  const getStatusColor = (status: ProgressStatus): string => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "running": return "bg-blue-500";
      case "error": return "bg-red-500";
      case "waiting": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };
  
  const getStatusBadge = (status: ProgressStatus) => {
    const variants: Record<ProgressStatus, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      running: "secondary",
      error: "destructive",
      waiting: "outline",
      pending: "outline",
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };
  
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  const getTypeIcon = (type: ProgressType): string => {
    const icons: Record<ProgressType, string> = {
      workflow: "🔄",
      phase: "📦",
      task: "✅",
      build: "🔨",
      test: "🧪",
      error: "❌",
      hitl: "🚧",
      checkpoint: "💾",
    };
    return icons[type] || "📝";
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Live Dashboard
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Real-time workflow progress
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${
              connection.status === "connected" ? "bg-green-500" :
              connection.status === "connecting" ? "bg-yellow-500 animate-pulse" :
              "bg-red-500"
            }`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {connection.status === "connected" ? "Connected" :
               connection.status === "connecting" ? "Connecting..." :
               connection.status === "error" ? `Reconnecting (${connection.reconnectAttempt})` :
               "Disconnected"}
            </span>
          </div>
          
          <Button
            variant={connection.status === "connected" ? "outline" : "default"}
            size="sm"
            onClick={connection.status === "connected" ? disconnect : connect}
          >
            {connection.status === "connected" ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </div>
      
      {/* Overall Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-500">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.size})</TabsTrigger>
          <TabsTrigger value="build">Build Log</TabsTrigger>
          <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
          <TabsTrigger value="errors">
            Errors {errors.length > 0 && (
              <Badge variant="destructive" className="ml-2">{errors.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Phase Cards */}
            {Array.from(phases.values()).map(phase => (
              <Card key={phase.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{phase.name}</CardTitle>
                    {getStatusBadge(phase.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                    <span>Tasks</span>
                    <span>{phase.tasksCompleted} / {phase.tasksTotal || "?"}</span>
                  </div>
                  <Progress 
                    value={phase.tasksTotal ? (phase.tasksCompleted / phase.tasksTotal) * 100 : 0} 
                    className="h-1"
                  />
                </CardContent>
              </Card>
            ))}
            
            {phases.size === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-gray-500">
                  No phases started yet. Waiting for workflow...
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="tasks">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {Array.from(tasks.values())
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          task.status === "error" ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950" :
                          task.status === "completed" ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950" :
                          task.status === "running" ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950" :
                          ""
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{task.id}</span>
                            {task.phaseId && (
                              <Badge variant="outline" className="text-xs">
                                {task.phaseId}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {task.message}
                          </p>
                          {task.error && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                              {task.error}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            {formatTime(task.timestamp)}
                          </span>
                          {getStatusBadge(task.status)}
                        </div>
                      </div>
                    ))}
                  
                  {tasks.size === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      No tasks yet. Waiting for workflow...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="build">
          <Card>
            <CardHeader>
              <CardTitle>Build Output</CardTitle>
              <CardDescription>
                Real-time build and test output
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={buildLogRef}
                className="h-[400px] overflow-auto rounded-lg bg-gray-900 p-4 font-mono text-sm text-gray-100"
              >
                {buildLog.length > 0 ? (
                  buildLog.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap">
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">
                    No build output yet...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Event Timeline</CardTitle>
                  <CardDescription>
                    All workflow events
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEvents([])}
                >
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]" ref={eventsRef}>
                <div className="space-y-1">
                  {events.map((event, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded px-2 py-1 text-sm ${
                        event.status === "error" ? "bg-red-50 dark:bg-red-950" : ""
                      }`}
                    >
                      <span className="text-gray-400 font-mono text-xs">
                        {formatTime(event.timestamp)}
                      </span>
                      <span>{getTypeIcon(event.type)}</span>
                      <span className={`w-16 text-xs uppercase ${
                        event.status === "completed" ? "text-green-600" :
                        event.status === "error" ? "text-red-600" :
                        event.status === "running" ? "text-blue-600" :
                        "text-gray-500"
                      }`}>
                        {event.type}
                      </span>
                      <span className="flex-1 truncate">
                        {event.message}
                      </span>
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(event.status)}`} />
                    </div>
                  ))}
                  
                  {events.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      No events yet. Waiting for workflow...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Errors</CardTitle>
              <CardDescription>
                Error events that may need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {errors.map((error, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>❌</span>
                          {error.phaseId && (
                            <Badge variant="outline">{error.phaseId}</Badge>
                          )}
                          {error.taskId && (
                            <Badge variant="outline">{error.taskId}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTime(error.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {error.message}
                      </p>
                      {error.data?.error && (
                        <pre className="mt-2 rounded bg-red-100 p-2 text-xs text-red-800 dark:bg-red-900 dark:text-red-200 overflow-x-auto">
                          {String(error.data.error)}
                        </pre>
                      )}
                    </div>
                  ))}
                  
                  {errors.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      No errors. All good! 🎉
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
