import { STAGES, type Stage } from "@/lib/schedule-data"

export const DAY_MINUTES = 24 * 60

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

export function getClockMinutes(value: Date | string): number {
  const date = typeof value === "string" ? new Date(value) : value
  return date.getHours() * 60 + date.getMinutes()
}

/** Clock minutes from midnight — each day timeline starts at 12:00 AM. */
export function toTimelineLayoutMinutes(clockMinutes: number): number {
  return clockMinutes
}

export function getNowLayoutMinutes(now = new Date()): number {
  return toTimelineLayoutMinutes(getClockMinutes(now))
}

/** @deprecated Use getNowLayoutMinutes */
export function getNowNormalizedMinutes(now = new Date()): number {
  return getNowLayoutMinutes(now)
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
  return stage.day
    .map((item) => {
      const minutes = parseScheduleTime(item.time)
      return {
        ...item,
        minutes,
        normalizedMinutes: toTimelineLayoutMinutes(minutes),
      }
    })
    .sort((a, b) => a.normalizedMinutes - b.normalizedMinutes)
}

export type TimelineItemState = "past" | "current" | "future"

export function getTimelineItemState(
  index: number,
  items: ScheduleTimelineItem[],
  nowLayoutMin = getNowLayoutMinutes(),
): TimelineItemState {
  const item = items[index]
  const next = items[index + 1]

  if (nowLayoutMin < item.normalizedMinutes) return "future"
  if (!next || nowLayoutMin < next.normalizedMinutes) return "current"
  return "past"
}

export type SegmentProgress = {
  state: "past" | "partial" | "future"
  fillPercent: number
}

export function getSegmentProgress(
  from: ScheduleTimelineItem,
  to: ScheduleTimelineItem,
  nowLayoutMin = getNowLayoutMinutes(),
): SegmentProgress {
  if (nowLayoutMin >= to.normalizedMinutes) {
    return { state: "past", fillPercent: 100 }
  }
  if (nowLayoutMin <= from.normalizedMinutes) {
    return { state: "future", fillPercent: 0 }
  }

  const fillPercent =
    ((nowLayoutMin - from.normalizedMinutes) /
      (to.normalizedMinutes - from.normalizedMinutes)) *
    100

  return { state: "partial", fillPercent }
}

export function getTimelineBounds() {
  return { start: 0, end: DAY_MINUTES, span: DAY_MINUTES }
}

export function getTimelineProgressPercent(
  nowLayoutMin = getNowLayoutMinutes(),
): number {
  return Math.min(
    100,
    Math.max(0, (nowLayoutMin / DAY_MINUTES) * 100),
  )
}

export function getItemPositionPercent(item: ScheduleTimelineItem): number {
  return (item.normalizedMinutes / DAY_MINUTES) * 100
}

export const DEFAULT_PX_PER_MINUTE = 3

export type SpreadTimelineLayout = {
  height: number
  positions: number[]
  trackTop: number
  trackHeight: number
  midnightY: number
  getProgressPx: (nowLayoutMin?: number) => number
  getProgressPercent: (nowLayoutMin?: number) => number
}

function minutesToPositionPx(
  layoutMinutes: number,
  trackTop: number,
  trackHeight: number,
) {
  const { start, end, span } = getTimelineBounds()
  const clamped = Math.min(end, Math.max(start, layoutMinutes))
  return trackTop + ((clamped - start) / span) * trackHeight
}

export function getSpreadTimelineLayout(
  items: ScheduleTimelineItem[],
  pxPerMinute = DEFAULT_PX_PER_MINUTE,
): SpreadTimelineLayout {
  if (items.length === 0) {
    return {
      height: 0,
      positions: [],
      trackTop: 0,
      trackHeight: 0,
      midnightY: 0,
      getProgressPx: () => 0,
      getProgressPercent: () => 0,
    }
  }

  const { span } = getTimelineBounds()
  const trackTop = 0
  const trackHeight = span * pxPerMinute
  const height = trackHeight

  const toPx = (layoutMinutes: number) =>
    minutesToPositionPx(layoutMinutes, trackTop, trackHeight)

  const positions = items.map((item) => toPx(item.normalizedMinutes))

  function getProgressPx(nowLayoutMin = getNowLayoutMinutes()) {
    return toPx(nowLayoutMin)
  }

  return {
    height,
    positions,
    trackTop,
    trackHeight,
    midnightY: trackTop,
    getProgressPx,
    getProgressPercent(nowLayoutMin = getNowLayoutMinutes()) {
      return getTimelineProgressPercent(nowLayoutMin)
    },
  }
}

export function getTimePositionPx(
  layoutMinutes: number,
  layout: SpreadTimelineLayout,
): number {
  return minutesToPositionPx(
    layoutMinutes,
    layout.trackTop,
    layout.trackHeight,
  )
}

export function getActivityPositionPx(
  at: string,
  _items: ScheduleTimelineItem[],
  layout: SpreadTimelineLayout,
): number {
  return getTimePositionPx(
    toTimelineLayoutMinutes(getClockMinutes(at)),
    layout,
  )
}

export const DEFAULT_RECORDED_GROUP_ANCHOR_GAP_PX = 24
export const DEFAULT_RECORDED_GROUP_TIME_GAP_MIN = 30
export const DEFAULT_RECORDED_LABEL_MIN_GAP_PX = 48

export function getEventClockMinutes(at: string): number {
  return getClockMinutes(at)
}

/** @deprecated Use getEventClockMinutes for time deltas */
export function getEventNormalizedMinutes(at: string): number {
  return getEventClockMinutes(at)
}

export function clusterByProximity<T>(
  items: T[],
  getAnchorY: (item: T) => number,
  getMinutes: (item: T) => number,
  anchorGapPx = DEFAULT_RECORDED_GROUP_ANCHOR_GAP_PX,
  timeGapMin = DEFAULT_RECORDED_GROUP_TIME_GAP_MIN,
): T[][] {
  if (items.length === 0) return []

  const sorted = [...items].sort((a, b) => getAnchorY(a) - getAnchorY(b))
  const groups: T[][] = [[sorted[0]]]

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]
    const group = groups[groups.length - 1]
    const last = group[group.length - 1]
    const anchorDelta = getAnchorY(item) - getAnchorY(last)
    const timeDelta = getMinutes(item) - getMinutes(last)

    if (anchorDelta <= anchorGapPx || timeDelta <= timeGapMin) {
      group.push(item)
    } else {
      groups.push([item])
    }
  }

  return groups
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
