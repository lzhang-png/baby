import {
  clampPxPerMinute,
  DEFAULT_PX_PER_MINUTE,
} from "@/lib/schedule-utils"

const STORAGE_KEY = "baby-timeline-zoom"

export function loadTimelineZoom(): number {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return DEFAULT_PX_PER_MINUTE
  const parsed = Number(stored)
  return Number.isFinite(parsed)
    ? clampPxPerMinute(parsed)
    : DEFAULT_PX_PER_MINUTE
}

export function saveTimelineZoom(pxPerMinute: number) {
  localStorage.setItem(STORAGE_KEY, String(pxPerMinute))
}

export const ZOOM_ANIMATION_MS = 300

export function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
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
