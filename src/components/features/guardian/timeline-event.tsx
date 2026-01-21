"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { TimelineEvent, EventType } from "@/app/(protected)/guardian/timeline/types"

interface TimelineEventProps {
  event: TimelineEvent
}

const eventConfig: Record<EventType, { icon: string; color: string; bgColor: string }> = {
  tool: {
    icon: "🔧",
    color: "text-blue-600",
    bgColor: "bg-blue-100 border-blue-300",
  },
  nudge: {
    icon: "💡",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 border-yellow-300",
  },
  commit: {
    icon: "✓",
    color: "text-green-600",
    bgColor: "bg-green-100 border-green-300",
  },
  test: {
    icon: "🧪",
    color: "text-green-600",
    bgColor: "bg-green-100 border-green-300",
  },
  consultation: {
    icon: "📚",
    color: "text-purple-600",
    bgColor: "bg-purple-100 border-purple-300",
  },
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const eventTime = new Date(timestamp)
  const diffMs = now.getTime() - eventTime.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return "just now"
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`
  
  return eventTime.toLocaleDateString()
}

export function TimelineEventComponent({ event }: TimelineEventProps) {
  const [expanded, setExpanded] = useState(false)
  const config = eventConfig[event.type]

  return (
    <div className="relative flex gap-4 pb-6">
      <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gray-200" />
      
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg z-10",
          config.bgColor
        )}
      >
        {config.icon}
      </div>

      <div className="flex-1 min-w-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className={cn("font-medium", config.color)}>{event.title}</h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(event.timestamp)}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground truncate">{event.description}</p>
        </button>

        {expanded && event.details && (
          <div className="mt-2 rounded-md bg-muted p-3 text-xs">
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(event.details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
