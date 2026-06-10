import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  BlendIcon,
  ChevronRightIcon,
  DropletsIcon,
  DropletOffIcon,
  EllipsisVerticalIcon,
  MilkIcon,
  MoonIcon,
  SunIcon,
  ToiletIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { PumpIcon } from "@/components/icons/pump-icon"
import { DiaperIcon } from "@/components/icons/diaper-icon"
import { MotherIcon } from "@/components/icons/mother-icon"
import { BabyBottleIcon } from "@/components/icons/baby-bottle-icon"
import { EditLogDrawer } from "@/components/log/edit-log-drawer"
import {
  activitySummary,
  activityTime,
  getOngoingElapsedSec,
  ongoingTimelineTitle,
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
import { useLogPanel } from "@/contexts/log-panel-context"
import type { LogPanelType } from "@/components/log/log-panel"
import { formatElapsedClock } from "@/lib/format"
import {
  getNursingSideStateForFeed,
  type NursingSideKey,
  type SideNursingState,
} from "@/lib/nursing-timer-session"
import { deleteActivity } from "@/lib/api/logs"
import { isEditableActivity } from "@/lib/activity-utils"
import type { SleepTimelinePhase } from "@/lib/sleep-timeline"
import type { ActivityItem, DiaperType } from "@/lib/types"
import { cn } from "@/lib/utils"

export const RECORDED_ICONS: Record<ActivityItem["kind"], LucideIcon> = {
  feed: MilkIcon,
  sleep: MoonIcon,
  diaper: DiaperIcon,
  pump: PumpIcon,
}

const DIAPER_TYPE_ICONS: Record<DiaperType, LucideIcon> = {
  wet: DropletsIcon,
  dirty: ToiletIcon,
  mixed: BlendIcon,
  dry: DropletOffIcon,
}

export function getRecordedIcon(
  item: ActivityItem,
  sleepPhase?: SleepTimelinePhase,
): LucideIcon {
  if (item.kind === "sleep" && sleepPhase === "end") return SunIcon
  if (item.kind === "diaper") return DIAPER_TYPE_ICONS[item.data.diaper_type]
  if (item.kind === "feed" && item.data.feed_type === "nursing")
    return MotherIcon
  if (item.kind === "feed" && item.data.feed_type === "expressed")
    return BabyBottleIcon
  return RECORDED_ICONS[item.kind]
}

export const LOG_CARD_LEFT_OFFSET_PX = 24 // matches left-6 on card wrapper
export const CONNECTOR_TRUNK_OFFSET_PX = 16
export const TIMELINE_MUTED_LINE_CLASS = "bg-timeline-line"
export const TIMELINE_CONNECTOR_STROKE_CLASS = "stroke-timeline-line"
export const CONNECTOR_CORNER_RADIUS_PX = 6
export const LOG_CARD_ESTIMATED_HEIGHT_PX = 56 // xs time + sm detail + p-2

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

const EVENT_CARD_MAX_WIDTH = "max-w-[280px]"

export const RECORDED_COLORS: Record<ActivityItem["kind"], string> = {
  feed: "text-sky-400",
  sleep: "text-indigo-400",
  diaper: "text-amber-700",
  pump: "text-violet-400",
}

const SLEEP_END_COLOR = "text-amber-400"

function getRecordedIconColor(
  item: ActivityItem,
  sleepPhase?: SleepTimelinePhase,
) {
  if (item.kind === "sleep" && sleepPhase === "end") {
    return SLEEP_END_COLOR
  }
  return RECORDED_COLORS[item.kind]
}

export type PlacedActivity = {
  item: ActivityItem
  id: string
  anchorY: number
  labelY: number
  displayAt: string
  sleepPhase?: SleepTimelinePhase
}

export type CardHeightChangeHandler = (id: string, heightPx: number) => void

/** Reports the element's rendered height so card spacing can use real sizes. */
function useCardHeightReport(
  id: string,
  onHeightChange?: CardHeightChangeHandler,
) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !onHeightChange) return

    const observer = new ResizeObserver(() => {
      onHeightChange(id, el.offsetHeight)
    })
    observer.observe(el)

    return () => observer.disconnect()
  }, [id, onHeightChange])

  return ref
}

type RecordedEventsProps = {
  events: PlacedActivity[]
  loading?: boolean
  now: Date
  onCardHeightChange?: CardHeightChangeHandler
}

type EventCardProps = {
  event: PlacedActivity
  now: Date
  onEdit: (item: ActivityItem) => void
  onDelete: (item: ActivityItem) => void
  onHeightChange?: CardHeightChangeHandler
}

function EventCard({ event, now, onEdit, onDelete, onHeightChange }: EventCardProps) {
  const { t } = useTranslation()
  const { item, displayAt, sleepPhase } = event
  const cardRef = useCardHeightReport(event.id, onHeightChange)
  const Icon = getRecordedIcon(item, sleepPhase)
  const editable =
    isEditableActivity(item) &&
    (!sleepPhase ||
      sleepPhase === "end" ||
      (sleepPhase === "start" &&
        item.kind === "sleep" &&
        !item.data.ended_at))

  return (
    <div
      ref={cardRef}
      className={cn(
        "bg-card flex w-full items-start gap-2 rounded-lg p-2 shadow-sm",
        EVENT_CARD_MAX_WIDTH,
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          getRecordedIconColor(item, sleepPhase),
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium tabular-nums">
          {activityTime(item, displayAt)}
        </p>
        <p className="text-sm leading-snug">
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
              aria-label={t("log.logOptions")}
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
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className="min-h-12 px-3 py-3 text-base font-medium"
              onClick={() => onDelete(item)}
            >
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export function RecordedEvents({
  events,
  loading,
  now,
  onCardHeightChange,
}: RecordedEventsProps) {
  const { t } = useTranslation()
  const { notifyActivityChanged } = useActivityRefresh()
  const [editingItem, setEditingItem] = useState<ActivityItem | null>(null)

  async function handleDelete(item: ActivityItem) {
    if (!confirm(t("log.deleteConfirm"))) return

    try {
      await deleteActivity(item)
      toast.success(t("log.logDeleted"))
      notifyActivityChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("log.logDeleteFailed"))
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
            onHeightChange={onCardHeightChange}
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
  nursingSides?: Record<NursingSideKey, SideNursingState> | null
  onCardHeightChange?: CardHeightChangeHandler
}

function logPanelTypeForOngoingItem(item: ActivityItem): LogPanelType | null {
  if (item.kind === "sleep") return "sleep"
  if (item.kind === "feed") return "feed"
  return null
}

function OngoingNowCard({
  card,
  labelY,
  liveNow,
  nursingSides,
  onHeightChange,
}: {
  card: OngoingTimelineCard
  labelY: number
  liveNow: Date
  nursingSides?: Record<NursingSideKey, SideNursingState> | null
  onHeightChange?: CardHeightChangeHandler
}) {
  const { t } = useTranslation()
  const logPanel = useLogPanel()
  const cardRef = useCardHeightReport(card.id, onHeightChange)
  const Icon = getRecordedIcon(card.item)
  const panelType = logPanelTypeForOngoingItem(card.item)
  const elapsedSec = getOngoingElapsedSec(card.item, liveNow, nursingSides)
  const nursingState =
    card.item.kind === "feed" &&
    (card.item.data.side === "L" || card.item.data.side === "R")
      ? getNursingSideStateForFeed(
          nursingSides,
          card.item.data.id,
          card.item.data.side,
        )
      : null
  const isPulsing =
    card.item.kind === "sleep" ||
    (card.item.kind === "feed" && nursingState?.status !== "paused")

  function handleOpenLogPanel() {
    if (!logPanel || !panelType) return
    logPanel.openLogPanel(panelType)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    handleOpenLogPanel()
  }

  return (
    <div
      className="absolute right-0 left-6 z-[25] -translate-y-1/2"
      style={{ top: labelY }}
    >
      <div
        ref={cardRef}
        role="button"
        tabIndex={logPanel && panelType ? 0 : undefined}
        aria-label={t("log.openOngoingLog")}
        onClick={handleOpenLogPanel}
        onKeyDown={handleKeyDown}
        className={cn(
          "bg-card flex w-full items-center gap-2 rounded-lg p-2 shadow-sm",
          isPulsing && "ongoing-card-pulse",
          logPanel &&
            panelType &&
            "cursor-pointer transition-opacity hover:opacity-90",
          EVENT_CARD_MAX_WIDTH,
        )}
      >
        <Icon
          aria-hidden
          className={cn("size-3.5 shrink-0", RECORDED_COLORS[card.item.kind])}
        />
        <div className="min-w-0 flex-1">
          <p className="text-card-foreground text-sm leading-snug">
            {ongoingTimelineTitle(card.item)}
          </p>
          <p className="text-sm leading-snug tabular-nums">
            {formatElapsedClock(elapsedSec)}
          </p>
        </div>
        {logPanel && panelType && (
          <span className="text-muted-foreground flex size-8 shrink-0 items-center justify-center">
            <ChevronRightIcon className="size-4.5" aria-hidden />
          </span>
        )}
      </div>
    </div>
  )
}

export function OngoingNowCards({
  cards,
  labelYs,
  now,
  nursingSides,
  onCardHeightChange,
}: OngoingNowCardsProps) {
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
      {cards.map((card, index) => (
        <OngoingNowCard
          key={card.id}
          card={card}
          labelY={labelYs[index]}
          liveNow={liveNow}
          nursingSides={nursingSides}
          onHeightChange={onCardHeightChange}
        />
      ))}
    </>
  )
}

export type OngoingConnector = {
  id: string
  labelY: number
  anchorY: number
}

function ConnectorLinePath({
  pathD,
  showShadow,
}: {
  pathD: string
  showShadow?: boolean
}) {
  return (
    <g>
      {showShadow && (
        <path
          d={pathD}
          fill="none"
          className="timeline-connector-shadow-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          transform="translate(0, -1.5)"
        />
      )}
      <path
        d={pathD}
        fill="none"
        className={TIMELINE_CONNECTOR_STROKE_CLASS}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
      />
    </g>
  )
}

export function RecordedEventConnectors({
  events,
  ongoingConnectors = [],
  barX,
  trunkX,
  cardLeftX,
  className,
}: {
  events: PlacedActivity[]
  ongoingConnectors?: OngoingConnector[]
  barX: number
  trunkX: number
  cardLeftX: number
  className?: string
}) {
  const hasOngoingConnectors = ongoingConnectors.length > 0

  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible",
        className,
      )}
    >
      {events.map(({ id, anchorY, labelY }, index) => {
        const pathD = buildRoundedConnectorPath(
          barX,
          anchorY,
          trunkX,
          labelY,
          cardLeftX,
        )
        const isBelowAnotherLine =
          index < events.length - 1 || hasOngoingConnectors

        return (
          <ConnectorLinePath
            key={`${id}-line`}
            pathD={pathD}
            showShadow={isBelowAnotherLine}
          />
        )
      })}
      {ongoingConnectors.map(({ id, labelY, anchorY }, index) => {
        const pathD = buildRoundedConnectorPath(
          barX,
          anchorY,
          trunkX,
          labelY,
          cardLeftX,
        )
        const isBelowAnotherLine = index < ongoingConnectors.length - 1

        return (
          <ConnectorLinePath
            key={`${id}-ongoing-line`}
            pathD={pathD}
            showShadow={isBelowAnotherLine}
          />
        )
      })}
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
      {ongoingConnectors.map(({ id, anchorY }) => (
        <circle
          key={`${id}-ongoing-dot`}
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
