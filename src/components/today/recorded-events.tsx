import { useState } from "react"
import {
  DropletsIcon,
  EllipsisVerticalIcon,
  MilkIcon,
  MoonIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { PumpIcon } from "@/components/icons/pump-icon"
import { EditLogDrawer } from "@/components/log/edit-log-drawer"
import {
  activitySummary,
  activityTime,
} from "@/components/log/activity-label"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useActivityRefresh } from "@/contexts/activity-refresh-context"
import { deleteActivity } from "@/lib/api/logs"
import { isEditableActivity } from "@/lib/activity-utils"
import type { SleepTimelinePhase } from "@/lib/sleep-timeline"
import type { ActivityItem } from "@/lib/types"
import { cn } from "@/lib/utils"

export const RECORDED_ICONS: Record<ActivityItem["kind"], LucideIcon> = {
  feed: MilkIcon,
  sleep: MoonIcon,
  diaper: DropletsIcon,
  pump: PumpIcon,
}

export const LOG_CARD_LEFT_OFFSET_PX = 24 // matches left-6 on card wrapper
export const LOG_CARD_ESTIMATED_HEIGHT_PX = 46

const EVENT_CARD_MAX_WIDTH = "max-w-[220px]"

export const RECORDED_COLORS: Record<ActivityItem["kind"], string> = {
  feed: "text-sky-400",
  sleep: "text-indigo-400",
  diaper: "text-emerald-400",
  pump: "text-violet-400",
}

export type PlacedActivity = {
  item: ActivityItem
  id: string
  anchorY: number
  labelY: number
  displayAt: string
  sleepPhase?: SleepTimelinePhase
}

type RecordedEventsProps = {
  events: PlacedActivity[]
  loading?: boolean
  now: Date
}

type EventCardProps = {
  event: PlacedActivity
  now: Date
  onEdit: (item: ActivityItem) => void
  onDelete: (item: ActivityItem) => void
}

function EventCard({ event, now, onEdit, onDelete }: EventCardProps) {
  const { item, displayAt, sleepPhase } = event
  const Icon = RECORDED_ICONS[item.kind]
  const editable =
    isEditableActivity(item) && (!sleepPhase || sleepPhase === "start")

  return (
    <div
      className={cn(
        "bg-card flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 shadow-sm",
        EVENT_CARD_MAX_WIDTH,
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-3.5 shrink-0", RECORDED_COLORS[item.kind])}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tabular-nums">
          {activityTime(item, displayAt)}
        </p>
        <p className="text-muted-foreground text-[11px] leading-snug">
          {activitySummary(item, { sleepPhase, now })}
        </p>
      </div>
      {editable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Log options"
              className="text-muted-foreground shrink-0"
            >
              <EllipsisVerticalIcon className="size-4.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36 p-2">
            <DropdownMenuItem
              className="min-h-12 px-3 py-3 text-base font-medium"
              onClick={() => onEdit(item)}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className="min-h-12 px-3 py-3 text-base font-medium"
              onClick={() => onDelete(item)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export function RecordedEvents({ events, loading, now }: RecordedEventsProps) {
  const { notifyActivityChanged } = useActivityRefresh()
  const [editingItem, setEditingItem] = useState<ActivityItem | null>(null)

  async function handleDelete(item: ActivityItem) {
    if (!confirm("Delete this log? This cannot be undone.")) return

    try {
      await deleteActivity(item)
      toast.success("Log deleted")
      notifyActivityChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete log")
    }
  }

  if (loading || events.length === 0) {
    return null
  }

  return (
    <>
      {events.map((event) => (
        <div
          key={event.id}
          className="absolute right-0 left-6 -translate-y-1/2"
          style={{ top: event.labelY }}
        >
          <EventCard
            event={event}
            now={now}
            onEdit={setEditingItem}
            onDelete={handleDelete}
          />
        </div>
      ))}

      <EditLogDrawer
        item={editingItem}
        open={editingItem !== null}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null)
        }}
        onSaved={() => {
          setEditingItem(null)
          notifyActivityChanged()
        }}
      />
    </>
  )
}

export function RecordedEventConnectors({
  events,
  barX,
  connectorX,
}: {
  events: PlacedActivity[]
  barX: number
  connectorX: number
}) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
    >
      {events.map(({ id, anchorY, labelY }) => (
        <g key={id}>
          <circle cx={barX} cy={anchorY} r={3} className="fill-primary" />
          <line
            x1={barX}
            y1={anchorY}
            x2={connectorX}
            y2={labelY}
            className="stroke-muted-foreground/50"
            strokeWidth={1}
          />
        </g>
      ))}
    </svg>
  )
}
