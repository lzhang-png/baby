import { InfoIcon, BabyIcon } from "lucide-react"

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
import { COMPARISON_ROWS, STAGES } from "@/lib/schedule-data"

const HERO_STATS = [
  { value: "~10/day", label: "Feeds now (bottle + nursing)" },
  { value: "90–110 ml", label: "Typical feed now" },
  { value: "6h 53m", label: "Best night stretch (Jun 4)" },
  { value: "~9:00 PM", label: "Current bedtime" },
]

const HABITS = [
  {
    title: "Feeding",
    items: [
      ["Full feeds, not snacks.", "Aim for bigger, well-spaced feeds so each meal counts — this is what stretched his night sleep."],
      ["Cluster feed before bed.", "A solid evening feed (and an optional dream feed) tops him off for the long stretch."],
      ["Daily cap ~900–1000 ml.", "Past ~4 months most calories still come from milk; don't push beyond comfort."],
    ],
  },
  {
    title: "Sleep",
    items: [
      ["Watch wake windows, not the clock.", "Putting him down before he's overtired prevents short, fussy naps."],
      ["Same wind-down nightly.", "Dim lights, feed, sleep sack, down drowsy — repetition teaches self-settling."],
      ["Day vs. night contrast.", "Bright and interactive by day, dark and boring at night, so the long stretch shifts into the night."],
    ],
  },
]

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-card flex flex-col gap-1 rounded-lg border p-4">
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

export default function App() {
  return (
    <div className="bg-background min-h-svh">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-10">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                <BabyIcon className="size-5" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">
                Luca's Feeding & Sleep Plan
              </h1>
            </div>
            <Badge variant="secondary">Born Apr 21, 2026 · ~6.5 weeks now</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
            A 3-month roadmap (Jun → Sep) built from Luca's own Baby Tracker logs. The schedule
            follows the rhythm he's already showing and gently moves him toward longer nights and
            fewer, bigger feeds.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HERO_STATS.map((s) => (
            <HeroStat key={s.label} {...s} />
          ))}
        </div>

        <Alert>
          <InfoIcon />
          <AlertTitle>How to read this</AlertTitle>
          <AlertDescription>
            These targets are built from Luca's data plus standard infant guidance — a flexible
            framework, not a rulebook. Feed on hunger cues and follow his lead. Confirm volumes and
            any night-weaning with your pediatrician, especially around weight checks.
          </AlertDescription>
        </Alert>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-tight">What Luca's logs show</h2>
            <p className="text-muted-foreground text-sm">
              Two clear trends over his first 6 weeks: nights are consolidating and his appetite per
              feed is climbing.
            </p>
          </div>
          <TrendCharts />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            The 3-month schedule at a glance
          </h2>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Metric</TableHead>
                  {STAGES.map((s) => (
                    <TableHead key={s.id}>
                      {s.tab} · {s.dates}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARISON_ROWS.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    {STAGES.map((s) => (
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
            <h2 className="text-xl font-semibold tracking-tight">Sample day by stage</h2>
            <p className="text-muted-foreground text-sm">
              Pick a stage to see a realistic 24-hour timeline. Anchor every day to a fixed ~7:00 AM
              wake — the single biggest lever for predictable naps and nights.
            </p>
          </div>
          <StageTabs />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Habits that carry across all 3 months
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {HABITS.map((group) => (
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

        <Alert>
          <InfoIcon />
          <AlertTitle>On diapers (a quick health check)</AlertTitle>
          <AlertDescription>
            His logs show plenty of wet and dirty/mixed diapers (5–14/day) with no dry days — a
            reassuring sign he's getting enough milk. Stool patterns vary; call the pediatrician if
            wet diapers drop below ~5–6/day or he goes notably off his pattern.
          </AlertDescription>
        </Alert>

        <footer className="text-muted-foreground text-xs leading-relaxed">
          Source: Luca's Baby Tracker daily report, Apr 23 – Jun 6, 2026. Weekly figures are
          averages of the daily summaries. Schedule blends his observed rhythm with general
          AAP-aligned infant guidance.
        </footer>
      </div>
    </div>
  )
}
