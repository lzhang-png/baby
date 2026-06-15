import i18n from "@/lib/i18n"
import {
  formatCompactDuration,
  formatDuration,
  formatElapsedClock,
  formatTime,
  isSameDay,
} from "@/lib/format"
import {
  getNursingSideStateForFeed,
  getSideElapsedSec,
  type NursingSideKey,
  type SideNursingState,
} from "@/lib/nursing-timer-session"
import type { ActivityItem, FeedLog, SleepLog } from "@/lib/types"
import { getPumpSideAmounts } from "@/lib/pump-side-amounts"
import {
  type SavedNursingGroup,
  savedNursingSessionSummary,
} from "@/lib/nursing-timeline"
import {
  getSleepDurationMinutes,
  type SleepTimelinePhase,
} from "@/lib/sleep-timeline"

export function feedTypeLabel(type: string) {
  const key = `log.${type}` as const
  const translated = i18n.t(key)
  return translated === key ? type : translated
}

export function diaperTypeLabel(type: string) {
  const key = `log.${type}` as const
  const translated = i18n.t(key)
  return translated === key ? type : translated
}

type ActivityLabelOptions = {
  sleepPhase?: SleepTimelinePhase
  now?: Date
  nursingGroup?: SavedNursingGroup
}

export function activitySummary(
  item: ActivityItem,
  options?: ActivityLabelOptions,
): string {
  switch (item.kind) {
    case "feed": {
      const f = item.data
      if (f.feed_type === "nursing" && options?.nursingGroup) {
        return savedNursingSessionSummary(options.nursingGroup)
      }
      const parts = [feedTypeLabel(f.feed_type)]
      if (f.amount_ml) parts.push(`${f.amount_ml} ml`)
      if (f.duration_min) parts.push(`${f.duration_min} ${i18n.t("activity.min")}`)
      if (f.side) parts.push(f.side)
      return parts.join(" · ")
    }
    case "sleep": {
      const s = item.data
      const now = options?.now ?? new Date()
      const duration = formatCompactDuration(getSleepDurationMinutes(s, now))
      const phase = options?.sleepPhase

      if (phase === "start") {
        return i18n.t("activity.sleepStarted")
      }
      if (phase === "end") {
        return s.ended_at
          ? i18n.t("activity.sleepEnded", { duration })
          : i18n.t("activity.stillSleeping", { duration })
      }

      if (!s.ended_at) {
        return `${i18n.t("activity.sleeping")} · ${duration}`
      }
      return i18n.t("activity.slept", {
        duration: formatDuration(s.duration_min),
      })
    }
    case "diaper":
      return `${i18n.t("activity.diaper")} · ${diaperTypeLabel(item.data.diaper_type)}`
    case "pump": {
      const p = item.data
      const parts = [i18n.t("activity.pumping")]
      const { leftMl, rightMl } = getPumpSideAmounts(p)
      if (leftMl) parts.push(`L ${leftMl} ml`)
      if (rightMl) parts.push(`R ${rightMl} ml`)
      if (!leftMl && !rightMl && p.amount_ml) {
        parts.push(`${p.amount_ml} ml`)
      }
      if (p.duration_left_min || p.duration_right_min) {
        parts.push(`L${p.duration_left_min ?? 0}m R${p.duration_right_min ?? 0}m`)
      }
      return parts.join(" · ")
    }
  }
}

export function activityTime(item: ActivityItem, displayAt?: string): string {
  return formatTime(displayAt ?? item.at)
}

export function getNursingDurationMinutes(feed: FeedLog, now: Date): number {
  if (feed.duration_min != null) return feed.duration_min
  const startMs = new Date(feed.occurred_at).getTime()
  return Math.max(0, Math.round((now.getTime() - startMs) / 60_000))
}

export function ongoingSleepLabel(sleep: SleepLog, now: Date): string {
  return i18n.t("activity.sleptFor", {
    duration: formatCompactDuration(getSleepDurationMinutes(sleep, now)),
  })
}

export function ongoingNursingLabel(feed: FeedLog, now: Date): string {
  const duration = formatCompactDuration(getNursingDurationMinutes(feed, now))
  if (feed.side === "L") {
    return i18n.t("activity.nursedOnLeft", { duration })
  }
  if (feed.side === "R") {
    return i18n.t("activity.nursedOnRight", { duration })
  }
  return i18n.t("activity.nursedOnBoth", { duration })
}

export type OngoingTimelineCard = {
  id: string
  item: ActivityItem
  nursingGroup?: SavedNursingGroup
}

function getOngoingFeedElapsedSec(
  feed: FeedLog,
  nursingSides?: Record<NursingSideKey, SideNursingState> | null,
  now = new Date(),
): number {
  if (feed.side === "L" || feed.side === "R") {
    const state = getNursingSideStateForFeed(nursingSides, feed.id, feed.side)
    if (state) return getSideElapsedSec(state)
  }
  const startMs = new Date(feed.occurred_at).getTime()
  return Math.max(0, Math.floor((now.getTime() - startMs) / 1000))
}

export function ongoingNursingGroupElapsedLabel(
  group: SavedNursingGroup,
  nursingSides?: Record<NursingSideKey, SideNursingState> | null,
  now = new Date(),
): string {
  const parts: string[] = []

  if (group.left) {
    parts.push(
      `L ${formatElapsedClock(getOngoingFeedElapsedSec(group.left, nursingSides, now))}`,
    )
  }
  if (group.right) {
    parts.push(
      `R ${formatElapsedClock(getOngoingFeedElapsedSec(group.right, nursingSides, now))}`,
    )
  }

  return parts.join(" · ")
}

export function isOngoingNursingGroupPaused(
  group: SavedNursingGroup,
  nursingSides?: Record<NursingSideKey, SideNursingState> | null,
): boolean {
  const sides = [group.left, group.right].filter(
    (feed): feed is FeedLog => feed != null,
  )
  if (sides.length === 0) return false

  return sides.every((feed) => {
    if (feed.side !== "L" && feed.side !== "R") return false
    const state = getNursingSideStateForFeed(nursingSides, feed.id, feed.side)
    return state?.status === "paused"
  })
}

export function isOngoingNursingGroupPulsing(
  group: SavedNursingGroup,
  nursingSides?: Record<NursingSideKey, SideNursingState> | null,
): boolean {
  return !isOngoingNursingGroupPaused(group, nursingSides)
}

export function isOngoingNursingFeed(
  item: ActivityItem,
): item is Extract<ActivityItem, { kind: "feed" }> {
  if (item.kind !== "feed") return false
  const feed = item.data
  return (
    feed.feed_type === "nursing" &&
    feed.duration_min == null &&
    (feed.side === "L" || feed.side === "R")
  )
}

export function getOngoingTimelineCards(
  activities: ActivityItem[],
  date: Date,
  now: Date,
): OngoingTimelineCard[] {
  if (!isSameDay(date, now)) return []

  const cards: OngoingTimelineCard[] = []
  const ongoingNursing: Extract<ActivityItem, { kind: "feed" }>[] = []

  for (const item of activities) {
    if (item.kind === "sleep") {
      const sleep = item.data
      if (!sleep.ended_at) {
        cards.push({ id: `ongoing-sleep-${sleep.id}`, item })
      }
      continue
    }

    if (isOngoingNursingFeed(item)) {
      ongoingNursing.push(item)
    }
  }

  const left = ongoingNursing.find((item) => item.data.side === "L")
  const right = ongoingNursing.find((item) => item.data.side === "R")

  if (left && right) {
    cards.push({
      id: `ongoing-nursing-${left.data.id}-${right.data.id}`,
      item: left,
      nursingGroup: { left: left.data, right: right.data },
    })
  } else {
    for (const item of ongoingNursing) {
      cards.push({ id: `ongoing-nursing-${item.data.id}`, item })
    }
  }

  return cards.sort((a, b) => {
    const rank = (card: OngoingTimelineCard) => {
      if (card.item.kind === "sleep") return 0
      if (card.nursingGroup || card.item.kind === "feed") return 1
      return 2
    }
    return rank(a) - rank(b)
  })
}

export function ongoingTimelineLabel(item: ActivityItem, now: Date): string {
  if (item.kind === "sleep") return ongoingSleepLabel(item.data, now)
  if (item.kind === "feed") return ongoingNursingLabel(item.data, now)
  return ""
}

export function ongoingTimelineTitle(
  item: ActivityItem,
  nursingGroup?: SavedNursingGroup,
): string {
  if (item.kind === "sleep") return i18n.t("activity.sleeping")
  if (item.kind === "feed") {
    if (nursingGroup) return i18n.t("log.nursing")
    const feed = item.data
    if (feed.side === "L") return i18n.t("activity.nursingOnLeft")
    if (feed.side === "R") return i18n.t("activity.nursingOnRight")
    return i18n.t("log.nursing")
  }
  return ""
}

export function getOngoingElapsedSec(
  item: ActivityItem,
  now: Date,
  nursingSides?: Record<NursingSideKey, SideNursingState> | null,
  nursingGroup?: SavedNursingGroup,
): number {
  if (item.kind === "sleep") {
    const startMs = new Date(item.data.started_at).getTime()
    return Math.max(0, Math.floor((now.getTime() - startMs) / 1000))
  }

  if (item.kind === "feed") {
    if (nursingGroup) {
      const elapsed = [
        nursingGroup.left
          ? getOngoingFeedElapsedSec(nursingGroup.left, nursingSides, now)
          : 0,
        nursingGroup.right
          ? getOngoingFeedElapsedSec(nursingGroup.right, nursingSides, now)
          : 0,
      ]
      return Math.max(...elapsed, 0)
    }

    return getOngoingFeedElapsedSec(item.data, nursingSides, now)
  }

  return 0
}

/** When paused, freeze the timeline connector at the pause moment. */
export function getOngoingConnectorAnchorAt(
  item: ActivityItem,
  nursingSides?: Record<NursingSideKey, SideNursingState> | null,
  nursingGroup?: SavedNursingGroup,
): Date | null {
  if (nursingGroup) {
    if (isOngoingNursingGroupPulsing(nursingGroup, nursingSides)) return null

    const pausedAtMs = [nursingGroup.left, nursingGroup.right]
      .filter((feed): feed is FeedLog => feed != null)
      .flatMap((feed) => {
        if (feed.side !== "L" && feed.side !== "R") return []
        const state = getNursingSideStateForFeed(nursingSides, feed.id, feed.side)
        return state?.status === "paused" && state.pausedAtMs
          ? [state.pausedAtMs]
          : []
      })

    if (pausedAtMs.length === 0) return null
    return new Date(Math.max(...pausedAtMs))
  }

  if (item.kind !== "feed") return null

  const feed = item.data
  if (feed.side !== "L" && feed.side !== "R") return null

  const state = getNursingSideStateForFeed(nursingSides, feed.id, feed.side)
  if (state?.status === "paused" && state.pausedAtMs) {
    return new Date(state.pausedAtMs)
  }

  return null
}
