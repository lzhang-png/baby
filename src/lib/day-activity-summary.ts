import type { ActivityItem } from "@/lib/types"

function formatShortDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function plural(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`
}

export function formatDayActivitySummary(activities: ActivityItem[]) {
  if (activities.length === 0) return null

  let feeds = 0
  let feedMl = 0
  let diapers = 0
  let pumps = 0
  let pumpMl = 0
  let sleepMin = 0

  for (const item of activities) {
    switch (item.kind) {
      case "feed":
        feeds++
        if (item.data.amount_ml) feedMl += item.data.amount_ml
        break
      case "diaper":
        diapers++
        break
      case "pump":
        pumps++
        if (item.data.amount_ml) pumpMl += item.data.amount_ml
        break
      case "sleep":
        if (item.data.duration_min) sleepMin += item.data.duration_min
        break
    }
  }

  const parts: string[] = []

  if (feeds > 0) {
    parts.push(
      feedMl > 0
        ? `${plural(feeds, "feed")} · ${feedMl} ml`
        : plural(feeds, "feed"),
    )
  }
  if (diapers > 0) parts.push(plural(diapers, "diaper"))
  if (pumps > 0) {
    parts.push(
      pumpMl > 0
        ? `${plural(pumps, "pump")} · ${pumpMl} ml`
        : plural(pumps, "pump"),
    )
  }
  if (sleepMin > 0) parts.push(`${formatShortDuration(sleepMin)} sleep`)

  return parts.length > 0 ? parts.join(" · ") : null
}
