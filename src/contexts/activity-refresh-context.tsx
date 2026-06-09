import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { useAuth } from "@/contexts/auth-context"
import { subscribeToBabyActivityChanges } from "@/lib/activity-realtime"

type ActivityRefreshContextValue = {
  version: number
  notifyActivityChanged: () => void
}

const ActivityRefreshContext =
  createContext<ActivityRefreshContextValue | null>(null)

function ActivityRealtimeSync() {
  const { baby } = useAuth()
  const { notifyActivityChanged } = useActivityRefresh()

  useEffect(() => {
    if (!baby?.id) return
    return subscribeToBabyActivityChanges(baby.id, notifyActivityChanged)
  }, [baby?.id, notifyActivityChanged])

  return null
}

export function ActivityRefreshProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)

  const notifyActivityChanged = useCallback(() => {
    setVersion((current) => current + 1)
  }, [])

  return (
    <ActivityRefreshContext.Provider
      value={{ version, notifyActivityChanged }}
    >
      <ActivityRealtimeSync />
      {children}
    </ActivityRefreshContext.Provider>
  )
}

export function useActivityRefresh() {
  const ctx = useContext(ActivityRefreshContext)
  if (!ctx) {
    throw new Error(
      "useActivityRefresh must be used within ActivityRefreshProvider",
    )
  }
  return ctx
}
