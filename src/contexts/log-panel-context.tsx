import { createContext, useContext, type ReactNode } from "react"

import type { LogPanelType } from "@/components/log/log-panel"

type LogPanelContextValue = {
  openLogPanel: (type: LogPanelType) => void
}

const LogPanelContext = createContext<LogPanelContextValue | null>(null)

export function LogPanelProvider({
  children,
  openLogPanel,
}: {
  children: ReactNode
  openLogPanel: (type: LogPanelType) => void
}) {
  return (
    <LogPanelContext.Provider value={{ openLogPanel }}>
      {children}
    </LogPanelContext.Provider>
  )
}

export function useLogPanel() {
  return useContext(LogPanelContext)
}
