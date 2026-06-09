import { endOfDay, startOfDay } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import type {
  ActivityItem,
  DiaperLog,
  DiaperType,
  FeedLog,
  FeedType,
  NursingSide,
  PumpLog,
  SleepLog,
} from "@/lib/types"

export async function insertFeed(input: {
  babyId: string
  userId: string
  occurredAt: string
  feedType: FeedType
  amountMl?: number
  durationMin?: number
  side?: NursingSide
  notes?: string
}) {
  const { data, error } = await supabase
    .from("feed_logs")
    .insert({
      baby_id: input.babyId,
      logged_by: input.userId,
      occurred_at: input.occurredAt,
      feed_type: input.feedType,
      amount_ml: input.amountMl ?? null,
      duration_min: input.durationMin ?? null,
      side: input.side ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as FeedLog
}

export async function insertSleep(input: {
  babyId: string
  userId: string
  startedAt: string
  endedAt?: string
  durationMin?: number
  notes?: string
}) {
  const { data, error } = await supabase
    .from("sleep_logs")
    .insert({
      baby_id: input.babyId,
      logged_by: input.userId,
      started_at: input.startedAt,
      ended_at: input.endedAt ?? null,
      duration_min: input.durationMin ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as SleepLog
}

export async function endSleep(sleepId: string, endedAt: string) {
  const started = await supabase
    .from("sleep_logs")
    .select("started_at")
    .eq("id", sleepId)
    .single()

  if (started.error) throw started.error

  const startMs = new Date(started.data.started_at).getTime()
  const endMs = new Date(endedAt).getTime()
  const durationMin = Math.max(1, Math.round((endMs - startMs) / 60000))

  const { data, error } = await supabase
    .from("sleep_logs")
    .update({ ended_at: endedAt, duration_min: durationMin })
    .eq("id", sleepId)
    .select()
    .single()

  if (error) throw error
  return data as SleepLog
}

export async function insertDiaper(input: {
  babyId: string
  userId: string
  occurredAt: string
  diaperType: DiaperType
  notes?: string
}) {
  const { data, error } = await supabase
    .from("diaper_logs")
    .insert({
      baby_id: input.babyId,
      logged_by: input.userId,
      occurred_at: input.occurredAt,
      diaper_type: input.diaperType,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as DiaperLog
}

export async function insertPump(input: {
  babyId: string
  userId: string
  occurredAt: string
  amountMl?: number
  durationLeftMin?: number
  durationRightMin?: number
  notes?: string
}) {
  const { data, error } = await supabase
    .from("pump_logs")
    .insert({
      baby_id: input.babyId,
      logged_by: input.userId,
      occurred_at: input.occurredAt,
      amount_ml: input.amountMl ?? null,
      duration_left_min: input.durationLeftMin ?? null,
      duration_right_min: input.durationRightMin ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as PumpLog
}

type ActivityLogPools = {
  feeds: FeedLog[]
  spanningFeeds: FeedLog[]
  sleeps: SleepLog[]
  activeSleeps: SleepLog[]
  spanningEndedSleeps: SleepLog[]
  diapers: DiaperLog[]
  pumps: PumpLog[]
}

async function fetchActivityLogPools(
  babyId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<ActivityLogPools> {
  const since = startOfDay(rangeStart).toISOString()
  const until = endOfDay(rangeEnd).toISOString()

  const [feeds, spanningFeeds, sleeps, activeSleeps, spanningEndedSleeps, diapers, pumps] =
    await Promise.all([
      supabase
        .from("feed_logs")
        .select("*")
        .eq("baby_id", babyId)
        .gte("occurred_at", since)
        .lte("occurred_at", until)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("feed_logs")
        .select("*")
        .eq("baby_id", babyId)
        .eq("feed_type", "nursing")
        .is("duration_min", null)
        .lt("occurred_at", until),
      supabase
        .from("sleep_logs")
        .select("*")
        .eq("baby_id", babyId)
        .gte("started_at", since)
        .lte("started_at", until)
        .order("started_at", { ascending: false }),
      supabase
        .from("sleep_logs")
        .select("*")
        .eq("baby_id", babyId)
        .is("ended_at", null),
      supabase
        .from("sleep_logs")
        .select("*")
        .eq("baby_id", babyId)
        .lt("started_at", until)
        .not("ended_at", "is", null)
        .gte("ended_at", since),
      supabase
        .from("diaper_logs")
        .select("*")
        .eq("baby_id", babyId)
        .gte("occurred_at", since)
        .lte("occurred_at", until)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("pump_logs")
        .select("*")
        .eq("baby_id", babyId)
        .gte("occurred_at", since)
        .lte("occurred_at", until)
        .order("occurred_at", { ascending: false }),
    ])

  if (feeds.error) throw feeds.error
  if (spanningFeeds.error) throw spanningFeeds.error
  if (sleeps.error) throw sleeps.error
  if (activeSleeps.error) throw activeSleeps.error
  if (spanningEndedSleeps.error) throw spanningEndedSleeps.error
  if (diapers.error) throw diapers.error
  if (pumps.error) throw pumps.error

  return {
    feeds: (feeds.data ?? []) as FeedLog[],
    spanningFeeds: (spanningFeeds.data ?? []) as FeedLog[],
    sleeps: (sleeps.data ?? []) as SleepLog[],
    activeSleeps: (activeSleeps.data ?? []) as SleepLog[],
    spanningEndedSleeps: (spanningEndedSleeps.data ?? []) as SleepLog[],
    diapers: (diapers.data ?? []) as DiaperLog[],
    pumps: (pumps.data ?? []) as PumpLog[],
  }
}

function buildActivitiesForDay(
  pools: ActivityLogPools,
  date: Date,
): ActivityItem[] {
  const since = startOfDay(date).toISOString()
  const until = endOfDay(date).toISOString()
  const sinceMs = new Date(since).getTime()
  const untilMs = new Date(until).getTime()

  const feedMap = new Map<string, FeedLog>()
  for (const row of pools.feeds) {
    const atMs = new Date(row.occurred_at).getTime()
    if (atMs >= sinceMs && atMs <= untilMs) feedMap.set(row.id, row)
  }
  for (const row of pools.spanningFeeds) {
    if (new Date(row.occurred_at).getTime() < sinceMs) feedMap.set(row.id, row)
  }

  const sleepMap = new Map<string, SleepLog>()
  for (const row of pools.sleeps) {
    const atMs = new Date(row.started_at).getTime()
    if (atMs >= sinceMs && atMs <= untilMs) sleepMap.set(row.id, row)
  }
  for (const row of pools.activeSleeps) {
    sleepMap.set(row.id, row)
  }
  for (const row of pools.spanningEndedSleeps) {
    const startedMs = new Date(row.started_at).getTime()
    const endedMs = new Date(row.ended_at!).getTime()
    if (startedMs < sinceMs && endedMs >= sinceMs) sleepMap.set(row.id, row)
  }

  const items: ActivityItem[] = [
    ...[...feedMap.values()].map((d) => ({
      kind: "feed" as const,
      at: d.occurred_at,
      data: d,
    })),
    ...[...sleepMap.values()].map((d) => ({
      kind: "sleep" as const,
      at: d.started_at,
      data: d,
    })),
    ...pools.diapers
      .filter((d) => {
        const atMs = new Date(d.occurred_at).getTime()
        return atMs >= sinceMs && atMs <= untilMs
      })
      .map((d) => ({
        kind: "diaper" as const,
        at: d.occurred_at,
        data: d,
      })),
    ...pools.pumps
      .filter((d) => {
        const atMs = new Date(d.occurred_at).getTime()
        return atMs >= sinceMs && atMs <= untilMs
      })
      .map((d) => ({
        kind: "pump" as const,
        at: d.occurred_at,
        data: d,
      })),
  ]

  return items.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )
}

function dayKey(date: Date) {
  return startOfDay(date).toISOString()
}

export async function getActivitiesForDay(
  babyId: string,
  date: Date,
): Promise<ActivityItem[]> {
  const pools = await fetchActivityLogPools(babyId, date, date)
  return buildActivitiesForDay(pools, date)
}

export async function getActivitiesForDays(
  babyId: string,
  dates: Date[],
): Promise<Map<string, ActivityItem[]>> {
  if (dates.length === 0) return new Map()

  let min = startOfDay(dates[0])
  let max = startOfDay(dates[0])
  for (const date of dates) {
    const day = startOfDay(date)
    if (day < min) min = day
    if (day > max) max = day
  }

  const pools = await fetchActivityLogPools(babyId, min, max)
  const byDay = new Map<string, ActivityItem[]>()

  for (const date of dates) {
    byDay.set(dayKey(date), buildActivitiesForDay(pools, date))
  }

  return byDay
}

export async function getTodayActivities(babyId: string) {
  return getActivitiesForDay(babyId, new Date())
}

export async function updateFeed(
  id: string,
  input: {
    occurredAt: string
    feedType: FeedType
    amountMl?: number | null
    durationMin?: number | null
    side?: NursingSide | null
    notes?: string | null
  },
) {
  const { data, error } = await supabase
    .from("feed_logs")
    .update({
      occurred_at: input.occurredAt,
      feed_type: input.feedType,
      amount_ml: input.amountMl ?? null,
      duration_min: input.durationMin ?? null,
      side: input.side ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as FeedLog
}

export async function deleteFeed(id: string) {
  const { error } = await supabase.from("feed_logs").delete().eq("id", id)
  if (error) throw error
}

export async function updateSleep(
  id: string,
  input: {
    startedAt: string
    endedAt?: string | null
    notes?: string | null
  },
) {
  const endedAt = input.endedAt ?? null
  let durationMin: number | null = null
  if (endedAt) {
    const startMs = new Date(input.startedAt).getTime()
    const endMs = new Date(endedAt).getTime()
    durationMin = Math.max(1, Math.round((endMs - startMs) / 60000))
  }

  const { data, error } = await supabase
    .from("sleep_logs")
    .update({
      started_at: input.startedAt,
      ended_at: endedAt,
      duration_min: durationMin,
      notes: input.notes ?? null,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as SleepLog
}

export async function deleteSleep(id: string) {
  const { error } = await supabase.from("sleep_logs").delete().eq("id", id)
  if (error) throw error
}

export async function updateDiaper(
  id: string,
  input: {
    occurredAt: string
    diaperType: DiaperType
    notes?: string | null
  },
) {
  const { data, error } = await supabase
    .from("diaper_logs")
    .update({
      occurred_at: input.occurredAt,
      diaper_type: input.diaperType,
      notes: input.notes ?? null,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as DiaperLog
}

export async function deleteDiaper(id: string) {
  const { error } = await supabase.from("diaper_logs").delete().eq("id", id)
  if (error) throw error
}

export async function updatePump(
  id: string,
  input: {
    occurredAt: string
    amountMl?: number | null
    durationLeftMin?: number | null
    durationRightMin?: number | null
    notes?: string | null
  },
) {
  const { data, error } = await supabase
    .from("pump_logs")
    .update({
      occurred_at: input.occurredAt,
      amount_ml: input.amountMl ?? null,
      duration_left_min: input.durationLeftMin ?? null,
      duration_right_min: input.durationRightMin ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as PumpLog
}

export async function deletePump(id: string) {
  const { error } = await supabase.from("pump_logs").delete().eq("id", id)
  if (error) throw error
}

export async function deleteActivity(item: ActivityItem) {
  switch (item.kind) {
    case "feed":
      return deleteFeed(item.data.id)
    case "sleep":
      return deleteSleep(item.data.id)
    case "diaper":
      return deleteDiaper(item.data.id)
    case "pump":
      return deletePump(item.data.id)
  }
}

export async function getActiveSleep(babyId: string): Promise<SleepLog | null> {
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("baby_id", babyId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as SleepLog | null
}

export async function getActiveNursingSessions(
  babyId: string,
): Promise<FeedLog[]> {
  const { data, error } = await supabase
    .from("feed_logs")
    .select("*")
    .eq("baby_id", babyId)
    .eq("feed_type", "nursing")
    .is("duration_min", null)
    .order("occurred_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as FeedLog[]
}

export async function endNursing(
  feedId: string,
  endedAt: string,
  notes?: string,
  durationMin?: number,
) {
  const { data: feed, error: fetchError } = await supabase
    .from("feed_logs")
    .select("*")
    .eq("id", feedId)
    .single()

  if (fetchError) throw fetchError

  const startMs = new Date(feed.occurred_at).getTime()
  const endMs = new Date(endedAt).getTime()
  const resolvedDuration =
    durationMin ??
    Math.max(1, Math.round((endMs - startMs) / 60_000))

  return updateFeed(feedId, {
    occurredAt: feed.occurred_at,
    feedType: "nursing",
    side: feed.side,
    notes: notes ?? feed.notes,
    durationMin: resolvedDuration,
    amountMl: null,
  })
}
