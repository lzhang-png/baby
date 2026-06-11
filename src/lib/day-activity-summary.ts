import {
  diaperTypeLabel,
  feedTypeLabel,
} from "@/components/log/activity-label"
import i18n from "@/lib/i18n"
import type {
  ActivityItem,
  DiaperType,
  FeedType,
} from "@/lib/types"

export type DaySummarySubSegment = {
  key: string
  text: string
}

export type DaySummarySegment = {
  kind: ActivityItem["kind"]
  subSegments: DaySummarySubSegment[]
}

const FEED_TYPES: FeedType[] = ["nursing", "formula", "expressed", "donated"]
const DIAPER_TYPES: DiaperType[] = ["wet", "dirty", "mixed", "dry"]

function formatShortDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function subtypeCountText(count: number, label: string) {
  return i18n.t("summary.subtypeCount", { count, label })
}

function buildFeedSubSegments(
  activities: ActivityItem[],
): DaySummarySubSegment[] {
  const stats = Object.fromEntries(
    FEED_TYPES.map((type) => [type, { count: 0, ml: 0, durationMin: 0 }]),
  ) as Record<
    FeedType,
    { count: number; ml: number; durationMin: number }
  >

  let totalFeeds = 0
  let totalMl = 0

  for (const item of activities) {
    if (item.kind !== "feed") continue
    const feed = item.data
    const bucket = stats[feed.feed_type]
    bucket.count++
    totalFeeds++
    if (feed.amount_ml) {
      bucket.ml += feed.amount_ml
      totalMl += feed.amount_ml
    }
    if (feed.duration_min) bucket.durationMin += feed.duration_min
  }

  const subSegments: DaySummarySubSegment[] = []

  if (totalFeeds > 0 && totalMl > 0) {
    subSegments.push({
      key: "feed-total",
      text: `${i18n.t("summary.feed", { count: totalFeeds })} · ${totalMl} ml`,
    })
  }

  const subtypeSegments = FEED_TYPES.flatMap((type) => {
    const { count, ml, durationMin } = stats[type]
    if (count === 0) return []

    const parts = [subtypeCountText(count, feedTypeLabel(type))]
    if (ml > 0) parts.push(`${ml} ml`)
    if (type === "nursing" && durationMin > 0) {
      parts.push(formatShortDuration(durationMin))
    }

    return [{ key: type, text: parts.join(" · ") }]
  })

  return [...subSegments, ...subtypeSegments]
}

function buildDiaperSubSegments(
  activities: ActivityItem[],
): DaySummarySubSegment[] {
  const counts = Object.fromEntries(
    DIAPER_TYPES.map((type) => [type, 0]),
  ) as Record<DiaperType, number>

  let totalDiapers = 0

  for (const item of activities) {
    if (item.kind !== "diaper") continue
    counts[item.data.diaper_type]++
    totalDiapers++
  }

  const subSegments: DaySummarySubSegment[] = []

  if (totalDiapers > 0) {
    subSegments.push({
      key: "diaper-total",
      text: i18n.t("summary.diaper", { count: totalDiapers }),
    })
  }

  const subtypeSegments = DIAPER_TYPES.flatMap((type) => {
    const count = counts[type]
    if (count === 0) return []
    return [
      {
        key: type,
        text: subtypeCountText(count, diaperTypeLabel(type)),
      },
    ]
  })

  return [...subSegments, ...subtypeSegments]
}

function getPumpTotalMl(pump: {
  amount_ml: number | null
  amount_left_ml: number | null
  amount_right_ml: number | null
}) {
  const sideTotal = (pump.amount_left_ml ?? 0) + (pump.amount_right_ml ?? 0)
  if (sideTotal > 0) return sideTotal
  return pump.amount_ml ?? 0
}

function buildPumpSubSegments(
  activities: ActivityItem[],
): DaySummarySubSegment[] {
  let pumps = 0
  let pumpMl = 0

  for (const item of activities) {
    if (item.kind !== "pump") continue
    pumps++
    pumpMl += getPumpTotalMl(item.data)
  }

  if (pumps === 0) return []

  const parts = [i18n.t("summary.pump", { count: pumps })]
  if (pumpMl > 0) parts.push(`${pumpMl} ml`)

  return [{ key: "pump", text: parts.join(" · ") }]
}

function buildSleepSubSegments(
  activities: ActivityItem[],
): DaySummarySubSegment[] {
  let sleepMin = 0

  for (const item of activities) {
    if (item.kind !== "sleep") continue
    if (item.data.duration_min) sleepMin += item.data.duration_min
  }

  if (sleepMin === 0) return []

  return [
    {
      key: "sleep",
      text: i18n.t("summary.sleep", {
        duration: formatShortDuration(sleepMin),
      }),
    },
  ]
}

export function buildDayActivitySummary(
  activities: ActivityItem[],
): DaySummarySegment[] | null {
  if (activities.length === 0) return null

  const segments: DaySummarySegment[] = []

  const feedSubSegments = buildFeedSubSegments(activities)
  if (feedSubSegments.length > 0) {
    segments.push({ kind: "feed", subSegments: feedSubSegments })
  }

  const diaperSubSegments = buildDiaperSubSegments(activities)
  if (diaperSubSegments.length > 0) {
    segments.push({ kind: "diaper", subSegments: diaperSubSegments })
  }

  const pumpSubSegments = buildPumpSubSegments(activities)
  if (pumpSubSegments.length > 0) {
    segments.push({ kind: "pump", subSegments: pumpSubSegments })
  }

  const sleepSubSegments = buildSleepSubSegments(activities)
  if (sleepSubSegments.length > 0) {
    segments.push({ kind: "sleep", subSegments: sleepSubSegments })
  }

  return segments.length > 0 ? segments : null
}
