import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BathIcon,
  MilkIcon,
  MoonIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react"

import { getOngoingTimelineCards } from "@/components/log/activity-label"
import { DayActivitySummary } from "@/components/today/day-activity-summary"
import {
  CONNECTOR_TRUNK_OFFSET_PX,
  LOG_CARD_ESTIMATED_HEIGHT_PX,
  LOG_CARD_LEFT_OFFSET_PX,
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
import { formatDayHeading, isSameDay, startOfDay } from "@/lib/format"
import { expandActivitiesForTimeline } from "@/lib/sleep-timeline"
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
import { cn } from "@/lib/utils"

type CheckpointIconKind = ActivityKind | "bath"

const CHECKPOINT_ICONS: Record<CheckpointIconKind, LucideIcon> = {
  wake: SunIcon,
  feed: MilkIcon,
  sleep: MoonIcon,
  bath: BathIcon,
}

const SCHEDULE_PANEL_WIDTH = "38%"
const LOGS_PANEL_WIDTH = "62%"
const SCHEDULE_PANEL_RATIO = 0.38
const NOW_LINE_START_OFFSET_PX = 64 // px-1 + w-14 timestamp clearance

const SCHEDULE_GRID =
  "grid-cols-[minmax(0,1fr)_1.25rem] gap-x-2"

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

type DayTimelineSectionProps = {
  babyId: string
  date: Date
  now: Date
  registerNowRef?: (el: HTMLDivElement | null) => void
  registerDayStartRef?: (date: Date, el: HTMLDivElement | null) => void
}

export function DayTimelineSection({
  babyId,
  date,
  now,
  registerNowRef,
  registerDayStartRef,
}: DayTimelineSectionProps) {
  const { version } = useActivityRefresh()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const stage = useMemo(() => getCurrentStage(date), [date])
  const items = useMemo(() => getStageDayItems(stage), [stage])
  const layout = useMemo(() => getSpreadTimelineLayout(items), [items])

  const timelineRef = useRef<HTMLDivElement>(null)
  const dayStartRef = useRef<HTMLDivElement>(null)
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
  })

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

  const { recordedEvents, ongoingTimelineCards, ongoingCardLabelYs } =
    useMemo(() => {
      const timelineEvents = expandActivitiesForTimeline(activities, date)

      const placed = timelineEvents.map((event) => ({
        item: event.item,
        id: event.id,
        displayAt: event.at,
        sleepPhase: event.sleepPhase,
        anchorY: getActivityPositionPx(event.at, items, layout),
        labelY: 0,
      }))

      const ongoing = isToday
        ? getOngoingTimelineCards(activities, date, now)
        : []
      const nowAnchorY = isToday
        ? layout.getProgressPx(getNowLayoutMinutes(now))
        : null

      const preferredYs = [
        ...placed.map((event) => event.anchorY),
        ...(nowAnchorY != null
          ? ongoing.map(() => nowAnchorY)
          : []),
      ]

      const labelYs = spreadLabelPositions(
        preferredYs,
        DEFAULT_RECORDED_LABEL_EDGE_GAP_PX,
        LOG_CARD_ESTIMATED_HEIGHT_PX,
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
      }
    }, [activities, date, isToday, now, items, layout])

  useEffect(() => {
    function measure() {
      const root = timelineRef.current
      const bar = barRef.current
      if (!root || !bar) return

      const rootRect = root.getBoundingClientRect()
      const barRect = bar.getBoundingClientRect()
      const logsPanelLeft = rootRect.width * SCHEDULE_PANEL_RATIO
      setConnectorMetrics({
        barX: barRect.left + barRect.width / 2 - rootRect.left,
        trunkX: logsPanelLeft + CONNECTOR_TRUNK_OFFSET_PX,
        cardLeftX: logsPanelLeft + LOG_CARD_LEFT_OFFSET_PX,
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
        className="relative px-1"
        style={{ height: layout.height }}
      >
        <RecordedEventConnectors
          events={recordedEvents}
          ongoingConnectors={ongoingTimelineCards.map((card, index) => ({
            id: card.id,
            labelY: ongoingCardLabelYs[index],
          }))}
          nowAnchorY={nowPositionY}
          barX={connectorMetrics.barX}
          trunkX={connectorMetrics.trunkX}
          cardLeftX={connectorMetrics.cardLeftX}
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
          className={cn(
            "absolute left-0 z-10 grid -translate-y-1/2",
            SCHEDULE_GRID,
          )}
          style={{ top: layout.midnightY, width: SCHEDULE_PANEL_WIDTH }}
        >
          <div className="min-w-0 self-center pr-1 text-right">
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

          <div className="relative z-30 flex items-center justify-center">
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
                "absolute left-0 z-10 grid -translate-y-1/2",
                SCHEDULE_GRID,
              )}
              style={{
                top: layout.positions[index],
                width: SCHEDULE_PANEL_WIDTH,
              }}
            >
              <div className="min-w-0 self-center pr-1 text-right">
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

              <div className="relative z-30 flex items-center justify-center">
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
          <DayActivitySummary
            activities={activities}
            className="absolute right-0 left-6 -translate-y-1/2 text-left"
            style={{ top: layout.midnightY }}
          />
          <RecordedEvents events={recordedEvents} loading={loading} now={now} />
          <OngoingNowCards
            cards={ongoingTimelineCards}
            labelYs={ongoingCardLabelYs}
            now={now}
          />
        </div>
      </div>
    </section>
  )
}
