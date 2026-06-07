import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MilkIcon,
  MoonIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RecordedEventConnectors,
  RecordedEvents,
  type PlacedActivity,
} from "@/components/today/recorded-events"
import { getActivitiesForDay } from "@/lib/api/logs"
import {
  clampNavigationDate,
  getImportedActivitiesForDay,
  getNavigationDateBounds,
  mergeActivities,
} from "@/lib/baby-tracker-import"
import {
  addDays,
  formatDayHeading,
  isSameDay,
  startOfDay,
} from "@/lib/format"
import type { ActivityKind } from "@/lib/schedule-data"
import {
  getActivityPositionPx,
  getCurrentStage,
  getNowNormalizedMinutes,
  getSpreadTimelineLayout,
  getStageDayItems,
  getTimelineItemState,
  spreadLabelPositions,
} from "@/lib/schedule-utils"
import type { ActivityItem } from "@/lib/types"
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

type ScheduleTimelineProps = {
  babyId: string
}

export function ScheduleTimeline({ babyId }: ScheduleTimelineProps) {
  const [viewDate, setViewDate] = useState(() => startOfDay(new Date()))
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())

  const stage = useMemo(() => getCurrentStage(viewDate), [viewDate])
  const items = useMemo(() => getStageDayItems(stage), [stage])
  const layout = useMemo(() => getSpreadTimelineLayout(items), [items])

  const currentRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [connectorMetrics, setConnectorMetrics] = useState({
    barX: 0,
    connectorX: 0,
  })

  const isToday = isSameDay(viewDate, new Date())
  const isPastDay = viewDate < startOfDay(new Date())
  const isFutureDay = viewDate > startOfDay(new Date())
  const bounds = getNavigationDateBounds()
  const canGoPrev = startOfDay(viewDate) > bounds.min
  const canGoNext = startOfDay(viewDate) < bounds.max

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const logged = await getActivitiesForDay(babyId, viewDate)
      const imported = getImportedActivitiesForDay(viewDate)
      setActivities(mergeActivities(imported, logged))
    } finally {
      setLoading(false)
    }
  }, [babyId, viewDate])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!isToday) return
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [isToday])

  const nowNorm = isToday ? getNowNormalizedMinutes(now) : 0

  const progressPercent = isPastDay
    ? 100
    : isFutureDay
      ? 0
      : layout.getProgressPercent(nowNorm)

  const nowLabel = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })

  const placedActivities = useMemo((): PlacedActivity[] => {
    const sorted = [...activities].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    )
    const anchorYs = sorted.map((item) =>
      getActivityPositionPx(item.at, items, layout),
    )
    const labelYs = spreadLabelPositions(anchorYs)

    return sorted.map((item, index) => ({
      item,
      id: `${item.kind}-${item.data.id}`,
      anchorY: anchorYs[index],
      labelY: labelYs[index],
    }))
  }, [activities, items, layout])

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const target = currentRef.current
    if (target && isToday) {
      const top =
        target.offsetTop - scrollEl.clientHeight / 2 + target.clientHeight / 2
      scrollEl.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
      return
    }

    scrollEl.scrollTo({ top: 0, behavior: "smooth" })
  }, [viewDate, isToday, layout.height])

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
  }, [layout.height, placedActivities.length, viewDate])

  function goDay(offset: number) {
    setViewDate((current) =>
      clampNavigationDate(addDays(current, offset)),
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="bg-background/95 sticky top-0 z-20 flex items-center gap-2 border-b py-3 backdrop-blur">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous day"
          disabled={!canGoPrev}
          onClick={() => goDay(-1)}
        >
          <ChevronLeftIcon />
        </Button>

        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-base font-semibold tracking-tight">
            {formatDayHeading(viewDate)}
          </h1>
          <p className="text-muted-foreground truncate text-xs">
            {stage.tab} · {stage.title}
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          aria-label="Next day"
          disabled={!canGoNext}
          onClick={() => goDay(1)}
        >
          <ChevronRightIcon />
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 px-1 pt-3">
        <p className="text-muted-foreground text-xs font-medium">Schedule</p>
        <p className="text-muted-foreground text-xs font-medium">
          Recorded
          {!loading && (
            <span className="text-muted-foreground/80">
              {" "}
              · {activities.length}
            </span>
          )}
        </p>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto pb-2"
        style={{
          maxHeight:
            "calc(100svh - 5rem - env(safe-area-inset-bottom, 0px) - 7.5rem)",
        }}
      >
        <div
          ref={timelineRef}
          className="relative px-1"
          style={{ height: layout.height }}
        >
          <RecordedEventConnectors
            events={placedActivities}
            barX={connectorMetrics.barX}
            connectorX={connectorMetrics.connectorX}
          />

          <div
            className={cn(
              "pointer-events-none absolute left-0 grid w-[52%]",
              SCHEDULE_GRID,
            )}
            style={{ top: layout.trackTop, height: layout.trackHeight }}
          >
            <div />
            <div className="flex justify-center">
              <div
                ref={barRef}
                className="bg-muted relative h-full w-[2px] overflow-hidden rounded-full"
              >
                <div
                  className="bg-primary absolute top-0 w-full rounded-full transition-[height] duration-500 ease-out"
                  style={{ height: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div />
          </div>

          {items.map((item, index) => {
            const state = isPastDay
              ? "past"
              : isFutureDay
                ? "future"
                : getTimelineItemState(index, items, nowNorm)

            return (
              <div
                key={`${item.time}-${item.label}`}
                ref={state === "current" ? currentRef : undefined}
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
                    {state === "current" && isToday && (
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px]"
                      >
                        {nowLabel}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          <div
            className="absolute top-0 right-0 w-[48%]"
            style={{ height: layout.height }}
          >
            <RecordedEvents events={placedActivities} loading={loading} />
          </div>
        </div>
      </div>
    </section>
  )
}
