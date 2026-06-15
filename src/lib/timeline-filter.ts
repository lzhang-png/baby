import type { LogPanelType } from "@/components/log/log-panel"
import { safeGetItem, safeSetItem } from "@/lib/safe-storage"

export const TIMELINE_LOG_KINDS = ["feed", "sleep", "diaper", "pump"] as const
export type TimelineLogKind = LogPanelType

// Bumped from the previous "shown kinds" key: the stored set now lists the
// kinds the user has selected to HIDE, so old data must not be reused.
const STORAGE_KEY = "baby-timeline-hidden-kinds"

export function noHiddenLogKinds(): Set<TimelineLogKind> {
  return new Set()
}

export function loadHiddenLogKinds(): Set<TimelineLogKind> {
  const stored = safeGetItem(STORAGE_KEY)
  if (!stored) return noHiddenLogKinds()

  try {
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return noHiddenLogKinds()

    const valid = parsed.filter(
      (kind): kind is TimelineLogKind =>
        typeof kind === "string" &&
        (TIMELINE_LOG_KINDS as readonly string[]).includes(kind),
    )

    return new Set(valid)
  } catch {
    return noHiddenLogKinds()
  }
}

export function saveHiddenLogKinds(hidden: Set<TimelineLogKind>) {
  safeSetItem(STORAGE_KEY, JSON.stringify([...hidden]))
}

export function isTimelineFilterActive(hidden: Set<TimelineLogKind>) {
  return hidden.size > 0
}
