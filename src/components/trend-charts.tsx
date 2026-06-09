import { useTranslation } from "react-i18next"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useLocalizedSchedule } from "@/lib/localized-schedule"

function TrendCard({
  title,
  unit,
  description,
  dataKey,
  config,
  suffix,
  domain,
  data,
  allowDecimals = false,
}: {
  title: string
  unit: string
  description: string
  dataKey: "nightStretch" | "feedSize" | "bottleMl"
  config: ChartConfig
  suffix: string
  domain: [number, number]
  data: Array<{ week: string; nightStretch: number; bottleMl: number; feedSize: number }>
  allowDecimals?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="text-muted-foreground text-xs">{unit}</span>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[200px] w-full">
          <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={38}
              fontSize={11}
              domain={domain}
              allowDecimals={allowDecimals}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey={dataKey}
              type="monotone"
              stroke={`var(--color-${dataKey})`}
              fill={`var(--color-${dataKey})`}
              fillOpacity={0.22}
              strokeWidth={2.5}
              dot={{
                r: 3.5,
                fill: `var(--color-${dataKey})`,
                strokeWidth: 0,
              }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              unit={suffix}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function TrendCharts() {
  const { t } = useTranslation()
  const { trends } = useLocalizedSchedule()

  const nightConfig = {
    nightStretch: {
      label: t("schedule.chartLongestStretch"),
      theme: {
        light: "oklch(0.52 0.22 285)",
        medium: "oklch(0.72 0.16 285)",
        dark: "oklch(0.72 0.16 285)",
      },
    },
  } satisfies ChartConfig

  const feedConfig = {
    feedSize: {
      label: t("schedule.chartFeedSize"),
      theme: {
        light: "oklch(0.55 0.18 235)",
        medium: "oklch(0.74 0.14 210)",
        dark: "oklch(0.74 0.14 210)",
      },
    },
  } satisfies ChartConfig

  const bottleConfig = {
    bottleMl: {
      label: t("schedule.chartBottleMl"),
      theme: {
        light: "oklch(0.50 0.17 160)",
        medium: "oklch(0.70 0.13 165)",
        dark: "oklch(0.70 0.13 165)",
      },
    },
  } satisfies ChartConfig

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <TrendCard
        title={t("schedule.trendNightTitle")}
        unit={t("schedule.trendNightUnit")}
        description={t("schedule.trendNightDesc")}
        dataKey="nightStretch"
        config={nightConfig}
        suffix=" h"
        domain={[0, 6]}
        data={trends}
      />
      <TrendCard
        title={t("schedule.trendFeedTitle")}
        unit={t("schedule.trendFeedUnit")}
        description={t("schedule.trendFeedDesc")}
        dataKey="feedSize"
        config={feedConfig}
        suffix=" ml"
        domain={[0, 120]}
        data={trends}
      />
      <TrendCard
        title={t("schedule.trendBottleTitle")}
        unit={t("schedule.trendBottleUnit")}
        description={t("schedule.trendBottleDesc")}
        dataKey="bottleMl"
        config={bottleConfig}
        suffix=" ml"
        domain={[0, 600]}
        data={trends}
      />
    </div>
  )
}
