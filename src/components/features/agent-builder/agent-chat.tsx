"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import type { AgentMessage } from "@/lib/agent-builder/runtime";

interface AgentChatProps {
  agentId: string;
  agentName: string;
}

export function AgentChat({ agentId, agentName }: AgentChatProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: AgentMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${agentId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error("Failed to run agent");
      }

      const result = await response.json();

      if (result.success) {
        const newMessages = result.messages.slice(1);
        setMessages((prev) => [...prev, ...newMessages]);
      } else {
        setError(result.error || "Agent run failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">Test Chat - {agentName}</CardTitle>
        <Button variant="ghost" size="sm" onClick={clearChat}>
          Clear
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 pb-0">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Send a message to test your agent
          </p>
        )}
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-pulse">●</div>
            Agent is thinking...
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            Error: {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        <Button type="submit" loading={isLoading}>
          Send
        </Button>
      </form>
    </Card>
  );
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  if (isTool && message.toolResult) {
    return (
      <div className="bg-muted/50 rounded-md p-3 text-sm">
        <div className="font-medium text-xs text-muted-foreground mb-1">
          Tool: {message.toolResult.name}
        </div>
        <CodeBlock 
          code={JSON.stringify(message.toolResult.result, null, 2)} 
          language="json" 
          showLineNumbers={false}
          className="text-xs"
        />
      </div>
    );
  }

  if (message.toolCall) {
    return (
      <div className="space-y-2">
        <div
          className={`rounded-lg px-4 py-2 max-w-[80%] ${
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-muted"
          }`}
        >
          <div className="whitespace-pre-wrap text-sm">
            {message.content.replace(/<tool_call>[\s\S]*<\/tool_call>/, "").trim() || "Using tool..."}
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950 rounded-md p-3 text-sm">
          <div className="font-medium text-xs text-blue-600 dark:text-blue-400 mb-1">
            Tool Call: {message.toolCall.name}
          </div>
          <CodeBlock 
            code={JSON.stringify(message.toolCall.arguments, null, 2)} 
            language="json" 
            showLineNumbers={false}
            className="text-xs"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg px-4 py-2 max-w-[80%] ${
        isUser
          ? "bg-primary text-primary-foreground ml-auto"
          : "bg-muted"
      }`}
    >
      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
    </div>
  );
}
