import { groupCompletedNursingFeeds } from "@/lib/nursing-timeline"
import { getPumpTotalMl } from "@/lib/pump-side-amounts"
import type { ActivityItem, FeedLog } from "@/lib/types"

export type DaySummaryMetrics = {
  feedCount: number
  feedMl: number
  diaperCount: number
  pumpMl: number
  sleepHours: number
}

export type DaySummaryMetricKey = keyof DaySummaryMetrics

/** Per-day totals used by the summary trend charts. */
export function buildDaySummaryMetrics(
  activities: ActivityItem[],
): DaySummaryMetrics {
  let feedCount = 0
  let feedMl = 0
  let diaperCount = 0
  let pumpMl = 0
  let sleepMin = 0
  const nursingFeeds: FeedLog[] = []

  for (const item of activities) {
    switch (item.kind) {
      case "feed": {
        const feed = item.data
        if (feed.feed_type === "nursing") {
          nursingFeeds.push(feed)
          break
        }
        feedCount++
        if (feed.amount_ml) feedMl += feed.amount_ml
        break
      }
      case "diaper":
        diaperCount++
        break
      case "pump":
        pumpMl += getPumpTotalMl(item.data)
        break
      case "sleep":
        if (item.data.duration_min) sleepMin += item.data.duration_min
        break
    }
  }

  // Count nursing sessions the same way the text summary groups them.
  const grouped = groupCompletedNursingFeeds(nursingFeeds)
  const countedIds = new Set<string>()

  for (const group of grouped.groups) {
    feedCount++
    if (group.left) countedIds.add(group.left.id)
    if (group.right) countedIds.add(group.right.id)
  }

  for (const feed of grouped.singles) {
    feedCount++
    countedIds.add(feed.id)
  }

  for (const feed of nursingFeeds) {
    if (countedIds.has(feed.id)) continue
    feedCount++
  }

  return {
    feedCount,
    feedMl,
    diaperCount,
    pumpMl,
    sleepHours: Math.round((sleepMin / 60) * 10) / 10,
  }
}
