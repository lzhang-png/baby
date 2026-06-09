export type TextSize = "small" | "default" | "large"

const STORAGE_KEY = "baby-text-size"
const TEXT_SIZE_ATTR = "data-text-size"

export function getStoredTextSize(): TextSize {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === "small" || stored === "default" || stored === "large"
    ? stored
    : "default"
}

export function applyTextSize(size: TextSize) {
  if (size === "default") {
    document.documentElement.removeAttribute(TEXT_SIZE_ATTR)
    return
  }

  document.documentElement.setAttribute(TEXT_SIZE_ATTR, size)
}

export function setAppTextSize(size: TextSize) {
  applyTextSize(size)
  localStorage.setItem(STORAGE_KEY, size)
}

export function getTextSizeScale(): number {
  const size =
    document.documentElement.getAttribute(TEXT_SIZE_ATTR) ?? getStoredTextSize()
  if (size === "small") return 0.875
  if (size === "large") return 1.125
  return 1
}

export function getScaledPx(basePx: number): number {
  return Math.ceil(basePx * getTextSizeScale())
}

/** Timeline cards are two-line; large text needs a little extra clearance. */
export function getScaledLogCardHeightPx(baseHeightPx: number): number {
  const scaled = getScaledPx(baseHeightPx)
  return getTextSizeScale() > 1 ? scaled + 6 : scaled
}

applyTextSize(getStoredTextSize())
