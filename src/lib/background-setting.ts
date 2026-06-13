import { useEffect, useState } from "react"

import { safeGetItem, safeSetItem } from "@/lib/safe-storage"

export type BackgroundEffect = "off" | "aurora" | "bubbles" | "stars"

export const BACKGROUND_EFFECTS: BackgroundEffect[] = [
  "off",
  "aurora",
  "bubbles",
  "stars",
]

const STORAGE_KEY = "baby-bg-effect"
const LEGACY_KEY = "baby-aurora-bg"
const BG_ATTR = "data-bg"
const DEFAULT_EFFECT: BackgroundEffect = "aurora"

function normalize(value: string | null): BackgroundEffect | null {
  return BACKGROUND_EFFECTS.includes(value as BackgroundEffect)
    ? (value as BackgroundEffect)
    : null
}

export function getStoredBackgroundEffect(): BackgroundEffect {
  const stored = normalize(safeGetItem(STORAGE_KEY))
  if (stored) return stored
  // Migrate the previous aurora on/off toggle.
  if (safeGetItem(LEGACY_KEY) === "off") return "off"
  return DEFAULT_EFFECT
}

export function applyBackgroundEffect(effect: BackgroundEffect) {
  document.documentElement.setAttribute(BG_ATTR, effect)
}

export function setBackgroundEffect(effect: BackgroundEffect) {
  applyBackgroundEffect(effect)
  safeSetItem(STORAGE_KEY, effect)
}

export function useBackgroundEffect(): BackgroundEffect {
  const [effect, setEffect] = useState(() => getStoredBackgroundEffect())

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setEffect(
        normalize(document.documentElement.getAttribute(BG_ATTR)) ??
          DEFAULT_EFFECT,
      )
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [BG_ATTR],
    })
    return () => observer.disconnect()
  }, [])

  return effect
}

applyBackgroundEffect(getStoredBackgroundEffect())
