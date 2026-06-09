import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js"

import { isSupabaseConfigured, supabase } from "@/lib/supabase"

const LOG_TABLES = [
  "feed_logs",
  "sleep_logs",
  "diaper_logs",
  "pump_logs",
] as const

const DEBOUNCE_MS = 250
const POLL_MS = 20_000

function debounce(fn: () => void, ms: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(fn, ms)
  }
}

function rowMatchesBaby(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  babyId: string,
) {
  const record = (payload.new ?? payload.old) as { baby_id?: string } | null
  return record?.baby_id === babyId
}

function startPolling(onChange: () => void) {
  const poll = () => {
    if (document.visibilityState === "visible") onChange()
  }

  const pollId = window.setInterval(poll, POLL_MS)

  const handleVisibility = () => {
    if (document.visibilityState === "visible") onChange()
  }

  document.addEventListener("visibilitychange", handleVisibility)

  return () => {
    window.clearInterval(pollId)
    document.removeEventListener("visibilitychange", handleVisibility)
  }
}

export function subscribeToBabyActivityChanges(
  babyId: string,
  accessToken: string,
  onChange: () => void,
) {
  if (!isSupabaseConfigured) return () => {}

  const notify = debounce(onChange, DEBOUNCE_MS)
  const stopPolling = startPolling(notify)

  void supabase.realtime.setAuth(accessToken)

  const channel: RealtimeChannel = supabase.channel(`baby-activity:${babyId}`)

  for (const table of LOG_TABLES) {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      (payload) => {
        if (rowMatchesBaby(payload, babyId)) notify()
      },
    )
  }

  channel.subscribe()

  return () => {
    stopPolling()
    void supabase.removeChannel(channel)
  }
}
