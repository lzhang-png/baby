import type { ActivityItem } from "@/lib/types"
import { formatCompactDuration, formatDuration, formatTime } from "@/lib/format"
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
        return s.ended_at
          ? `Sleep started · ${duration}`
          : `Sleeping · ${duration}`
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
