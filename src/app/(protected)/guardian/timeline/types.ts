export type TimeRange = "1h" | "4h" | "today" | "all"

export type EventType = "tool" | "nudge" | "commit" | "test" | "consultation"

export interface TimelineEvent {
  id: string
  type: EventType
  timestamp: string
  title: string
  description: string
  details?: Record<string, unknown>
}
