import type { LogPanelType } from "@/components/log/log-panel"
import { safeGetItem, safeSetItem } from "@/lib/safe-storage"

export const TIMELINE_LOG_KINDS = ["feed", "sleep", "diaper", "pump"] as const
export type TimelineLogKind = LogPanelType

const STORAGE_KEY = "baby-timeline-log-filter"

export function allTimelineLogKinds(): Set<TimelineLogKind> {
  return new Set(TIMELINE_LOG_KINDS)
}

export function loadTimelineLogFilter(): Set<TimelineLogKind> {
  const stored = safeGetItem(STORAGE_KEY)
  if (!stored) return allTimelineLogKinds()

  try {
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return allTimelineLogKinds()

    const valid = parsed.filter(
      (kind): kind is TimelineLogKind =>
        typeof kind === "string" &&
        (TIMELINE_LOG_KINDS as readonly string[]).includes(kind),
    )

    return new Set(valid)
  } catch {
    return allTimelineLogKinds()
  }
}

export function saveTimelineLogFilter(enabled: Set<TimelineLogKind>) {
  safeSetItem(STORAGE_KEY, JSON.stringify([...enabled]))
}

export function isTimelineFilterActive(enabled: Set<TimelineLogKind>) {
  return enabled.size < TIMELINE_LOG_KINDS.length
}
