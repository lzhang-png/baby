import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  isTimelineFilterActive,
  loadHiddenLogKinds,
  noHiddenLogKinds,
  saveHiddenLogKinds,
  TIMELINE_LOG_KINDS,
  type TimelineLogKind,
} from "@/lib/timeline-filter"

type TimelineFilterContextValue = {
  hiddenKinds: Set<TimelineLogKind>
  filterActive: boolean
  isKindEnabled: (kind: TimelineLogKind) => boolean
  isKindHidden: (kind: TimelineLogKind) => boolean
  toggleKind: (kind: TimelineLogKind) => void
  resetFilter: () => void
}

const TimelineFilterContext = createContext<TimelineFilterContextValue | null>(
  null,
)

export function TimelineFilterProvider({ children }: { children: ReactNode }) {
  const [hiddenKinds, setHiddenKinds] = useState(loadHiddenLogKinds)

  const commit = useCallback((next: Set<TimelineLogKind>) => {
    setHiddenKinds(next)
    saveHiddenLogKinds(next)
  }, [])

  const toggleKind = useCallback((kind: TimelineLogKind) => {
    setHiddenKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      saveHiddenLogKinds(next)
      return next
    })
  }, [])

  const resetFilter = useCallback(() => {
    commit(noHiddenLogKinds())
  }, [commit])

  const value = useMemo(
    () => ({
      hiddenKinds,
      filterActive: isTimelineFilterActive(hiddenKinds),
      isKindEnabled: (kind: TimelineLogKind) => !hiddenKinds.has(kind),
      isKindHidden: (kind: TimelineLogKind) => hiddenKinds.has(kind),
      toggleKind,
      resetFilter,
    }),
    [hiddenKinds, toggleKind, resetFilter],
  )

  return (
    <TimelineFilterContext.Provider value={value}>
      {children}
    </TimelineFilterContext.Provider>
  )
}

export function useTimelineFilter() {
  const context = useContext(TimelineFilterContext)
  if (!context) {
    throw new Error(
      "useTimelineFilter must be used within TimelineFilterProvider",
    )
  }
  return context
}

export { TIMELINE_LOG_KINDS }
