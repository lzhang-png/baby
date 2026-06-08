import { useEffect, useState } from "react"
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
  ongoingTimelineLabel,
  type OngoingTimelineCard,
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
export const CONNECTOR_TRUNK_OFFSET_PX = 16
export const TIMELINE_MUTED_LINE_CLASS = "bg-[var(--muted)]"
export const TIMELINE_CONNECTOR_STROKE_CLASS = "stroke-[var(--muted)]"
export const CONNECTOR_CORNER_RADIUS_PX = 6
export const LOG_CARD_ESTIMATED_HEIGHT_PX = 46

function buildRoundedConnectorPath(
  barX: number,
  anchorY: number,
  trunkX: number,
  labelY: number,
  cardLeftX: number,
  radius = CONNECTOR_CORNER_RADIUS_PX,
) {
  const horizontalLeg = trunkX - barX
  const verticalLeg = labelY - anchorY
  const finalLeg = cardLeftX - trunkX
  const cornerRadius = Math.min(
    radius,
    horizontalLeg / 2,
    Math.abs(verticalLeg) / 2,
    finalLeg / 2,
  )

  if (cornerRadius < 0.5) {
    return `M ${barX} ${anchorY} H ${trunkX} V ${labelY} H ${cardLeftX}`
  }

  const down = verticalLeg >= 0
  const verticalAfterFirstCorner = down
    ? anchorY + cornerRadius
    : anchorY - cornerRadius
  const verticalBeforeSecondCorner = down
    ? labelY - cornerRadius
    : labelY + cornerRadius

  return [
    `M ${barX} ${anchorY}`,
    `H ${trunkX - cornerRadius}`,
    `Q ${trunkX} ${anchorY} ${trunkX} ${verticalAfterFirstCorner}`,
    `V ${verticalBeforeSecondCorner}`,
    `Q ${trunkX} ${labelY} ${trunkX + cornerRadius} ${labelY}`,
    `H ${cardLeftX}`,
  ].join(" ")
}

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
    isEditableActivity(item) &&
    (!sleepPhase ||
      sleepPhase === "end" ||
      (sleepPhase === "start" &&
        item.kind === "sleep" &&
        !item.data.ended_at))

  return (
    <div
      className={cn(
        "bg-card flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 shadow-sm",
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
        <p className="text-muted-foreground text-xs leading-snug">
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

type OngoingNowCardsProps = {
  cards: OngoingTimelineCard[]
  labelYs: number[]
  now: Date
}

export function OngoingNowCards({ cards, labelYs, now }: OngoingNowCardsProps) {
  const [liveNow, setLiveNow] = useState(now)

  useEffect(() => {
    setLiveNow(now)
  }, [now])

  useEffect(() => {
    if (cards.length === 0) return
    const id = window.setInterval(() => setLiveNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [cards.length])

  if (cards.length === 0) return null

  return (
    <>
      {cards.map((card, index) => {
        const Icon = RECORDED_ICONS[card.item.kind]
        return (
          <div
            key={card.id}
            className="absolute right-0 left-6 z-[25] -translate-y-1/2"
            style={{ top: labelYs[index] }}
          >
            <div
              className={cn(
                "ongoing-card-pulse flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 shadow-sm",
                EVENT_CARD_MAX_WIDTH,
              )}
            >
              <Icon
                aria-hidden
                className={cn(
                  "size-3.5 shrink-0",
                  RECORDED_COLORS[card.item.kind],
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug text-white">
                  {ongoingTimelineLabel(card.item, liveNow)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}

export type OngoingConnector = {
  id: string
  labelY: number
}

export function RecordedEventConnectors({
  events,
  ongoingConnectors = [],
  nowAnchorY = null,
  barX,
  trunkX,
  cardLeftX,
}: {
  events: PlacedActivity[]
  ongoingConnectors?: OngoingConnector[]
  nowAnchorY?: number | null
  barX: number
  trunkX: number
  cardLeftX: number
}) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
    >
      {events.map(({ id, anchorY, labelY }) => (
        <path
          key={`${id}-line`}
          d={buildRoundedConnectorPath(
            barX,
            anchorY,
            trunkX,
            labelY,
            cardLeftX,
          )}
          fill="none"
          className={TIMELINE_CONNECTOR_STROKE_CLASS}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
        />
      ))}
      {nowAnchorY != null &&
        ongoingConnectors.map(({ id, labelY }) => (
          <path
            key={`${id}-ongoing-line`}
            d={buildRoundedConnectorPath(
              barX,
              nowAnchorY,
              trunkX,
              labelY,
              cardLeftX,
            )}
            fill="none"
            className={TIMELINE_CONNECTOR_STROKE_CLASS}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
          />
        ))}
      {events.map(({ id, anchorY }) => (
        <circle
          key={`${id}-dot`}
          cx={barX}
          cy={anchorY}
          r={3}
          className="fill-primary stroke-black"
          strokeWidth={1}
        />
      ))}
    </svg>
  )
}
