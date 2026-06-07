import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Session, User } from "@supabase/supabase-js"

import { ensureHousehold, getBaby, getHousehold } from "@/lib/api/household"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"
import type { Baby, Household } from "@/lib/types"

type AuthContextValue = {
  user: User | null
  session: Session | null
  household: Household | null
  baby: Baby | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    displayName: string,
    inviteCode?: string,
  ) => Promise<void>
  signOut: () => Promise<void>
  refreshHousehold: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadHouseholdData() {
  const [household, baby] = await Promise.all([getHousehold(), getBaby()])
  return { household, baby }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [baby, setBaby] = useState<Baby | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshHousehold = useCallback(async () => {
    if (!session) {
      setHousehold(null)
      setBaby(null)
      return
    }
    const data = await loadHouseholdData()
    setHousehold(data.household)
    setBaby(data.baby)
  }, [session])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Keep this callback synchronous — awaiting Supabase calls here can
      // deadlock token refresh and surface as unexpected logouts.
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setHousehold(null)
      setBaby(null)
      return
    }

    let cancelled = false

    loadHouseholdData()
      .then((result) => {
        if (cancelled) return
        setHousehold(result.household)
        setBaby(result.baby)
      })
      .catch(() => {
        if (cancelled) return
        setHousehold(null)
        setBaby(null)
      })

    return () => {
      cancelled = true
    }
  }, [session])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const result = await loadHouseholdData()
    setHousehold(result.household)
    setBaby(result.baby)
  }, [])

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      inviteCode?: string,
    ) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      })
      if (error) throw error
      if (!data.session) {
        throw new Error(
          "Check your email to confirm your account, then sign in.",
        )
      }
      await ensureHousehold(displayName, inviteCode)
      const result = await loadHouseholdData()
      setHousehold(result.household)
      setBaby(result.baby)
    },
    [],
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(
    () => ({
      user,
      session,
      household,
      baby,
      loading,
      signIn,
      signUp,
      signOut,
      refreshHousehold,
    }),
    [
      user,
      session,
      household,
      baby,
      loading,
      signIn,
      signUp,
      signOut,
      refreshHousehold,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
