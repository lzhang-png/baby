import { formatCompactDuration } from "@/lib/format"
import i18n from "@/lib/i18n"
import type { ActivityItem, FeedLog } from "@/lib/types"

export const NURSING_SESSION_NOTE_PREFIX = "@nursing_session:"

export type SavedNursingGroup = {
  left: FeedLog | null
  right: FeedLog | null
}

export function parseNursingSessionKey(notes: string | null): string | null {
  if (!notes) return null

  for (const line of notes.split("\n")) {
    if (line.startsWith(NURSING_SESSION_NOTE_PREFIX)) {
      return line.slice(NURSING_SESSION_NOTE_PREFIX.length)
    }
  }

  return null
}

export function mergeNursingSessionNote(
  existing: string | null | undefined,
  sessionKey: string,
): string {
  const line = `${NURSING_SESSION_NOTE_PREFIX}${sessionKey}`
  const withoutOld = (existing ?? "")
    .split("\n")
    .filter((entry) => !entry.startsWith(NURSING_SESSION_NOTE_PREFIX))
    .join("\n")
    .trim()

  return withoutOld ? `${withoutOld}\n${line}` : line
}

function getFeedEndMs(feed: FeedLog): number {
  return (
    new Date(feed.occurred_at).getTime() + (feed.duration_min ?? 0) * 60_000
  )
}

export function getSessionTimelineAt(
  left: FeedLog | null,
  right: FeedLog | null,
): string {
  const startTimes = [left, right]
    .filter((feed): feed is FeedLog => feed != null)
    .map((feed) => new Date(feed.occurred_at).getTime())

  if (startTimes.length === 0) return new Date().toISOString()
  return new Date(Math.min(...startTimes)).toISOString()
}

export function savedNursingSessionSummary(group: SavedNursingGroup): string {
  const parts = [i18n.t("log.nursing")]

  if (group.left?.duration_min) {
    parts.push(`L ${formatCompactDuration(group.left.duration_min)}`)
  }
  if (group.right?.duration_min) {
    parts.push(`R ${formatCompactDuration(group.right.duration_min)}`)
  }

  return parts.join(" · ")
}

function isCompletedSideNursingFeedLog(feed: FeedLog): boolean {
  return (
    feed.feed_type === "nursing" &&
    feed.duration_min != null &&
    (feed.side === "L" || feed.side === "R")
  )
}

function isCompletedSideNursingFeed(item: ActivityItem): item is ActivityItem & {
  kind: "feed"
  data: FeedLog
} {
  return item.kind === "feed" && isCompletedSideNursingFeedLog(item.data)
}

/** Group saved L/R nursing logs into sessions (tagged or legacy-paired). */
export function groupCompletedNursingFeeds(feeds: FeedLog[]): {
  groups: SavedNursingGroup[]
  singles: FeedLog[]
} {
  const nursingFeeds = feeds.filter(isCompletedSideNursingFeedLog)
  if (nursingFeeds.length === 0) {
    return { groups: [], singles: [] }
  }

  const bySession = new Map<string, SavedNursingGroup>()
  const ungrouped: FeedLog[] = []

  for (const feed of nursingFeeds) {
    const sessionKey = parseNursingSessionKey(feed.notes)

    if (sessionKey) {
      const bucket = bySession.get(sessionKey) ?? { left: null, right: null }
      if (feed.side === "L") bucket.left = feed
      if (feed.side === "R") bucket.right = feed
      bySession.set(sessionKey, bucket)
      continue
    }

    ungrouped.push(feed)
  }

  const groups: SavedNursingGroup[] = []
  const consumedIds = new Set<string>()

  for (const [, group] of bySession) {
    if (!group.left && !group.right) continue
    if (group.left) consumedIds.add(group.left.id)
    if (group.right) consumedIds.add(group.right.id)
    groups.push(group)
  }

  for (const group of pairLegacyNursingFeeds(ungrouped)) {
    if (group.left) consumedIds.add(group.left.id)
    if (group.right) consumedIds.add(group.right.id)
    groups.push(group)
  }

  const singles = ungrouped.filter((feed) => !consumedIds.has(feed.id))

  return { groups, singles }
}

export function getNursingSessionDurationMin(group: SavedNursingGroup): number {
  return (group.left?.duration_min ?? 0) + (group.right?.duration_min ?? 0)
}

function pairLegacyNursingFeeds(feeds: FeedLog[]): SavedNursingGroup[] {
  const lefts = feeds
    .filter((feed) => feed.side === "L")
    .sort(
      (a, b) =>
        new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
    )
  const rights = feeds
    .filter((feed) => feed.side === "R")
    .sort(
      (a, b) =>
        new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
    )

  const usedRightIds = new Set<string>()
  const groups: SavedNursingGroup[] = []

  for (const left of lefts) {
    let bestRight: FeedLog | null = null
    let bestDelta = Infinity

    for (const right of rights) {
      if (usedRightIds.has(right.id)) continue

      const delta = Math.abs(getFeedEndMs(left) - getFeedEndMs(right))
      if (delta < bestDelta && delta <= 30 * 60_000) {
        bestDelta = delta
        bestRight = right
      }
    }

    if (bestRight) {
      usedRightIds.add(bestRight.id)
      groups.push({ left, right: bestRight })
    }
  }

  return groups
}

/** Collapse saved L/R nursing feeds into one activity per session for the timeline. */
export function collapseSavedNursingSessions(activities: ActivityItem[]): {
  activities: ActivityItem[]
  nursingGroups: Map<string, SavedNursingGroup>
} {
  const nursingGroups = new Map<string, SavedNursingGroup>()
  const nursingFeeds = activities.filter(isCompletedSideNursingFeed)
  const nursingFeedIds = new Set(nursingFeeds.map((item) => item.data.id))

  if (nursingFeeds.length === 0) {
    return { activities, nursingGroups }
  }

  const otherActivities = activities.filter(
    (item) => !(item.kind === "feed" && nursingFeedIds.has(item.data.id)),
  )

  const { groups, singles } = groupCompletedNursingFeeds(
    nursingFeeds.map((item) => item.data),
  )
  const collapsedNursing: ActivityItem[] = []

  for (const group of groups) {
    const representative = group.left ?? group.right!
    nursingGroups.set(representative.id, group)
    collapsedNursing.push({
      kind: "feed",
      at: getSessionTimelineAt(group.left, group.right),
      data: representative,
    })
  }

  for (const feed of singles) {
    collapsedNursing.push({
      kind: "feed",
      at: feed.occurred_at,
      data: feed,
    })
  }

  return {
    activities: [...otherActivities, ...collapsedNursing].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    ),
    nursingGroups,
  }
}
