import { isSupabaseConfigured, supabase } from "@/lib/supabase"

const LOG_TABLES = [
  "feed_logs",
  "sleep_logs",
  "diaper_logs",
  "pump_logs",
] as const

const DEBOUNCE_MS = 250

function debounce(fn: () => void, ms: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(fn, ms)
  }
}

export function subscribeToBabyActivityChanges(
  babyId: string,
  onChange: () => void,
) {
  if (!isSupabaseConfigured) return () => {}

  const notify = debounce(onChange, DEBOUNCE_MS)
  const channel = supabase.channel(`baby-activity:${babyId}`)

  for (const table of LOG_TABLES) {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `baby_id=eq.${babyId}`,
      },
      notify,
    )
  }

  channel.subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
