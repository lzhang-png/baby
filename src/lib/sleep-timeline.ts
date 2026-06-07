import { isSameDay } from "@/lib/format"
import type { ActivityItem, SleepLog } from "@/lib/types"

export type SleepTimelinePhase = "start" | "end"

export type TimelineActivityEvent = {
  item: ActivityItem
  id: string
  at: string
  sleepPhase?: SleepTimelinePhase
}

export function getSleepDurationMinutes(sleep: SleepLog, now: Date): number {
  if (sleep.ended_at && sleep.duration_min != null) {
    return sleep.duration_min
  }

  const startMs = new Date(sleep.started_at).getTime()
  const endMs = sleep.ended_at
    ? new Date(sleep.ended_at).getTime()
    : now.getTime()

  return Math.max(0, Math.round((endMs - startMs) / 60_000))
}

export function expandActivitiesForTimeline(
  activities: ActivityItem[],
  date: Date,
  now: Date,
): TimelineActivityEvent[] {
  const isToday = isSameDay(date, now)
  const events: TimelineActivityEvent[] = []

  for (const item of activities) {
    if (item.kind !== "sleep") {
      events.push({
        item,
        id: `${item.kind}-${item.data.id}`,
        at: item.at,
      })
      continue
    }

    const sleep = item.data

    events.push({
      item,
      id: `sleep-${sleep.id}-start`,
      at: sleep.started_at,
      sleepPhase: "start",
    })

    if (sleep.ended_at) {
      if (isSameDay(new Date(sleep.ended_at), date)) {
        events.push({
          item,
          id: `sleep-${sleep.id}-end`,
          at: sleep.ended_at,
          sleepPhase: "end",
        })
      }
    } else if (isToday) {
      events.push({
        item,
        id: `sleep-${sleep.id}-end`,
        at: now.toISOString(),
        sleepPhase: "end",
      })
    }
  }

  return events.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  )
}
