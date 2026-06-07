import { supabase } from "@/lib/supabase"
import type { Baby, Household } from "@/lib/types"

export async function getHousehold(): Promise<Household | null> {
  const { data: membership, error: memberError } = await supabase
    .from("household_members")
    .select("household_id")
    .limit(1)
    .maybeSingle()

  if (memberError) throw memberError
  if (!membership) return null

  const { data, error } = await supabase
    .from("households")
    .select("*")
    .eq("id", membership.household_id)
    .single()

  if (error) throw error
  return data
}

export async function getBaby(): Promise<Baby | null> {
  const household = await getHousehold()
  if (!household) return null

  const { data, error } = await supabase
    .from("babies")
    .select("*")
    .eq("household_id", household.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function setupFamily(displayName: string) {
  const { data, error } = await supabase.rpc("setup_family", {
    p_display_name: displayName,
    p_baby_name: "Luca",
    p_birth_date: "2026-04-21",
  })
  if (error) throw error
  return data as string
}

export async function joinHousehold(inviteCode: string) {
  const { data, error } = await supabase.rpc("join_household", {
    p_invite_code: inviteCode.trim(),
  })
  if (error) throw error
  return data as string
}

export async function ensureHousehold(
  displayName: string,
  inviteCode?: string,
): Promise<void> {
  const existing = await getHousehold()
  if (existing) return

  if (inviteCode?.trim()) {
    await joinHousehold(inviteCode)
  } else {
    await setupFamily(displayName)
  }
}
