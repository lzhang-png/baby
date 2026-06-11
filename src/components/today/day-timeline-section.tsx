import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
  BathIcon,
  MilkIcon,
  MoonIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react"

import {
  activitySummary,
  getOngoingConnectorAnchorAt,
  getOngoingElapsedSec,
  getOngoingTimelineCards,
  isOngoingNursingFeed,
  ongoingNursingGroupElapsedLabel,
  ongoingTimelineTitle,
} from "@/components/log/activity-label"
import { DayActivitySummary } from "@/components/today/day-activity-summary"
import { buildDayActivitySummary } from "@/lib/day-activity-summary"
import {
  CONNECTOR_TRUNK_OFFSET_PX,
  LOG_CARD_ESTIMATED_HEIGHT_PX,
  LOG_CARD_LEFT_OFFSET_PX,
  LOG_CARD_MAX_WIDTH_PX,
  OngoingNowCards,
  RecordedEventConnectors,
  RecordedEvents,
  TIMELINE_MUTED_LINE_CLASS,
} from "@/components/today/recorded-events"
import { useActivityRefresh } from "@/contexts/activity-refresh-context"
import { getActivitiesForDay } from "@/lib/api/logs"
import {
  getImportedActivitiesForDay,
  mergeActivities,
} from "@/lib/baby-tracker-import"
import { formatDayHeading, formatElapsedClock, isSameDay, startOfDay } from "@/lib/format"
import { expandActivitiesForTimeline } from "@/lib/sleep-timeline"
import { collapseSavedNursingSessions } from "@/lib/nursing-timeline"
import {
  getScaledLogCardHeightPx,
  getScaledPx,
  getTextSizeScale,
  useTextSizeVersion,
} from "@/lib/text-size"
import { isEditableActivity } from "@/lib/activity-utils"
import type { ActivityItem } from "@/lib/types"
import type { ActivityKind } from "@/lib/schedule-data"
import {
  getActivityPositionPx,
  getCurrentStage,
  getNowLayoutMinutes,
  getSpreadTimelineLayout,
  getStageDayItems,
  getTimelineItemState,
  DEFAULT_RECORDED_LABEL_EDGE_GAP_PX,
  spreadLabelPositions,
} from "@/lib/schedule-utils"
import { useNursingTimerSession } from "@/lib/nursing-timer-session"
import { cn } from "@/lib/utils"

type CheckpointIconKind = ActivityKind | "bath"

const CHECKPOINT_ICONS: Record<CheckpointIconKind, LucideIcon> = {
  wake: SunIcon,
  feed: MilkIcon,
  sleep: MoonIcon,
  bath: BathIcon,
}

const SCHEDULE_PANEL_RATIO = 0.35
const TIMELINE_NUDGE_PX = 8
const SCHEDULE_PANEL_WIDTH = `calc(${SCHEDULE_PANEL_RATIO * 100}% - ${TIMELINE_NUDGE_PX}px)`
const LOGS_PANEL_WIDTH = `calc(${(1 - SCHEDULE_PANEL_RATIO) * 100}% + ${TIMELINE_NUDGE_PX}px)`
const NOW_LINE_START_OFFSET_PX = 64 // px-1 + w-14 timestamp clearance

const SCHEDULE_GRID =
  "grid-cols-[minmax(0,1fr)_1.25rem] gap-x-2"

const DAY_SUMMARY_FIRST_LINE_HEIGHT_PX = 18
const DAY_SUMMARY_VERTICAL_OFFSET_PX = -2
const DAY_SUMMARY_BOTTOM_PADDING_PX = 12
const DAY_SUMMARY_CARD_GAP_PX = 8

function getDaySummaryVerticalOffset(): number {
  return getScaledPx(DAY_SUMMARY_VERTICAL_OFFSET_PX)
}

function getEstimatedDaySummaryBandHeight(activities: ActivityItem[]): number {
  const segments = buildDayActivitySummary(activities)
  if (!segments?.length) return 0

  const rowHeight = getScaledPx(DAY_SUMMARY_FIRST_LINE_HEIGHT_PX)
  const rowGap = getScaledPx(8)
  const contentHeight =
    segments.length * rowHeight + Math.max(0, segments.length - 1) * rowGap

  return contentHeight + getScaledPx(DAY_SUMMARY_BOTTOM_PADDING_PX)
}

function getEstimatedDaySummaryBottom(
  activities: ActivityItem[],
  dayHeaderTopY: number,
): number {
  const bandHeight = getEstimatedDaySummaryBandHeight(activities)
  if (bandHeight <= 0) return 0

  return dayHeaderTopY + getDaySummaryVerticalOffset() + bandHeight
}

function getDaySummaryMinLabelY(summaryBottom: number): number {
  if (summaryBottom <= 0) return 0

  const cardHalf = getScaledLogCardHeightPx(LOG_CARD_ESTIMATED_HEIGHT_PX) / 2
  const gap = getScaledPx(DAY_SUMMARY_CARD_GAP_PX)

  return summaryBottom + gap + cardHalf
}

function getDaySummaryMaxLabelY(layoutHeight: number): number {
  const cardHalf = getScaledLogCardHeightPx(LOG_CARD_ESTIMATED_HEIGHT_PX) / 2
  const gap = getScaledPx(DAY_SUMMARY_CARD_GAP_PX)

  return layoutHeight - gap - cardHalf
}

const CARD_SUMMARY_LINE_HEIGHT_PX = 20 // text-sm leading-snug
const CARD_HORIZONTAL_CHROME_PX = 16 + 14 + 8 // p-2 ×2 + icon + gap
const CARD_EDIT_MENU_WIDTH_PX = 32 + 8 // size-8 button + gap
const CARD_SUMMARY_BASE_FONT_PX = 14 // text-sm

let cardTextMeasureCtx: CanvasRenderingContext2D | null | undefined

function getCardTextMeasureCtx(): CanvasRenderingContext2D | null {
  if (cardTextMeasureCtx !== undefined) return cardTextMeasureCtx
  if (typeof document === "undefined") {
    cardTextMeasureCtx = null
    return null
  }
  cardTextMeasureCtx = document.createElement("canvas").getContext("2d")
  return cardTextMeasureCtx
}

function countWrappedLines(
  text: string,
  maxWidthPx: number,
  fontPx: number,
  fontFamily: string,
): number {
  const ctx = getCardTextMeasureCtx()
  if (!ctx || maxWidthPx <= 0) return 1

  ctx.font = `${fontPx}px ${fontFamily}`
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1

  let lines = 1
  let current = ""
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (!current || ctx.measureText(candidate).width <= maxWidthPx) {
      current = candidate
    } else {
      lines += 1
      current = word
    }
  }
  return lines
}

/**
 * Estimates a timeline card's rendered height so that spreadLabelPositions can
 * keep the minimum gap even when the summary text wraps to multiple lines.
 */
function estimateRecordedCardHeightPx(
  summary: string,
  cardWidthPx: number,
  editable: boolean,
  fontFamily: string,
): number {
  const base = getScaledLogCardHeightPx(LOG_CARD_ESTIMATED_HEIGHT_PX)
  if (cardWidthPx <= 0) return base

  const chrome =
    CARD_HORIZONTAL_CHROME_PX + (editable ? CARD_EDIT_MENU_WIDTH_PX : 0)
  const textWidth = cardWidthPx - chrome
  const fontPx = CARD_SUMMARY_BASE_FONT_PX * getTextSizeScale()
  const lines = countWrappedLines(summary, textWidth, fontPx, fontFamily)

  return base + (lines - 1) * getScaledPx(CARD_SUMMARY_LINE_HEIGHT_PX)
}

function isRecordedEventEditable(
  item: ActivityItem,
  sleepPhase?: "start" | "end",
): boolean {
  return (
    isEditableActivity(item) &&
    (!sleepPhase ||
      sleepPhase === "end" ||
      (sleepPhase === "start" && item.kind === "sleep" && !item.data.ended_at))
  )
}

const ICON_COLORS: Record<CheckpointIconKind, string> = {
  wake: "text-amber-400",
  feed: "text-sky-400",
  sleep: "text-indigo-400",
  bath: "text-cyan-400",
}

function iconColor(
  iconKind: CheckpointIconKind,
  state: "past" | "current" | "future",
) {
  return cn(
    ICON_COLORS[iconKind],
    state === "past" && "opacity-55",
    state === "future" && "opacity-35",
  )
}

function checkpointTone(state: "past" | "current" | "future") {
  return state === "current" ? "text-foreground" : "text-muted-foreground"
}

function matchSegmentIconKind(text: string): CheckpointIconKind | null {
  if (/\bwake\b|wind[- ]?down\b/i.test(text)) return "wake"
  if (/\bbath\b/i.test(text)) return "bath"
  if (/\bfeed\b/i.test(text)) return "feed"
  if (/\b(?:bedtime|nap|catnap|sleep)\b/i.test(text)) return "sleep"
  return null
}

function getCheckpointIconKinds(
  label: string,
  kind: ActivityKind,
): CheckpointIconKind[] {
  const isCompound = /[+/]/.test(label)
  if (!isCompound) return [kind]

  const kinds: CheckpointIconKind[] = []
  for (const segment of label.split(/\s*[+/]\s*/)) {
    const segmentKind = matchSegmentIconKind(segment)
    if (segmentKind && !kinds.includes(segmentKind)) {
      kinds.push(segmentKind)
    }
  }

  return kinds.length >= 2 ? kinds : [kind]
}

function CheckpointIcons({
  label,
  kind,
  state,
}: {
  label: string
  kind: ActivityKind
  state: "past" | "current" | "future"
}) {
  const kinds = getCheckpointIconKinds(label, kind)

  return (
    <span className="flex shrink-0 items-center gap-1">
      {kinds.map((iconKind) => {
        const Icon = CHECKPOINT_ICONS[iconKind]
        return (
          <Icon
            key={iconKind}
            aria-hidden
            className={cn("size-4 shrink-0", iconColor(iconKind, state))}
          />
        )
      })}
    </span>
  )
}

function ProgressDot({ state }: { state: "past" | "current" | "future" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-30 inline-block shrink-0 rounded-full transition-all duration-500",
        state === "future"
          ? "size-2 border border-black bg-muted-foreground"
          : "size-3 border border-black bg-primary",
      )}
    />
  )
}

/** Half of the default (size-3) checkpoint dot — keeps dot center on the timeline bar. */
const CHECKPOINT_DOT_CENTER_OFFSET_PX = 6

function getCheckpointRowTopY(anchorY: number): number {
  return anchorY - getScaledPx(CHECKPOINT_DOT_CENTER_OFFSET_PX)
}

type DayTimelineSectionProps = {
  babyId: string
  date: Date
  now: Date
  pxPerMinute: number
  registerNowRef?: (el: HTMLDivElement | null) => void
  registerDayStartRef?: (date: Date, el: HTMLDivElement | null) => void
}

export function DayTimelineSection({
  babyId,
  date,
  now,
  pxPerMinute,
  registerNowRef,
  registerDayStartRef,
}: DayTimelineSectionProps) {
  const { i18n } = useTranslation()
  const { version } = useActivityRefresh()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [logsVisible, setLogsVisible] = useState(false)

  const stage = useMemo(
    () => getCurrentStage(date),
    [date, i18n.language],
  )
  const items = useMemo(() => getStageDayItems(stage), [stage])
  const layout = useMemo(
    () => getSpreadTimelineLayout(items, pxPerMinute),
    [items, pxPerMinute],
  )

  const timelineRef = useRef<HTMLDivElement>(null)
  const dayStartRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!registerDayStartRef) return
    registerDayStartRef(date, dayStartRef.current)
    return () => registerDayStartRef(date, null)
  }, [date, registerDayStartRef])
  const [connectorMetrics, setConnectorMetrics] = useState({
    barX: 0,
    trunkX: 0,
    cardLeftX: 0,
    cardWidth: 0,
  })
  const [measuredCardHeights, setMeasuredCardHeights] = useState<
    Record<string, number>
  >({})
  const handleCardHeightChange = useCallback(
    (id: string, heightPx: number) => {
      setMeasuredCardHeights((current) => {
        if (current[id] === heightPx) return current
        return { ...current, [id]: heightPx }
      })
    },
    [],
  )
  const textSizeVersion = useTextSizeVersion()
  const nursingSides = useNursingTimerSession(babyId)

  const isToday = isSameDay(date, now)
  const isPastDay = startOfDay(date) < startOfDay(now)
  const isFutureDay = !isToday && !isPastDay

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const logged = await getActivitiesForDay(babyId, date)
      const imported = getImportedActivitiesForDay(date)
      setActivities(mergeActivities(imported, logged))
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [babyId, date])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (version === 0) return
    void load({ silent: true })
  }, [version]) // eslint-disable-line react-hooks/exhaustive-deps -- refresh only on log changes

  useEffect(() => {
    if (loading) {
      setLogsVisible(false)
      return
    }

    setLogsVisible(false)
    const id = requestAnimationFrame(() => setLogsVisible(true))
    return () => cancelAnimationFrame(id)
  }, [loading])

  const logsFadeClass = cn(
    "transition-opacity duration-150 ease-out",
    logsVisible ? "opacity-100" : "opacity-0",
  )

  const nowLayoutMin = isToday ? getNowLayoutMinutes(now) : 0

  const progressPercent = isPastDay
    ? 100
    : isFutureDay
      ? 0
      : layout.getProgressPercent(nowLayoutMin)

  const nowLabel = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })

  const nowPositionY = useMemo(() => {
    if (!isToday) return null
    return layout.getProgressPx(nowLayoutMin)
  }, [isToday, layout, nowLayoutMin])

  const estimatedDaySummaryBottom = useMemo(
    () =>
      getEstimatedDaySummaryBottom(
        activities,
        getCheckpointRowTopY(layout.midnightY),
      ),
    [activities, layout.midnightY, textSizeVersion, i18n.language],
  )

  const [measuredDaySummaryBottom, setMeasuredDaySummaryBottom] = useState(0)

  useLayoutEffect(() => {
    function measure() {
      const root = timelineRef.current
      const summary = summaryRef.current
      if (!root || !summary || summary.childElementCount === 0) {
        setMeasuredDaySummaryBottom(0)
        return
      }

      setMeasuredDaySummaryBottom(
        summary.getBoundingClientRect().bottom -
          root.getBoundingClientRect().top,
      )
    }

    measure()
    const summaryEl = summaryRef.current
    if (!summaryEl) return

    const observer = new ResizeObserver(measure)
    observer.observe(summaryEl)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [activities, layout.midnightY, textSizeVersion, i18n.language, loading])

  const daySummaryBottom = Math.max(
    estimatedDaySummaryBottom,
    measuredDaySummaryBottom,
  )
  const daySummaryMinLabelY = getDaySummaryMinLabelY(daySummaryBottom)
  const daySummaryMaxLabelY = getDaySummaryMaxLabelY(layout.height)

  const collapsedNursing = useMemo(
    () => collapseSavedNursingSessions(activities),
    [activities],
  )

  const {
    recordedEvents,
    ongoingTimelineCards,
    ongoingCardLabelYs,
    ongoingConnectorAnchorYs,
  } =
    useMemo(() => {
      const timelineEvents = expandActivitiesForTimeline(
        collapsedNursing.activities,
        date,
      )
      const nursingGroups = collapsedNursing.nursingGroups

      const ongoing = isToday
        ? getOngoingTimelineCards(activities, date, now)
        : []

      const placed = timelineEvents
        .filter(
          (event) => !(isToday && isOngoingNursingFeed(event.item)),
        )
        .map((event) => ({
        item: event.item,
        id: event.id,
        displayAt: event.at,
        sleepPhase: event.sleepPhase,
        nursingGroup:
          event.item.kind === "feed"
            ? nursingGroups.get(event.item.data.id)
            : undefined,
        anchorY: getActivityPositionPx(event.at, items, layout),
        labelY: 0,
      }))

      const nowAnchorY = isToday
        ? layout.getProgressPx(getNowLayoutMinutes(now))
        : null

      const ongoingAnchorYs =
        nowAnchorY != null
          ? ongoing.map((card) => {
              const frozenAt = getOngoingConnectorAnchorAt(
                card.item,
                nursingSides,
                card.nursingGroup,
              )
              return frozenAt
                ? layout.getProgressPx(getNowLayoutMinutes(frozenAt))
                : nowAnchorY
            })
          : []

      const preferredYs = [
        ...placed.map((event) => event.anchorY),
        ...ongoingAnchorYs,
      ]

      const defaultCardHeight = getScaledLogCardHeightPx(
        LOG_CARD_ESTIMATED_HEIGHT_PX,
      )

      const fontFamily =
        typeof document !== "undefined"
          ? getComputedStyle(document.body).fontFamily || "sans-serif"
          : "sans-serif"
      const cardWidth = connectorMetrics.cardWidth

      // Prefer real rendered heights; fall back to a text-wrap estimate until
      // the card has been measured.
      const itemHeights = [
        ...placed.map(
          (event) =>
            measuredCardHeights[event.id] ??
            estimateRecordedCardHeightPx(
              activitySummary(event.item, {
                sleepPhase: event.sleepPhase,
                now,
                nursingGroup: nursingGroups.get(event.item.data.id),
              }),
              cardWidth,
              isRecordedEventEditable(event.item, event.sleepPhase),
              fontFamily,
            ),
        ),
        ...(nowAnchorY != null
          ? ongoing.map(
              (card) =>
                measuredCardHeights[card.id] ??
                estimateRecordedCardHeightPx(
                  card.nursingGroup
                    ? `${ongoingTimelineTitle(card.item, card.nursingGroup)}\n${ongoingNursingGroupElapsedLabel(card.nursingGroup, nursingSides, now)}`
                    : `${ongoingTimelineTitle(card.item)}\n${formatElapsedClock(getOngoingElapsedSec(card.item, now, nursingSides, card.nursingGroup))}`,
                  cardWidth,
                  false,
                  fontFamily,
                ),
            )
          : []),
      ]

      const labelYs = spreadLabelPositions(
        preferredYs,
        getScaledPx(DEFAULT_RECORDED_LABEL_EDGE_GAP_PX),
        defaultCardHeight,
        daySummaryMinLabelY,
        daySummaryMaxLabelY,
        itemHeights,
      )

      return {
        recordedEvents: placed.map((event, index) => ({
          ...event,
          labelY: labelYs[index],
        })),
        ongoingTimelineCards: ongoing,
        ongoingCardLabelYs: ongoing.map(
          (_, index) => labelYs[placed.length + index],
        ),
        ongoingConnectorAnchorYs: ongoingAnchorYs,
      }
    }, [
      activities,
      date,
      daySummaryMinLabelY,
      daySummaryMaxLabelY,
      isToday,
      now,
      items,
      layout,
      textSizeVersion,
      connectorMetrics.cardWidth,
      measuredCardHeights,
      nursingSides,
    ])

  useEffect(() => {
    function measure() {
      const root = timelineRef.current
      const bar = barRef.current
      if (!root || !bar) return

      const rootRect = root.getBoundingClientRect()
      const barRect = bar.getBoundingClientRect()
      const logsPanelLeft =
        rootRect.width * SCHEDULE_PANEL_RATIO - TIMELINE_NUDGE_PX
      const logsPanelWidth =
        rootRect.width * (1 - SCHEDULE_PANEL_RATIO) + TIMELINE_NUDGE_PX
      setConnectorMetrics({
        barX: barRect.left + barRect.width / 2 - rootRect.left,
        trunkX: logsPanelLeft + CONNECTOR_TRUNK_OFFSET_PX,
        cardLeftX: logsPanelLeft + LOG_CARD_LEFT_OFFSET_PX,
        cardWidth: Math.min(
          logsPanelWidth - LOG_CARD_LEFT_OFFSET_PX,
          LOG_CARD_MAX_WIDTH_PX,
        ),
      })
    }

    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [layout.height, recordedEvents.length, ongoingTimelineCards.length])

  const dayHeaderDotState = isFutureDay ? "future" : "past"

  return (
    <section className="flex flex-col">
      <div
        ref={timelineRef}
        className="relative px-[2px]"
        style={{ height: layout.height }}
      >
        <RecordedEventConnectors
          events={recordedEvents}
          ongoingConnectors={ongoingTimelineCards.map((card, index) => ({
            id: card.id,
            labelY: ongoingCardLabelYs[index],
            anchorY: ongoingConnectorAnchorYs[index],
          }))}
          barX={connectorMetrics.barX}
          trunkX={connectorMetrics.trunkX}
          cardLeftX={connectorMetrics.cardLeftX}
          className={logsFadeClass}
        />

        <div
          className={cn(
            "pointer-events-none absolute left-0 z-0 grid",
            SCHEDULE_GRID,
          )}
          style={{ top: 0, height: layout.height, width: SCHEDULE_PANEL_WIDTH }}
        >
          <div />
          <div className="flex h-full justify-center">
            <div
              ref={barRef}
              className={cn(TIMELINE_MUTED_LINE_CLASS, "relative z-0 h-full w-px")}
            >
              <div
                className="bg-primary absolute top-0 w-full transition-[height] duration-500 ease-out"
                style={{ height: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {nowPositionY !== null && (
          <div
            className="pointer-events-none absolute left-0 z-0 flex -translate-y-1/2 items-center px-1"
            style={{ top: nowPositionY }}
          >
            <div className="w-14 shrink-0" aria-hidden />
            <div
              aria-hidden
              className={cn(TIMELINE_MUTED_LINE_CLASS, "h-px shrink-0")}
              style={{
                width: Math.max(
                  0,
                  connectorMetrics.barX - NOW_LINE_START_OFFSET_PX,
                ),
              }}
            />
          </div>
        )}

        <div
          ref={dayStartRef}
          className={cn("absolute left-0 z-10 grid", SCHEDULE_GRID)}
          style={{
            top: getCheckpointRowTopY(layout.midnightY),
            width: SCHEDULE_PANEL_WIDTH,
          }}
        >
          <div className="min-w-0 self-start pr-1 text-right">
            <time
              dateTime={date.toISOString()}
              className={cn(
                "block text-xs font-medium tabular-nums",
                checkpointTone(dayHeaderDotState),
              )}
            >
              12:00 AM
            </time>
            <h2
              className={cn(
                "text-foreground text-lg leading-tight font-bold tracking-tight",
                isToday && "text-xl",
              )}
            >
              {formatDayHeading(date)}
            </h2>
            <p className="text-muted-foreground text-xs">
              {stage.tab} · {stage.title}
            </p>
          </div>

          <div className="relative z-30 flex items-start justify-center">
            <ProgressDot state={dayHeaderDotState} />
          </div>
        </div>

        {items.map((item, index) => {
          const state = isPastDay
            ? "past"
            : isFutureDay
              ? "future"
              : getTimelineItemState(index, items, nowLayoutMin)

          return (
            <div
              key={`${item.time}-${item.label}`}
              className={cn(
                "absolute left-0 z-10 grid",
                SCHEDULE_GRID,
              )}
              style={{
                top: getCheckpointRowTopY(layout.positions[index]),
                width: SCHEDULE_PANEL_WIDTH,
              }}
            >
              <div className="min-w-0 self-start pr-1 text-right">
                <time
                  dateTime={item.time}
                  className={cn(
                    "block text-xs font-medium tabular-nums",
                    checkpointTone(state),
                  )}
                >
                  {item.time}
                </time>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <CheckpointIcons
                    label={item.label}
                    kind={item.kind}
                    state={state}
                  />
                  <p
                    className={cn(
                      "text-xs leading-snug",
                      checkpointTone(state),
                    )}
                  >
                    {item.label}
                  </p>
                </div>
              </div>

              <div className="relative z-30 flex items-start justify-center">
                <ProgressDot state={state} />
              </div>
            </div>
          )
        })}

        {nowPositionY !== null && (
          <>
            <div
              className={cn(
                "pointer-events-none absolute left-0 z-40 grid -translate-y-1/2",
                SCHEDULE_GRID,
              )}
              style={{ top: nowPositionY, width: SCHEDULE_PANEL_WIDTH }}
            >
              <div />
              <div className="relative flex items-center justify-center">
                <span
                  aria-hidden
                  className="relative z-[1] inline-block size-3 shrink-0 rounded-full border border-black bg-blue-500"
                />
              </div>
            </div>

            <div
              ref={registerNowRef}
              className="pointer-events-none absolute inset-x-0 z-50 -translate-y-1/2 px-1"
              style={{ top: nowPositionY }}
            >
              <time
                dateTime={now.toISOString()}
                className="inline-block rounded-md bg-blue-500 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums"
              >
                {nowLabel}
              </time>
            </div>
          </>
        )}

        <div
          className="absolute top-0 right-0 z-20"
          style={{ height: layout.height, width: LOGS_PANEL_WIDTH }}
        >
          <div className={logsFadeClass}>
            <div
              ref={summaryRef}
              className="absolute right-0 left-6 z-30 pb-3 text-left"
              style={{
                top:
                  getCheckpointRowTopY(layout.midnightY) +
                  getDaySummaryVerticalOffset(),
              }}
            >
              <DayActivitySummary activities={activities} />
            </div>
            <RecordedEvents
              events={recordedEvents}
              loading={loading}
              now={now}
              onCardHeightChange={handleCardHeightChange}
            />
            <OngoingNowCards
              cards={ongoingTimelineCards}
              labelYs={ongoingCardLabelYs}
              now={now}
              nursingSides={nursingSides}
              onCardHeightChange={handleCardHeightChange}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
