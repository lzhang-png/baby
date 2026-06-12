import {
  clampPxPerMinute,
  DEFAULT_PX_PER_MINUTE,
  MAX_PX_PER_MINUTE,
  MIN_PX_PER_MINUTE,
} from "@/lib/schedule-utils"
import { safeGetItem, safeSetItem } from "@/lib/safe-storage"

const STORAGE_KEY = "baby-timeline-zoom"

export function loadTimelineZoom(): number {
  const stored = safeGetItem(STORAGE_KEY)
  if (!stored) return DEFAULT_PX_PER_MINUTE
  const parsed = Number(stored)
  return Number.isFinite(parsed)
    ? clampPxPerMinute(parsed)
    : DEFAULT_PX_PER_MINUTE
}

export function saveTimelineZoom(pxPerMinute: number) {
  safeSetItem(STORAGE_KEY, String(pxPerMinute))
}

export const ZOOM_ANIMATION_MS = 100

/** Duration of the spring-back when releasing a pinch past the zoom limit. */
export const PINCH_BOUNCE_MS = 320

/** How far (px/min) the pinch may stretch past a limit before fully resisting. */
const RUBBER_BAND_RANGE = 1.6

export function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

/** Overshoots past 1 then settles back — produces a bounce when easing to a target. */
export function easeOutBack(t: number) {
  const c1 = 2.2
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

/**
 * Allow zoom to stretch slightly past the min/max with diminishing give, so a
 * pinch beyond the limit visibly resists instead of stopping dead.
 */
export function rubberBandPxPerMinute(px: number) {
  if (px > MAX_PX_PER_MINUTE) {
    const over = px - MAX_PX_PER_MINUTE
    return MAX_PX_PER_MINUTE + RUBBER_BAND_RANGE * (1 - 1 / (over / RUBBER_BAND_RANGE + 1))
  }
  if (px < MIN_PX_PER_MINUTE) {
    const under = MIN_PX_PER_MINUTE - px
    return MIN_PX_PER_MINUTE - RUBBER_BAND_RANGE * (1 - 1 / (under / RUBBER_BAND_RANGE + 1))
  }
  return px
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Y offset from the scroll container top to the center of the screen. */
export function getScreenCenterAnchorOffset(scrollEl: HTMLElement) {
  const rect = scrollEl.getBoundingClientRect()
  const screenCenterY = window.innerHeight / 2
  return screenCenterY - rect.top
}

/** Keep the content at the screen center stable while timeline height scales. */
export function getZoomScrollTop(
  startScroll: number,
  anchorOffset: number,
  ratio: number,
) {
  return (startScroll + anchorOffset) * ratio - anchorOffset
}
