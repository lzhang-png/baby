import i18n from "@/lib/i18n"
import type { ActivityItem } from "@/lib/types"

export type DaySummarySegment = {
  kind: ActivityItem["kind"]
  text: string
}

function formatShortDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function buildDayActivitySummary(
  activities: ActivityItem[],
): DaySummarySegment[] | null {
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

  const segments: DaySummarySegment[] = []

  if (feeds > 0) {
    const feedText = i18n.t("summary.feed", { count: feeds })
    segments.push({
      kind: "feed",
      text: feedMl > 0 ? `${feedText} · ${feedMl} ml` : feedText,
    })
  }
  if (diapers > 0) {
    segments.push({
      kind: "diaper",
      text: i18n.t("summary.diaper", { count: diapers }),
    })
  }
  if (pumps > 0) {
    const pumpText = i18n.t("summary.pump", { count: pumps })
    segments.push({
      kind: "pump",
      text: pumpMl > 0 ? `${pumpText} · ${pumpMl} ml` : pumpText,
    })
  }
  if (sleepMin > 0) {
    segments.push({
      kind: "sleep",
      text: i18n.t("summary.sleep", {
        duration: formatShortDuration(sleepMin),
      }),
    })
  }

  return segments.length > 0 ? segments : null
}
