import { useMemo, type CSSProperties } from "react"

import {
  RECORDED_COLORS,
  RECORDED_ICONS,
} from "@/components/today/recorded-events"
import { buildDayActivitySummary } from "@/lib/day-activity-summary"
import type { ActivityItem } from "@/lib/types"
import { cn } from "@/lib/utils"

type DayActivitySummaryProps = {
  activities: ActivityItem[]
  className?: string
  style?: CSSProperties
}

export function DayActivitySummary({
  activities,
  className,
  style,
}: DayActivitySummaryProps) {
  const segments = useMemo(
    () => buildDayActivitySummary(activities),
    [activities],
  )

  if (!segments?.length) return null

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-base leading-snug font-medium",
        className,
      )}
      style={style}
    >
      {segments.map((segment) => {
        const Icon = RECORDED_ICONS[segment.kind]
        return (
          <span
            key={segment.kind}
            className="text-foreground/90 inline-flex items-center gap-1.5"
          >
            <Icon
              aria-hidden
              className={cn("size-4.5 shrink-0", RECORDED_COLORS[segment.kind])}
            />
            <span>{segment.text}</span>
          </span>
        )
      })}
    </div>
  )
}
