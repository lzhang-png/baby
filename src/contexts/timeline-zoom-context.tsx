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
  clampPxPerMinute,
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

type PinchState = {
  startDistance: number
  startPx: number
  startScroll: number
  anchorOffset: number
}

function getTouchDistance(touches: TouchList) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  )
}

export function TimelineZoomProvider({ children }: { children: ReactNode }) {
  const [pxPerMinute, setPxPerMinute] = useState(loadTimelineZoom)
  const pxPerMinuteRef = useRef(pxPerMinute)
  const zoomFrameRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const pinchRef = useRef<PinchState | null>(null)
  const detachPinchRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    pxPerMinuteRef.current = pxPerMinute
  }, [pxPerMinute])

  const registerScrollElement = useCallback((el: HTMLDivElement | null) => {
    detachPinchRef.current?.()
    detachPinchRef.current = null
    pinchRef.current = null
    scrollRef.current = el
    if (!el) return

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return

      if (zoomFrameRef.current !== null) {
        cancelAnimationFrame(zoomFrameRef.current)
        zoomFrameRef.current = null
      }

      const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2
      pinchRef.current = {
        startDistance: getTouchDistance(event.touches),
        startPx: pxPerMinuteRef.current,
        startScroll: el.scrollTop,
        anchorOffset: midY - el.getBoundingClientRect().top,
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      const pinch = pinchRef.current
      if (!pinch || event.touches.length !== 2) return

      event.preventDefault()

      const scale = getTouchDistance(event.touches) / pinch.startDistance
      const next = clampPxPerMinute(pinch.startPx * scale)
      if (next === pxPerMinuteRef.current) return

      pxPerMinuteRef.current = next
      flushSync(() => setPxPerMinute(next))
      el.scrollTop = getZoomScrollTop(
        pinch.startScroll,
        pinch.anchorOffset,
        next / pinch.startPx,
      )
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (!pinchRef.current || event.touches.length >= 2) return
      pinchRef.current = null
      saveTimelineZoom(pxPerMinuteRef.current)
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd)
    el.addEventListener("touchcancel", onTouchEnd)

    detachPinchRef.current = () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      el.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [])

  useEffect(() => () => detachPinchRef.current?.(), [])

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
