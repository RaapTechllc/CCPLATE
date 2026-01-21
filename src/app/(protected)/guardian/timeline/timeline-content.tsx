"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { TimelineEventComponent } from "@/components/features/guardian/timeline-event"
import type { TimelineEvent, TimeRange, EventType } from "./types"

interface TimelineContentProps {
  initialEvents: TimelineEvent[]
  initialRange: TimeRange
  initialTypes?: EventType[]
}

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "Last hour" },
  { value: "4h", label: "Last 4 hours" },
  { value: "today", label: "Today" },
  { value: "all", label: "All time" },
]

const eventTypeOptions: { value: EventType; label: string; color: string }[] = [
  { value: "tool", label: "Tools", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "nudge", label: "Nudges", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { value: "commit", label: "Commits", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "test", label: "Tests", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "consultation", label: "RLM", color: "bg-purple-100 text-purple-700 border-purple-300" },
]

export function TimelineContent({
  initialEvents,
  initialRange,
  initialTypes,
}: TimelineContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [selectedRange, setSelectedRange] = useState<TimeRange>(initialRange)
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>(
    initialTypes || []
  )

  function updateFilters(range: TimeRange, types: EventType[]) {
    const params = new URLSearchParams()
    params.set("range", range)
    if (types.length > 0) {
      params.set("types", types.join(","))
    }
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  function handleRangeChange(range: TimeRange) {
    setSelectedRange(range)
    updateFilters(range, selectedTypes)
  }

  function handleTypeToggle(type: EventType) {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type]
    setSelectedTypes(newTypes)
    updateFilters(selectedRange, newTypes)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-muted-foreground self-center mr-2">
            Time:
          </span>
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant={selectedRange === range.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleRangeChange(range.value)}
              disabled={isPending}
            >
              {range.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-muted-foreground self-center mr-2">
            Filter:
          </span>
          {eventTypeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTypeToggle(option.value)}
              disabled={isPending}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                selectedTypes.length === 0 || selectedTypes.includes(option.value)
                  ? option.color
                  : "bg-gray-100 text-gray-400 border-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
          {selectedTypes.length > 0 && (
            <button
              onClick={() => {
                setSelectedTypes([])
                updateFilters(selectedRange, [])
              }}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
              disabled={isPending}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className={`transition-opacity ${isPending ? "opacity-50" : ""}`}>
        {initialEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No events found</p>
            <p className="text-sm mt-1">
              Try adjusting your filters or time range
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            <p className="text-sm text-muted-foreground mb-4">
              Showing {initialEvents.length} event{initialEvents.length !== 1 ? "s" : ""}
            </p>
            {initialEvents.map((event) => (
              <TimelineEventComponent key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
