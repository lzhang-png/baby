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

applyTextSize(getStoredTextSize())
