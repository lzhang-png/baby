// Imported from Baby Tracker PDF export (Jun 1–6, 2026).
import raw from "@/lib/baby-tracker-june-2026.json"
import type {
  ActivityItem,
  DiaperType,
  FeedType,
  NursingSide,
} from "@/lib/types"

type RawFeed = {
  kind: "feed"
  id: string
  at: string
  feed_type: FeedType
  amount_ml: number | null
  duration_min: number | null
  side: NursingSide | null
}

type RawSleep = {
  kind: "sleep"
  id: string
  at: string
  duration_min: number | null
  ended_at: string
}

type RawDiaper = {
  kind: "diaper"
  id: string
  at: string
  diaper_type: DiaperType
}

type RawPump = {
  kind: "pump"
  id: string
  at: string
  amount_ml: number | null
  duration_left_min: number | null
  duration_right_min: number | null
}

type RawActivity = RawFeed | RawSleep | RawDiaper | RawPump

const IMPORTED = raw as RawActivity[]

const IMPORT_META = {
  baby_id: "baby-tracker",
  logged_by: null,
  notes: "Baby Tracker import",
} as const

function localDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toIso(localAt: string) {
  return new Date(localAt).toISOString()
}

function toActivityItem(record: RawActivity): ActivityItem {
  const createdAt = toIso(record.at)

  switch (record.kind) {
    case "feed":
      return {
        kind: "feed",
        at: createdAt,
        data: {
          id: record.id,
          baby_id: IMPORT_META.baby_id,
          logged_by: IMPORT_META.logged_by,
          occurred_at: createdAt,
          feed_type: record.feed_type,
          amount_ml: record.amount_ml,
          duration_min: record.duration_min,
          side: record.side,
          notes: IMPORT_META.notes,
          created_at: createdAt,
        },
      }
    case "sleep": {
      const endedAt = toIso(record.at)
      const durationMin = record.duration_min ?? 0
      const startedAt = new Date(
        new Date(record.at).getTime() - durationMin * 60_000,
      ).toISOString()
      return {
        kind: "sleep",
        at: startedAt,
        data: {
          id: record.id,
          baby_id: IMPORT_META.baby_id,
          logged_by: IMPORT_META.logged_by,
          started_at: startedAt,
          ended_at: endedAt,
          duration_min: record.duration_min,
          notes: IMPORT_META.notes,
          created_at: endedAt,
        },
      }
    }
    case "diaper":
      return {
        kind: "diaper",
        at: createdAt,
        data: {
          id: record.id,
          baby_id: IMPORT_META.baby_id,
          logged_by: IMPORT_META.logged_by,
          occurred_at: createdAt,
          diaper_type: record.diaper_type,
          notes: IMPORT_META.notes,
          created_at: createdAt,
        },
      }
    case "pump":
      return {
        kind: "pump",
        at: createdAt,
        data: {
          id: record.id,
          baby_id: IMPORT_META.baby_id,
          logged_by: IMPORT_META.logged_by,
          occurred_at: createdAt,
          amount_ml: record.amount_ml,
          duration_left_min: record.duration_left_min,
          duration_right_min: record.duration_right_min,
          notes: IMPORT_META.notes,
          created_at: createdAt,
        },
      }
  }
}

const ALL_IMPORTED = IMPORTED.map(toActivityItem)

export function getImportedActivitiesForDay(date = new Date()): ActivityItem[] {
  const key = localDateKey(date)
  return ALL_IMPORTED.filter(
    (item) => localDateKey(new Date(item.at)) === key,
  )
}

export function mergeActivities(
  imported: ActivityItem[],
  logged: ActivityItem[],
): ActivityItem[] {
  const seen = new Set(logged.map((item) => `${item.kind}-${item.at}`))
  const extra = imported.filter((item) => !seen.has(`${item.kind}-${item.at}`))
  return [...logged, ...extra].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  )
}

export const IMPORTED_DATE_RANGE = {
  start: "2026-06-01",
  end: "2026-06-06",
  source: "Baby Tracker report (Jun 1–6, 2026)",
}

const FUTURE_NAV_DAYS = 14

export function getNavigationDateBounds() {
  const min = new Date(`${IMPORTED_DATE_RANGE.start}T00:00:00`)
  const max = new Date()
  max.setHours(0, 0, 0, 0)
  max.setDate(max.getDate() + FUTURE_NAV_DAYS)
  return { min, max }
}

export function clampNavigationDate(date: Date) {
  const { min, max } = getNavigationDateBounds()
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  if (d < min) return new Date(min)
  if (d > max) return new Date(max)
  return d
}
