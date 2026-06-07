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

export async function getActivitiesForDay(
  babyId: string,
  date: Date,
): Promise<ActivityItem[]> {
  const since = startOfDay(date).toISOString()
  const until = endOfDay(date).toISOString()

  const [feeds, sleeps, diapers, pumps] = await Promise.all([
    supabase
      .from("feed_logs")
      .select("*")
      .eq("baby_id", babyId)
      .gte("occurred_at", since)
      .lte("occurred_at", until)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("sleep_logs")
      .select("*")
      .eq("baby_id", babyId)
      .gte("started_at", since)
      .lte("started_at", until)
      .order("started_at", { ascending: false }),
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
  if (sleeps.error) throw sleeps.error
  if (diapers.error) throw diapers.error
  if (pumps.error) throw pumps.error

  const items: ActivityItem[] = [
    ...(feeds.data ?? []).map((d) => ({
      kind: "feed" as const,
      at: d.occurred_at,
      data: d as FeedLog,
    })),
    ...(sleeps.data ?? []).map((d) => ({
      kind: "sleep" as const,
      at: d.started_at,
      data: d as SleepLog,
    })),
    ...(diapers.data ?? []).map((d) => ({
      kind: "diaper" as const,
      at: d.occurred_at,
      data: d as DiaperLog,
    })),
    ...(pumps.data ?? []).map((d) => ({
      kind: "pump" as const,
      at: d.occurred_at,
      data: d as PumpLog,
    })),
  ]

  return items.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )
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
