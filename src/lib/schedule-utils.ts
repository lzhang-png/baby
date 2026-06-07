import { STAGES, type Stage } from "@/lib/schedule-data"

const DAY_ANCHOR_MINUTES = 7 * 60

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

export type ScheduleTimelineItem = Stage["day"][number] & {
  minutes: number
  normalizedMinutes: number
}

export function parseScheduleTime(time: string): number {
  const cleaned = time.replace(/^~/, "").trim()
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return 0

  let hours = Number(match[1])
  const minutes = Number(match[2])
  const period = match[3].toUpperCase()

  if (period === "AM" && hours === 12) hours = 0
  if (period === "PM" && hours !== 12) hours += 12

  return hours * 60 + minutes
}

export function normalizeDayMinutes(
  minutes: number,
  anchor = DAY_ANCHOR_MINUTES,
): number {
  if (minutes < anchor) return minutes + 24 * 60
  return minutes
}

export function getNowNormalizedMinutes(now = new Date()): number {
  const minutes = now.getHours() * 60 + now.getMinutes()
  return normalizeDayMinutes(minutes)
}

function parseShortDate(value: string, year: number): Date {
  const [month, day] = value.trim().split(/\s+/)
  return new Date(year, MONTHS[month], Number(day))
}

function parseStageDateRange(dates: string, year = 2026) {
  const [startRaw, endRaw] = dates.split("–").map((part) => part.trim())
  const start = parseShortDate(startRaw, year)
  const end = parseShortDate(endRaw, year)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function getCurrentStage(now = new Date()): Stage {
  for (const stage of STAGES) {
    const { start, end } = parseStageDateRange(stage.dates)
    if (now >= start && now <= end) return stage
  }

  const firstStart = parseStageDateRange(STAGES[0].dates).start
  if (now < firstStart) return STAGES[0]
  return STAGES[STAGES.length - 1]
}

export function getStageDayItems(stage: Stage): ScheduleTimelineItem[] {
  return stage.day.map((item) => {
    const minutes = parseScheduleTime(item.time)
    return {
      ...item,
      minutes,
      normalizedMinutes: normalizeDayMinutes(minutes),
    }
  })
}

export type TimelineItemState = "past" | "current" | "future"

export function getTimelineItemState(
  index: number,
  items: ScheduleTimelineItem[],
  nowNorm = getNowNormalizedMinutes(),
): TimelineItemState {
  const item = items[index]
  const next = items[index + 1]

  if (nowNorm < item.normalizedMinutes) return "future"
  if (!next || nowNorm < next.normalizedMinutes) return "current"
  return "past"
}

export type SegmentProgress = {
  state: "past" | "partial" | "future"
  fillPercent: number
}

export function getSegmentProgress(
  from: ScheduleTimelineItem,
  to: ScheduleTimelineItem,
  nowNorm = getNowNormalizedMinutes(),
): SegmentProgress {
  if (nowNorm >= to.normalizedMinutes) {
    return { state: "past", fillPercent: 100 }
  }
  if (nowNorm <= from.normalizedMinutes) {
    return { state: "future", fillPercent: 0 }
  }

  const fillPercent =
    ((nowNorm - from.normalizedMinutes) /
      (to.normalizedMinutes - from.normalizedMinutes)) *
    100

  return { state: "partial", fillPercent }
}

export function getTimelineBounds(items: ScheduleTimelineItem[]) {
  const start = items[0]?.normalizedMinutes ?? 0
  const end = items[items.length - 1]?.normalizedMinutes ?? start
  return { start, end, span: Math.max(end - start, 1) }
}

export function getTimelineProgressPercent(
  items: ScheduleTimelineItem[],
  nowNorm = getNowNormalizedMinutes(),
): number {
  if (items.length < 2) return 0

  const { start, span } = getTimelineBounds(items)
  return Math.min(100, Math.max(0, ((nowNorm - start) / span) * 100))
}

export function getItemPositionPercent(
  item: ScheduleTimelineItem,
  items: ScheduleTimelineItem[],
): number {
  const { start, span } = getTimelineBounds(items)
  return ((item.normalizedMinutes - start) / span) * 100
}

const DEFAULT_MIN_GAP_PX = 56
const DEFAULT_PADDING_PX = 20

export type SpreadTimelineLayout = {
  height: number
  positions: number[]
  trackTop: number
  trackHeight: number
  getProgressPx: (nowNorm?: number) => number
  getProgressPercent: (nowNorm?: number) => number
}

export function getSpreadTimelineLayout(
  items: ScheduleTimelineItem[],
  minGapPx = DEFAULT_MIN_GAP_PX,
  paddingPx = DEFAULT_PADDING_PX,
): SpreadTimelineLayout {
  if (items.length === 0) {
    return {
      height: 0,
      positions: [],
      trackTop: 0,
      trackHeight: 0,
      getProgressPx: () => 0,
      getProgressPercent: () => 0,
    }
  }

  const positions = items.map((_, index) => paddingPx + index * minGapPx)
  const height = paddingPx * 2 + Math.max(0, items.length - 1) * minGapPx
  const trackTop = positions[0]
  const trackHeight = Math.max(
    positions[positions.length - 1] - trackTop,
    1,
  )

  function getProgressPx(nowNorm = getNowNormalizedMinutes()) {
    if (items.length === 1) return positions[0]

    if (nowNorm <= items[0].normalizedMinutes) return positions[0]
    if (nowNorm >= items[items.length - 1].normalizedMinutes) {
      return positions[positions.length - 1]
    }

    for (let i = 0; i < items.length - 1; i++) {
      const from = items[i].normalizedMinutes
      const to = items[i + 1].normalizedMinutes
      if (nowNorm >= from && nowNorm < to) {
        const ratio = (nowNorm - from) / Math.max(to - from, 1)
        return positions[i] + ratio * (positions[i + 1] - positions[i])
      }
    }

    return positions[positions.length - 1]
  }

  return {
    height,
    positions,
    trackTop,
    trackHeight,
    getProgressPx,
    getProgressPercent(nowNorm = getNowNormalizedMinutes()) {
      const progressPx = getProgressPx(nowNorm)
      return Math.min(
        100,
        Math.max(0, ((progressPx - trackTop) / trackHeight) * 100),
      )
    },
  }
}

export function getTimePositionPx(
  normalizedMinutes: number,
  items: ScheduleTimelineItem[],
  layout: SpreadTimelineLayout,
): number {
  const { positions } = layout
  if (items.length === 0) return 0
  if (items.length === 1) return positions[0]

  if (normalizedMinutes <= items[0].normalizedMinutes) return positions[0]
  if (normalizedMinutes >= items[items.length - 1].normalizedMinutes) {
    return positions[positions.length - 1]
  }

  for (let i = 0; i < items.length - 1; i++) {
    const from = items[i].normalizedMinutes
    const to = items[i + 1].normalizedMinutes
    if (normalizedMinutes >= from && normalizedMinutes < to) {
      const ratio = (normalizedMinutes - from) / Math.max(to - from, 1)
      return positions[i] + ratio * (positions[i + 1] - positions[i])
    }
  }

  return positions[positions.length - 1]
}

export function getActivityPositionPx(
  at: string,
  items: ScheduleTimelineItem[],
  layout: SpreadTimelineLayout,
): number {
  const date = new Date(at)
  const minutes = normalizeDayMinutes(
    date.getHours() * 60 + date.getMinutes(),
  )
  return getTimePositionPx(minutes, items, layout)
}

export function spreadLabelPositions(
  tops: number[],
  minGapPx = 44,
): number[] {
  if (tops.length === 0) return []
  const sorted = tops
    .map((top, index) => ({ top, index }))
    .sort((a, b) => a.top - b.top)

  const result = new Array<number>(tops.length)
  let last = -Infinity
  for (const entry of sorted) {
    const y = Math.max(entry.top, last + minGapPx)
    result[entry.index] = y
    last = y
  }
  return result
}
