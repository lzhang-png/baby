import {
  formatCompactDuration,
  formatDuration,
  formatTime,
  isSameDay,
} from "@/lib/format"
import type { ActivityItem, FeedLog, SleepLog } from "@/lib/types"
import {
  getSleepDurationMinutes,
  type SleepTimelinePhase,
} from "@/lib/sleep-timeline"

const FEED_LABELS: Record<string, string> = {
  nursing: "Nursing",
  formula: "Formula",
  expressed: "Expressed",
  donated: "Donated milk",
}

const DIAPER_LABELS: Record<string, string> = {
  wet: "Wet",
  dirty: "Dirty",
  mixed: "Mixed",
  dry: "Dry",
}

type ActivityLabelOptions = {
  sleepPhase?: SleepTimelinePhase
  now?: Date
}

export function activitySummary(
  item: ActivityItem,
  options?: ActivityLabelOptions,
): string {
  switch (item.kind) {
    case "feed": {
      const f = item.data
      const parts = [FEED_LABELS[f.feed_type] ?? f.feed_type]
      if (f.amount_ml) parts.push(`${f.amount_ml} ml`)
      if (f.duration_min) parts.push(`${f.duration_min} min`)
      if (f.side) parts.push(f.side)
      return parts.join(" · ")
    }
    case "sleep": {
      const s = item.data
      const now = options?.now ?? new Date()
      const duration = formatCompactDuration(getSleepDurationMinutes(s, now))
      const phase = options?.sleepPhase

      if (phase === "start") {
        return s.ended_at ? "Sleep started" : "Sleeping"
      }
      if (phase === "end") {
        return s.ended_at
          ? `Sleep ended · ${duration}`
          : `Still sleeping · ${duration}`
      }

      if (!s.ended_at) return `Sleeping · ${duration}`
      return `Slept ${formatDuration(s.duration_min)}`
    }
    case "diaper":
      return `Diaper · ${DIAPER_LABELS[item.data.diaper_type]}`
    case "pump": {
      const p = item.data
      const parts = ["Pumping"]
      if (p.amount_ml) parts.push(`${p.amount_ml} ml`)
      if (p.duration_left_min || p.duration_right_min) {
        parts.push(`L${p.duration_left_min ?? 0}m R${p.duration_right_min ?? 0}m`)
      }
      return parts.join(" · ")
    }
  }
}

export function activityTime(item: ActivityItem, displayAt?: string): string {
  return formatTime(displayAt ?? item.at)
}

export function getNursingDurationMinutes(feed: FeedLog, now: Date): number {
  if (feed.duration_min != null) return feed.duration_min
  const startMs = new Date(feed.occurred_at).getTime()
  return Math.max(0, Math.round((now.getTime() - startMs) / 60_000))
}

export function ongoingSleepLabel(sleep: SleepLog, now: Date): string {
  return `Slept for ${formatCompactDuration(getSleepDurationMinutes(sleep, now))}`
}

export function ongoingNursingLabel(feed: FeedLog, now: Date): string {
  const side =
    feed.side === "L" ? "left" : feed.side === "R" ? "right" : "both sides"
  return `Nursed on ${side} for ${formatCompactDuration(getNursingDurationMinutes(feed, now))}`
}

export type OngoingTimelineCard = {
  id: string
  item: ActivityItem
}

export function getOngoingTimelineCards(
  activities: ActivityItem[],
  date: Date,
  now: Date,
): OngoingTimelineCard[] {
  if (!isSameDay(date, now)) return []

  const cards: OngoingTimelineCard[] = []

  for (const item of activities) {
    if (item.kind === "sleep") {
      const sleep = item.data
      if (!sleep.ended_at && isSameDay(new Date(sleep.started_at), date)) {
        cards.push({ id: `ongoing-sleep-${sleep.id}`, item })
      }
      continue
    }

    if (item.kind === "feed") {
      const feed = item.data
      if (
        feed.feed_type === "nursing" &&
        feed.duration_min == null &&
        isSameDay(new Date(feed.occurred_at), date) &&
        (feed.side === "L" || feed.side === "R")
      ) {
        cards.push({ id: `ongoing-nursing-${feed.id}`, item })
      }
    }
  }

  return cards.sort((a, b) => {
    const rank = (card: OngoingTimelineCard) => {
      if (card.item.kind === "sleep") return 0
      if (card.item.kind === "feed" && card.item.data.side === "L") return 1
      return 2
    }
    return rank(a) - rank(b)
  })
}

export function ongoingTimelineLabel(item: ActivityItem, now: Date): string {
  if (item.kind === "sleep") return ongoingSleepLabel(item.data, now)
  if (item.kind === "feed") return ongoingNursingLabel(item.data, now)
  return ""
}
