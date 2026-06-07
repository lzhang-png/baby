import {
  DropletsIcon,
  MilkIcon,
  MoonIcon,
  SyringeIcon,
  type LucideIcon,
} from "lucide-react"

import {
  activitySummary,
  activityTime,
} from "@/components/log/activity-label"
import type { ActivityItem } from "@/lib/types"
import { cn } from "@/lib/utils"

const RECORDED_ICONS: Record<ActivityItem["kind"], LucideIcon> = {
  feed: MilkIcon,
  sleep: MoonIcon,
  diaper: DropletsIcon,
  pump: SyringeIcon,
}

const RECORDED_COLORS: Record<ActivityItem["kind"], string> = {
  feed: "text-sky-400",
  sleep: "text-indigo-400",
  diaper: "text-emerald-400",
  pump: "text-violet-400",
}

export type PlacedActivity = {
  item: ActivityItem
  id: string
  anchorY: number
  labelY: number
}

type RecordedEventsProps = {
  events: PlacedActivity[]
  loading?: boolean
}

export function RecordedEvents({ events, loading }: RecordedEventsProps) {
  if (loading) {
    return (
      <p className="text-muted-foreground text-sm">Loading recorded events…</p>
    )
  }

  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No events logged yet today.
      </p>
    )
  }

  return (
    <>
      {events.map(({ item, id, labelY }) => {
        const Icon = RECORDED_ICONS[item.kind]
        return (
          <div
            key={id}
            className="absolute right-0 left-0 -translate-y-1/2"
            style={{ top: labelY }}
          >
            <div className="bg-card/90 flex items-start gap-2 rounded-lg border px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
              <Icon
                aria-hidden
                className={cn("mt-0.5 size-3.5 shrink-0", RECORDED_COLORS[item.kind])}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium tabular-nums">
                  {activityTime(item)}
                </p>
                <p className="text-muted-foreground text-[11px] leading-snug">
                  {activitySummary(item)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}

export function RecordedEventConnectors({
  events,
  barX,
  connectorX,
}: {
  events: PlacedActivity[]
  barX: number
  connectorX: number
}) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
    >
      {events.map(({ id, anchorY, labelY }) => (
        <g key={id}>
          <circle
            cx={barX}
            cy={anchorY}
            r={3}
            className="fill-primary"
          />
          <line
            x1={barX}
            y1={anchorY}
            x2={connectorX}
            y2={labelY}
            className="stroke-muted-foreground/50"
            strokeWidth={1}
          />
        </g>
      ))}
    </svg>
  )
}
