import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BathIcon,
  MilkIcon,
  MoonIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  RecordedEventConnectors,
  RecordedEvents,
  type PlacedActivity,
} from "@/components/today/recorded-events"
import { useActivityRefresh } from "@/contexts/activity-refresh-context"
import { getActivitiesForDay } from "@/lib/api/logs"
import {
  getImportedActivitiesForDay,
  mergeActivities,
} from "@/lib/baby-tracker-import"
import { formatDayActivitySummary } from "@/lib/day-activity-summary"
import { formatDayHeading, isSameDay, startOfDay } from "@/lib/format"
import type { ActivityItem } from "@/lib/types"
import type { ActivityKind } from "@/lib/schedule-data"
import {
  getActivityPositionPx,
  getCurrentStage,
  getNowLayoutMinutes,
  getSpreadTimelineLayout,
  getStageDayItems,
  getTimelineItemState,
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

const SCHEDULE_GRID =
  "grid-cols-[3.75rem_1.25rem_minmax(0,1fr)] gap-x-3"

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
        "relative z-10 inline-block shrink-0 rounded-full border-2 transition-all duration-500",
        state === "past" && "bg-primary border-primary size-3",
        state === "current" &&
          "bg-primary border-primary ring-primary/40 size-3.5 ring-4",
        state === "future" &&
          "border-muted-foreground/50 size-3 bg-transparent",
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
    connectorX: 0,
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

  const dayLogSummary = useMemo(
    () => formatDayActivitySummary(activities),
    [activities],
  )

  const recordedEvents = useMemo((): PlacedActivity[] => {
    const sorted = [...activities].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    )

    const placed = sorted.map((item) => ({
      item,
      id: `${item.kind}-${item.data.id}`,
      anchorY: getActivityPositionPx(item.at, items, layout),
      labelY: 0,
    }))

    const labelYs = spreadLabelPositions(placed.map((event) => event.anchorY))

    return placed.map((event, index) => ({
      ...event,
      labelY: labelYs[index],
    }))
  }, [activities, items, layout])

  useEffect(() => {
    function measure() {
      const root = timelineRef.current
      const bar = barRef.current
      if (!root || !bar) return

      const rootRect = root.getBoundingClientRect()
      const barRect = bar.getBoundingClientRect()
      setConnectorMetrics({
        barX: barRect.left + barRect.width / 2 - rootRect.left,
        connectorX: rootRect.width * 0.52,
      })
    }

    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [layout.height, recordedEvents.length])

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
          barX={connectorMetrics.barX}
          connectorX={connectorMetrics.connectorX}
        />

        <div
          className={cn(
            "pointer-events-none absolute left-0 z-0 grid w-[52%]",
            SCHEDULE_GRID,
          )}
          style={{ top: 0, height: layout.height }}
        >
          <div />
          <div className="flex h-full justify-center">
            <div
              ref={barRef}
              className="bg-muted relative h-full w-[2px]"
            >
              <div
                className="bg-primary absolute top-0 w-full transition-[height] duration-500 ease-out"
                style={{ height: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div />
        </div>

        <div
          ref={dayStartRef}
          className={cn(
            "absolute left-0 z-10 grid w-[52%] -translate-y-1/2",
            SCHEDULE_GRID,
          )}
          style={{ top: layout.midnightY }}
        >
          <time
            dateTime={date.toISOString()}
            className={cn(
              "self-center text-xs font-medium tabular-nums",
              checkpointTone(dayHeaderDotState),
            )}
          >
            12:00 AM
          </time>

          <div className="relative z-20 flex items-center justify-center">
            <ProgressDot state={dayHeaderDotState} />
          </div>

          <div className="min-w-0 self-center">
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
                "absolute left-0 grid w-[52%] -translate-y-1/2",
                SCHEDULE_GRID,
              )}
              style={{ top: layout.positions[index] }}
            >
              <time
                dateTime={item.time}
                className={cn(
                  "self-center text-xs font-medium tabular-nums",
                  checkpointTone(state),
                )}
              >
                {item.time}
              </time>

              <div className="relative z-20 flex items-center justify-center">
                <ProgressDot state={state} />
              </div>

              <div className="min-w-0 self-center">
                <div className="flex flex-wrap items-center gap-2">
                  <CheckpointIcons
                    label={item.label}
                    kind={item.kind}
                    state={state}
                  />
                  <p
                    className={cn(
                      "text-sm leading-snug",
                      checkpointTone(state),
                      state === "current" && "font-medium text-foreground",
                    )}
                  >
                    {item.label}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {nowPositionY !== null && (
          <div
            ref={registerNowRef}
            className={cn(
              "absolute left-0 z-30 grid w-[52%] -translate-y-1/2",
              SCHEDULE_GRID,
            )}
            style={{ top: nowPositionY }}
          >
            <time
              dateTime={now.toISOString()}
              className="text-primary self-center text-xs font-semibold tabular-nums"
            >
              {nowLabel}
            </time>

            <div className="relative z-20 flex items-center justify-center">
              <span
                aria-hidden
                className="bg-primary border-primary relative inline-block size-3.5 shrink-0 rounded-full border-2 ring-4 ring-primary/40"
              />
            </div>

            <div className="min-w-0 self-center">
              <Badge className="h-5 px-2 text-[11px] font-semibold">Now</Badge>
            </div>
          </div>
        )}

        <div
          className="absolute top-0 right-0 w-[48%]"
          style={{ height: layout.height }}
        >
          {dayLogSummary && (
            <p
              className="text-foreground/90 absolute right-0 left-0 -translate-y-1/2 px-1 text-right text-xs leading-snug font-medium"
              style={{ top: layout.midnightY }}
            >
              {dayLogSummary}
            </p>
          )}
          <RecordedEvents events={recordedEvents} loading={loading} />
        </div>
      </div>
    </section>
  )
}
