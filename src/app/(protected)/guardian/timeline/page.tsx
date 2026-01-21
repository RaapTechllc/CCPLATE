import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTimelineEvents } from "./actions"
import type { TimeRange, EventType } from "./types"
import { TimelineContent } from "./timeline-content"

interface PageProps {
  searchParams: Promise<{ range?: TimeRange; types?: string }>
}

export default async function TimelinePage({ searchParams }: PageProps) {
  const params = await searchParams
  const timeRange = (params.range as TimeRange) || "today"
  const eventTypes = params.types
    ? (params.types.split(",") as EventType[])
    : undefined

  const events = await getTimelineEvents(timeRange, eventTypes)

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📊</span>
            Session Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-center py-8">Loading timeline...</div>}>
            <TimelineContent
              initialEvents={events}
              initialRange={timeRange}
              initialTypes={eventTypes}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
