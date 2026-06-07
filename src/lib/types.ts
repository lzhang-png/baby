export type FeedType = "nursing" | "formula" | "expressed" | "donated"
export type DiaperType = "wet" | "dirty" | "mixed" | "dry"
export type NursingSide = "L" | "R" | "both"

export type Profile = {
  id: string
  display_name: string | null
  created_at: string
}

export type Household = {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export type Baby = {
  id: string
  household_id: string
  name: string
  birth_date: string
  created_at: string
}

export type FeedLog = {
  id: string
  baby_id: string
  logged_by: string | null
  occurred_at: string
  feed_type: FeedType
  amount_ml: number | null
  duration_min: number | null
  side: NursingSide | null
  notes: string | null
  created_at: string
}

export type SleepLog = {
  id: string
  baby_id: string
  logged_by: string | null
  started_at: string
  ended_at: string | null
  duration_min: number | null
  notes: string | null
  created_at: string
}

export type DiaperLog = {
  id: string
  baby_id: string
  logged_by: string | null
  occurred_at: string
  diaper_type: DiaperType
  notes: string | null
  created_at: string
}

export type PumpLog = {
  id: string
  baby_id: string
  logged_by: string | null
  occurred_at: string
  amount_ml: number | null
  duration_left_min: number | null
  duration_right_min: number | null
  notes: string | null
  created_at: string
}

export type ActivityItem =
  | { kind: "feed"; at: string; data: FeedLog }
  | { kind: "sleep"; at: string; data: SleepLog }
  | { kind: "diaper"; at: string; data: DiaperLog }
  | { kind: "pump"; at: string; data: PumpLog }
