import { useEffect, useMemo, useState } from "react"
import { LineChartIcon, ListIcon, Loader2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DayActivitySummary } from "@/components/today/day-activity-summary"
import { DaySummaryTrends } from "@/components/today/day-summary-trends"
import { DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useActivityRefresh } from "@/contexts/activity-refresh-context"
import { useAuth } from "@/contexts/auth-context"
import { getActivitiesForDays } from "@/lib/api/logs"
import {
  getImportedActivitiesForDay,
  getNavigationDateBounds,
  mergeActivities,
} from "@/lib/baby-tracker-import"
import { buildDayActivitySummary } from "@/lib/day-activity-summary"
import { addDays, formatDayHeading, startOfDay } from "@/lib/format"
import type { ActivityItem } from "@/lib/types"

type DaySummaryEntry = {
  date: Date
  activities: ActivityItem[]
}

function buildNavigationDays() {
  const { min, max } = getNavigationDateBounds()
  const days: Date[] = []

  for (let day = startOfDay(min); day <= max; day = addDays(day, 1)) {
    days.push(new Date(day))
  }

  return days
}

type DaySummariesPanelProps = {
  open: boolean
}

type SummaryView = "list" | "graph"

export function DaySummariesPanel({ open }: DaySummariesPanelProps) {
  const { t } = useTranslation()
  const { baby } = useAuth()
  const { version } = useActivityRefresh()
  const [entries, setEntries] = useState<DaySummaryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<SummaryView>("list")

  const navigationDays = useMemo(() => buildNavigationDays(), [])
  const showLoading = loading && entries.length === 0

  useEffect(() => {
    if (!open || !baby?.id) return

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const loggedByDay = await getActivitiesForDays(baby!.id, navigationDays)

        if (cancelled) return

        const withSummaries = navigationDays
          .map((date) => {
            const logged =
              loggedByDay.get(startOfDay(date).toISOString()) ?? []
            const imported = getImportedActivitiesForDay(date)
            const activities = mergeActivities(imported, logged)
            return { date, activities }
          })
          .filter(({ activities }) => buildDayActivitySummary(activities)?.length)
          .sort((a, b) => b.date.getTime() - a.date.getTime())

        setEntries(withSummaries)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open, baby?.id, navigationDays, version])

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{t("nav.summary")}</DrawerTitle>
        {entries.length > 0 && (
          <SegmentedControl
            className="mt-3"
            value={view}
            onValueChange={(next) => setView(next as SummaryView)}
            options={[
              { value: "list", label: t("summary.viewList"), icon: ListIcon },
              { value: "graph", label: t("summary.viewGraph"), icon: LineChartIcon },
            ]}
          />
        )}
      </DrawerHeader>
      <div className="max-h-[calc(88dvh-7rem)] overflow-y-auto overscroll-contain pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      {showLoading ? (
        <div
          className="text-muted-foreground flex flex-col items-center justify-center gap-3 px-4 py-12 text-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2Icon className="size-6 animate-spin" aria-hidden />
          <p>{t("nav.summaryLoading")}</p>
        </div>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-sm">
          {t("nav.summaryEmpty")}
        </p>
      ) : view === "graph" ? (
        <DaySummaryTrends entries={entries} />
      ) : (
        <ul>
          {entries.map(({ date, activities }) => (
            <li
              key={date.toISOString()}
              className="border-b px-4 py-3 last:border-b-0"
            >
              <h3 className="text-muted-foreground text-xs font-semibold">
                {formatDayHeading(date)}
              </h3>
              <DayActivitySummary
                activities={activities}
                className="mt-3 text-sm leading-snug [&_svg]:size-4"
              />
            </li>
          ))}
        </ul>
      )}
      </div>
    </>
  )
}
