import { InfoIcon, BabyIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TrendCharts } from "@/components/trend-charts"
import { StageTabs } from "@/components/stage-tabs"
import { useLocalizedSchedule } from "@/lib/localized-schedule"
import { useAuth } from "@/contexts/auth-context"

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-card flex flex-col gap-1 rounded-lg border p-4">
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

export function SchedulePage() {
  const { t } = useTranslation()
  const { baby } = useAuth()
  const { stages, comparisonRows } = useLocalizedSchedule()
  const babyName = baby?.name ?? "Luca"

  const heroStats = [
    { value: "~10/day", label: t("schedule.heroFeeds") },
    { value: "90–110 ml", label: t("schedule.heroFeedSize") },
    { value: "6h 53m", label: t("schedule.heroNightStretch") },
    { value: "~9:00 PM", label: t("schedule.heroBedtime") },
  ]

  const habits = [
    {
      title: t("schedule.habitFeeding"),
      items: [
        [t("schedule.habitFeed1Lead"), t("schedule.habitFeed1Rest")],
        [t("schedule.habitFeed2Lead"), t("schedule.habitFeed2Rest")],
        [t("schedule.habitFeed3Lead"), t("schedule.habitFeed3Rest")],
      ],
    },
    {
      title: t("schedule.habitSleep"),
      items: [
        [t("schedule.habitSleep1Lead"), t("schedule.habitSleep1Rest")],
        [t("schedule.habitSleep2Lead"), t("schedule.habitSleep2Rest")],
        [t("schedule.habitSleep3Lead"), t("schedule.habitSleep3Rest")],
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <BabyIcon className="size-5" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("schedule.pageTitle", { name: babyName })}
            </h1>
          </div>
          <Badge variant="secondary">{t("schedule.born")}</Badge>
        </div>
        <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
          {t("schedule.intro")}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {heroStats.map((s) => (
          <HeroStat key={s.label} {...s} />
        ))}
      </div>

      <Alert>
        <InfoIcon />
        <AlertTitle>{t("schedule.howToRead")}</AlertTitle>
        <AlertDescription>{t("schedule.howToReadDescription")}</AlertDescription>
      </Alert>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("schedule.trendsTitle")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("schedule.trendsSubtitle")}
          </p>
        </div>
        <TrendCharts />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("schedule.glanceTitle")}
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">{t("schedule.metric")}</TableHead>
                {stages.map((s) => (
                  <TableHead key={s.id}>
                    {s.tab} · {s.dates}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  {stages.map((s) => (
                    <TableCell key={s.id} className="text-muted-foreground">
                      {row.get(s)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("schedule.sampleDayTitle")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("schedule.sampleDaySubtitle")}
          </p>
        </div>
        <StageTabs />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("schedule.habitsTitle")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {habits.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="text-base">{group.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {group.items.map(([lead, rest]) => (
                  <p key={lead} className="text-sm leading-relaxed">
                    <span className="font-semibold">{lead}</span>{" "}
                    <span className="text-muted-foreground">{rest}</span>
                  </p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
