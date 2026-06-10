import { useMemo, type CSSProperties } from "react"
import { useTranslation } from "react-i18next"

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
  const { i18n } = useTranslation()
  const segments = useMemo(
    () => buildDayActivitySummary(activities),
    [activities, i18n.language],
  )

  if (!segments?.length) return null

  return (
    <div
      className={cn(
        "flex flex-col gap-y-2 text-sm leading-tight font-normal",
        className,
      )}
      style={style}
    >
      {segments.map((segment) => {
        const Icon = RECORDED_ICONS[segment.kind]
        return (
          <div
            key={segment.kind}
            className="flex w-full items-start gap-3"
          >
            <Icon
              aria-hidden
              className={cn("size-3.5 shrink-0", RECORDED_COLORS[segment.kind])}
            />
            <p className="-translate-y-0.5 flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
              {segment.subSegments.map((subSegment) => (
                <span
                  key={subSegment.key}
                  className="inline-flex items-center whitespace-nowrap"
                >
                  {subSegment.text}
                </span>
              ))}
            </p>
          </div>
        )
      })}
    </div>
  )
}
