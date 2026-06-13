import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  buildDaySummaryMetrics,
  type DaySummaryMetricKey,
} from "@/lib/day-summary-metrics"
import { getDateLocale } from "@/lib/i18n"
import type { ActivityItem } from "@/lib/types"

type DaySummaryEntry = {
  date: Date
  activities: ActivityItem[]
}

type TrendPoint = {
  label: string
  feedCount: number
  feedMl: number
  diaperCount: number
  pumpMl: number
  sleepHours: number
}

type MetricDef = {
  key: DaySummaryMetricKey
  titleKey: string
  unitKey: string
  suffix: string
  color: string
}

const METRICS: MetricDef[] = [
  {
    key: "feedMl",
    titleKey: "summary.trendFeedVolume",
    unitKey: "summary.trendUnitMlDay",
    suffix: " ml",
    color: "oklch(0.75 0.13 233)",
  },
  {
    key: "feedCount",
    titleKey: "summary.trendFeedCount",
    unitKey: "summary.trendUnitPerDay",
    suffix: "",
    color: "oklch(0.66 0.15 233)",
  },
  {
    key: "sleepHours",
    titleKey: "summary.trendSleep",
    unitKey: "summary.trendUnitHoursDay",
    suffix: " h",
    color: "oklch(0.62 0.18 277)",
  },
  {
    key: "diaperCount",
    titleKey: "summary.trendDiaper",
    unitKey: "summary.trendUnitPerDay",
    suffix: "",
    color: "oklch(0.56 0.13 67)",
  },
  {
    key: "pumpMl",
    titleKey: "summary.trendPump",
    unitKey: "summary.trendUnitMlDay",
    suffix: " ml",
    color: "oklch(0.65 0.19 295)",
  },
]

function TrendCard({
  title,
  unit,
  metricKey,
  color,
  suffix,
  data,
}: {
  title: string
  unit: string
  metricKey: DaySummaryMetricKey
  color: string
  suffix: string
  data: TrendPoint[]
}) {
  const config = {
    [metricKey]: { label: title, color },
  } satisfies ChartConfig

  const allowDecimals = metricKey === "sleepHours"

  return (
    <div className="rounded-xl bg-card px-3 py-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-muted-foreground text-xs">{unit}</span>
      </div>
      <ChartContainer config={config} className="h-[140px] w-full">
        <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={10}
            minTickGap={16}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={30}
            fontSize={10}
            allowDecimals={allowDecimals}
            domain={[0, "auto"]}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />
          <Area
            dataKey={metricKey}
            type="monotone"
            stroke={`var(--color-${metricKey})`}
            fill={`var(--color-${metricKey})`}
            fillOpacity={0.2}
            strokeWidth={2.5}
            dot={{ r: 3, fill: `var(--color-${metricKey})`, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            unit={suffix}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

export function DaySummaryTrends({ entries }: { entries: DaySummaryEntry[] }) {
  const { t, i18n } = useTranslation()

  const data = useMemo<TrendPoint[]>(() => {
    return [...entries]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((entry) => {
        const metrics = buildDaySummaryMetrics(entry.activities)
        return {
          label: entry.date.toLocaleDateString(getDateLocale(), {
            month: "short",
            day: "numeric",
          }),
          ...metrics,
        }
      })
    // Re-localize axis labels when the language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, i18n.language])

  const visibleMetrics = useMemo(
    () => METRICS.filter((metric) => data.some((point) => point[metric.key] > 0)),
    [data],
  )

  if (visibleMetrics.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-6 text-sm">
        {t("nav.summaryEmpty")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {visibleMetrics.map((metric) => (
        <TrendCard
          key={metric.key}
          title={t(metric.titleKey)}
          unit={t(metric.unitKey)}
          metricKey={metric.key}
          color={metric.color}
          suffix={metric.suffix}
          data={data}
        />
      ))}
    </div>
  )
}
