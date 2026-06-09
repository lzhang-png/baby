import { useEffect, useState } from "react"

import { safeGetItem, safeSetItem } from "@/lib/safe-storage"

export type TextSize = "small" | "default" | "large"

const STORAGE_KEY = "baby-text-size"
const TEXT_SIZE_ATTR = "data-text-size"

export function getStoredTextSize(): TextSize {
  const stored = safeGetItem(STORAGE_KEY)
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
  safeSetItem(STORAGE_KEY, size)
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

/** Height estimate for timeline card spacing (not applied as card min-height). */
export function getScaledLogCardHeightPx(baseHeightPx: number): number {
  return Math.ceil(baseHeightPx * getTextSizeScale())
}

export function useTextSizeVersion(): number {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setVersion((current) => current + 1)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [TEXT_SIZE_ATTR],
    })
    return () => observer.disconnect()
  }, [])

  return version
}

applyTextSize(getStoredTextSize())
