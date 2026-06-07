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
import { STAGES, type ActivityKind, type Stage } from "@/lib/schedule-data"

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
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">A day in this stage</CardTitle>
            <Badge variant="secondary">sample 24 h</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-24">Time</TableHead>
                <TableHead>Activity</TableHead>
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
          <StatTile value={stage.feedsPerDay} label="Feeds / day" />
          <StatTile value={stage.perFeed.split(" ")[0]} label="ml per feed" />
          <StatTile
            value={stage.nightStretch.split(" ")[0]}
            label="Night stretch (h)"
          />
          <StatTile value={stage.bedtime.split("–")[0]} label="Bedtime (from)" />
        </div>
        <div className="bg-muted/50 flex flex-col gap-1.5 rounded-lg p-4">
          <span className="text-sm font-semibold">Focus this stage</span>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {stage.focus}
          </p>
        </div>
      </div>
    </div>
  )
}

export function StageTabs() {
  return (
    <Tabs defaultValue={STAGES[0].id} className="gap-4">
      <TabsList className="h-auto flex-wrap">
        {STAGES.map((s) => (
          <TabsTrigger key={s.id} value={s.id} className="flex-col items-start gap-0.5 py-1.5">
            <span className="font-medium">{s.tab}</span>
            <span className="text-muted-foreground text-xs">{s.dates}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {STAGES.map((s) => (
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
