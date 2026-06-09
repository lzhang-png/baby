import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const PLACEHOLDER_MARKERS = ["YOUR_PROJECT", "your-anon-key", "your-anon"]

export const isSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    !PLACEHOLDER_MARKERS.some(
      (marker) => url.includes(marker) || anonKey.includes(marker),
    ),
)

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (null as unknown as SupabaseClient)
