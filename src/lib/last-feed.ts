import { getLastFeedBefore } from "@/lib/api/logs"
import { getImportedActivitiesForDay } from "@/lib/baby-tracker-import"
import { addDays, formatCompactDuration, startOfDay } from "@/lib/format"
import type { ActivityItem } from "@/lib/types"

function isCompletedFeedAt(item: ActivityItem, now: Date) {
  if (item.kind !== "feed") return false
  const atMs = new Date(item.at).getTime()
  if (atMs > now.getTime()) return false

  const feed = item.data
  if (feed.feed_type === "nursing" && feed.duration_min == null) return false
  return true
}

function latestFeedAtFromActivities(
  items: ActivityItem[],
  now: Date,
): string | null {
  let latestMs: number | null = null

  for (const item of items) {
    if (!isCompletedFeedAt(item, now)) continue
    const atMs = new Date(item.at).getTime()
    if (latestMs == null || atMs > latestMs) latestMs = atMs
  }

  return latestMs != null ? new Date(latestMs).toISOString() : null
}

export async function resolveLastFeedAt(
  babyId: string,
  now: Date,
  todayActivities: ActivityItem[],
): Promise<string | null> {
  let latestMs: number | null = null

  const dbFeed = await getLastFeedBefore(babyId, now)
  if (dbFeed) {
    latestMs = new Date(dbFeed.occurred_at).getTime()
  }

  const importedDays = [startOfDay(now), addDays(startOfDay(now), -1)]
  for (const day of importedDays) {
    const importedAt = latestFeedAtFromActivities(
      getImportedActivitiesForDay(day),
      now,
    )
    if (!importedAt) continue
    const importedMs = new Date(importedAt).getTime()
    if (latestMs == null || importedMs > latestMs) latestMs = importedMs
  }

  const todayAt = latestFeedAtFromActivities(todayActivities, now)
  if (todayAt) {
    const todayMs = new Date(todayAt).getTime()
    if (latestMs == null || todayMs > latestMs) latestMs = todayMs
  }

  return latestMs != null ? new Date(latestMs).toISOString() : null
}

export function formatLastFeedLabel(
  lastFeedAt: string,
  now: Date,
  t: (key: string, options?: Record<string, string>) => string,
) {
  const minutesAgo = Math.max(
    0,
    Math.floor((now.getTime() - new Date(lastFeedAt).getTime()) / 60000),
  )

  if (minutesAgo < 1) {
    return t("timeline.lastFedJustNow")
  }

  return t("timeline.lastFed", {
    ago: formatCompactDuration(minutesAgo),
  })
}

export function formatFeedingNowLabel(
  startedAt: string,
  now: Date,
  t: (key: string, options?: Record<string, string>) => string,
) {
  const minutesAgo = Math.max(
    0,
    Math.floor((now.getTime() - new Date(startedAt).getTime()) / 60000),
  )

  return t("timeline.feedingNow", {
    ago: formatCompactDuration(minutesAgo),
  })
}
