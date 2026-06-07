import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

type ActivityRefreshContextValue = {
  version: number
  notifyActivityChanged: () => void
}

const ActivityRefreshContext =
  createContext<ActivityRefreshContextValue | null>(null)

export function ActivityRefreshProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)

  const notifyActivityChanged = useCallback(() => {
    setVersion((current) => current + 1)
  }, [])

  return (
    <ActivityRefreshContext.Provider
      value={{ version, notifyActivityChanged }}
    >
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
