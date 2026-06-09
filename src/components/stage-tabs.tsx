import { useTranslation } from "react-i18next"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLocalizedSchedule } from "@/lib/localized-schedule"
import { type ActivityKind, type Stage } from "@/lib/schedule-data"

function ActivityDot({ kind }: { kind: ActivityKind }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 rounded-full border",
        kind === "feed" && "border-primary bg-primary",
        kind === "sleep" && "border-muted-foreground bg-muted-foreground",
        kind === "wake" && "border-muted-foreground bg-transparent",
      )}
    />
  )
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-muted/50 flex flex-col gap-1 rounded-lg p-3">
      <span className="text-xl font-semibold tracking-tight">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

function StagePanel({ stage }: { stage: Stage }) {
  const { t } = useTranslation()

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{t("schedule.dayInStage")}</CardTitle>
            <Badge variant="secondary">{t("schedule.sample24h")}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-24">{t("schedule.time")}</TableHead>
                <TableHead>{t("schedule.activity")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stage.day.map((item) => (
                <TableRow key={item.time + item.label}>
                  <TableCell>
                    <ActivityDot kind={item.kind} />
                  </TableCell>
                  <TableCell className="font-medium">{item.time}</TableCell>
                  <TableCell
                    className={cn(
                      item.kind === "wake" && "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <StatTile value={stage.feedsPerDay} label={t("schedule.feedsPerDay")} />
          <StatTile
            value={stage.perFeed.split(" ")[0]}
            label={t("schedule.mlPerFeed")}
          />
          <StatTile
            value={stage.nightStretch.split(" ")[0]}
            label={t("schedule.nightStretchH")}
          />
          <StatTile
            value={stage.bedtime.split("–")[0]}
            label={t("schedule.bedtimeFrom")}
          />
        </div>
        <div className="bg-muted/50 flex flex-col gap-1.5 rounded-lg p-4">
          <span className="text-sm font-semibold">{t("schedule.focusStage")}</span>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {stage.focus}
          </p>
        </div>
      </div>
    </div>
  )
}

export function StageTabs() {
  const { stages } = useLocalizedSchedule()

  return (
    <Tabs defaultValue={stages[0].id} className="gap-4">
      <TabsList className="bg-card !h-auto flex-wrap items-center gap-1 p-2">
        {stages.map((s) => (
          <TabsTrigger key={s.id} value={s.id} className="!h-auto shrink-0 px-4 py-2">
            <span className="font-medium">{s.tab}</span>
            <span className="text-muted-foreground text-xs">{s.dates}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {stages.map((s) => (
        <TabsContent key={s.id} value={s.id} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
            <span className="text-muted-foreground text-sm">{s.age}</span>
          </div>
          <StagePanel stage={s} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
