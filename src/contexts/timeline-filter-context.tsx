import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  allTimelineLogKinds,
  isTimelineFilterActive,
  loadTimelineLogFilter,
  saveTimelineLogFilter,
  TIMELINE_LOG_KINDS,
  type TimelineLogKind,
} from "@/lib/timeline-filter"

type TimelineFilterContextValue = {
  enabledKinds: Set<TimelineLogKind>
  filterActive: boolean
  isKindEnabled: (kind: TimelineLogKind) => boolean
  toggleKind: (kind: TimelineLogKind) => void
  resetFilter: () => void
}

const TimelineFilterContext = createContext<TimelineFilterContextValue | null>(
  null,
)

export function TimelineFilterProvider({ children }: { children: ReactNode }) {
  const [enabledKinds, setEnabledKinds] = useState(loadTimelineLogFilter)

  const commit = useCallback((next: Set<TimelineLogKind>) => {
    setEnabledKinds(next)
    saveTimelineLogFilter(next)
  }, [])

  const toggleKind = useCallback((kind: TimelineLogKind) => {
    setEnabledKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      saveTimelineLogFilter(next)
      return next
    })
  }, [])

  const resetFilter = useCallback(() => {
    commit(allTimelineLogKinds())
  }, [commit])

  const value = useMemo(
    () => ({
      enabledKinds,
      filterActive: isTimelineFilterActive(enabledKinds),
      isKindEnabled: (kind: TimelineLogKind) => enabledKinds.has(kind),
      toggleKind,
      resetFilter,
    }),
    [enabledKinds, toggleKind, resetFilter],
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
