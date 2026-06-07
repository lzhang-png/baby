import { useCallback, useEffect, useState } from "react"
import { RefreshCwIcon } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { getTodayActivities } from "@/lib/api/logs"
import type { ActivityItem } from "@/lib/types"
import {
  activitySummary,
  activityTime,
} from "@/components/log/activity-label"
import { Button } from "@/components/ui/button"
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

const KIND_LABELS: Record<ActivityItem["kind"], string> = {
  feed: "Feed",
  sleep: "Sleep",
  diaper: "Diaper",
  pump: "Pump",
}

export function TodayPage() {
  const { baby } = useAuth()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!baby) return
    setLoading(true)
    try {
      const data = await getTodayActivities(baby.id)
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [baby])

  useEffect(() => {
    load()
  }, [load])

  const counts = {
    feeds: items.filter((i) => i.kind === "feed").length,
    sleep: items.filter((i) => i.kind === "sleep").length,
    diapers: items.filter((i) => i.kind === "diaper").length,
    pumps: items.filter((i) => i.kind === "pump").length,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-muted-foreground text-sm">
            {baby?.name ?? "Luca"}'s activity since midnight.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCwIcon data-icon="inline-start" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ["Feeds", counts.feeds],
            ["Sleep", counts.sleep],
            ["Diapers", counts.diapers],
            ["Pumps", counts.pumps],
          ] as const
        ).map(([label, count]) => (
          <Card key={label}>
            <CardContent className="flex flex-col gap-1 pt-6">
              <span className="text-2xl font-semibold">{count}</span>
              <span className="text-muted-foreground text-xs">{label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing logged yet today. Head to Log to add an entry.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Time</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={`${item.kind}-${item.data.id}`}>
                    <TableCell className="font-medium">
                      {activityTime(item)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {KIND_LABELS[item.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {activitySummary(item)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
