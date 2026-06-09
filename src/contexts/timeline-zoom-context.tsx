import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { flushSync } from "react-dom"

import {
  canZoomIn,
  canZoomOut,
  zoomInPxPerMinute,
  zoomOutPxPerMinute,
} from "@/lib/schedule-utils"
import {
  easeOutCubic,
  getScreenCenterAnchorOffset,
  getZoomScrollTop,
  loadTimelineZoom,
  prefersReducedMotion,
  saveTimelineZoom,
  ZOOM_ANIMATION_MS,
} from "@/lib/timeline-zoom"

type TimelineZoomContextValue = {
  pxPerMinute: number
  zoomInEnabled: boolean
  zoomOutEnabled: boolean
  zoomIn: () => void
  zoomOut: () => void
  registerScrollElement: (el: HTMLDivElement | null) => void
}

const TimelineZoomContext = createContext<TimelineZoomContextValue | null>(null)

export function TimelineZoomProvider({ children }: { children: ReactNode }) {
  const [pxPerMinute, setPxPerMinute] = useState(loadTimelineZoom)
  const pxPerMinuteRef = useRef(pxPerMinute)
  const zoomFrameRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    pxPerMinuteRef.current = pxPerMinute
  }, [pxPerMinute])

  const registerScrollElement = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el
  }, [])

  const applyZoom = useCallback((targetPxPerMinute: number) => {
    const from = pxPerMinuteRef.current
    if (targetPxPerMinute === from) return

    if (zoomFrameRef.current !== null) {
      cancelAnimationFrame(zoomFrameRef.current)
      zoomFrameRef.current = null
    }

    const scrollEl = scrollRef.current
    const startScroll = scrollEl?.scrollTop ?? 0
    const anchorOffset = scrollEl ? getScreenCenterAnchorOffset(scrollEl) : 0

    const syncScroll = (px: number) => {
      if (!scrollEl || from <= 0) return
      scrollEl.scrollTop = getZoomScrollTop(
        startScroll,
        anchorOffset,
        px / from,
      )
    }

    const commitZoom = (value: number) => {
      pxPerMinuteRef.current = value
      flushSync(() => setPxPerMinute(value))
      syncScroll(value)
    }

    const finish = (value: number) => {
      commitZoom(value)
      saveTimelineZoom(value)
    }

    if (prefersReducedMotion()) {
      finish(targetPxPerMinute)
      return
    }

    const startTime = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / ZOOM_ANIMATION_MS)
      const current =
        from + (targetPxPerMinute - from) * easeOutCubic(t)

      commitZoom(current)

      if (t < 1) {
        zoomFrameRef.current = requestAnimationFrame(tick)
        return
      }

      zoomFrameRef.current = null
      finish(targetPxPerMinute)
    }

    zoomFrameRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(
    () => () => {
      if (zoomFrameRef.current !== null) {
        cancelAnimationFrame(zoomFrameRef.current)
      }
    },
    [],
  )

  const zoomIn = useCallback(() => {
    applyZoom(zoomInPxPerMinute(pxPerMinuteRef.current))
  }, [applyZoom])

  const zoomOut = useCallback(() => {
    applyZoom(zoomOutPxPerMinute(pxPerMinuteRef.current))
  }, [applyZoom])

  const value = useMemo(
    () => ({
      pxPerMinute,
      zoomInEnabled: canZoomIn(pxPerMinute),
      zoomOutEnabled: canZoomOut(pxPerMinute),
      zoomIn,
      zoomOut,
      registerScrollElement,
    }),
    [pxPerMinute, zoomIn, zoomOut, registerScrollElement],
  )

  return (
    <TimelineZoomContext.Provider value={value}>
      {children}
    </TimelineZoomContext.Provider>
  )
}

export function useTimelineZoom() {
  const context = useContext(TimelineZoomContext)
  if (!context) {
    throw new Error("useTimelineZoom must be used within TimelineZoomProvider")
  }
  return context
}
