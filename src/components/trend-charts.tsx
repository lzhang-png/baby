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
import { TRENDS } from "@/lib/schedule-data"

const nightConfig = {
  nightStretch: { label: "Longest stretch", color: "var(--chart-2)" },
} satisfies ChartConfig

const feedConfig = {
  feedSize: { label: "Feed size", color: "var(--chart-1)" },
} satisfies ChartConfig

const bottleConfig = {
  bottleMl: { label: "Bottle ml/day", color: "var(--chart-4)" },
} satisfies ChartConfig

function TrendCard({
  title,
  unit,
  description,
  dataKey,
  config,
  suffix,
  domain,
  allowDecimals = false,
}: {
  title: string
  unit: string
  description: string
  dataKey: "nightStretch" | "feedSize" | "bottleMl"
  config: ChartConfig
  suffix: string
  domain: [number, number]
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
          <AreaChart data={TRENDS} margin={{ left: 4, right: 12, top: 8 }}>
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
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{ r: 3 }}
              unit={suffix}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function TrendCharts() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <TrendCard
        title="Longest night sleep stretch"
        unit="hours"
        description="Weekly avg of the single longest overnight stretch. Source: Baby Tracker, Apr 23–Jun 6."
        dataKey="nightStretch"
        config={nightConfig}
        suffix=" h"
        domain={[0, 6]}
      />
      <TrendCard
        title="Typical largest single feed"
        unit="ml"
        description="Biggest bottle that week — appetite roughly doubled. Source: Baby Tracker."
        dataKey="feedSize"
        config={feedConfig}
        suffix=" ml"
        domain={[0, 120]}
      />
      <TrendCard
        title="Measured bottle intake"
        unit="ml/day"
        description="Bottles only. The late dip reflects more direct nursing (unmeasured), so total intake held steady."
        dataKey="bottleMl"
        config={bottleConfig}
        suffix=" ml"
        domain={[0, 600]}
      />
    </div>
  )
}
