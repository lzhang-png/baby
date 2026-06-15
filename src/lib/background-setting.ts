import { useEffect, useState } from "react"

import { safeGetItem, safeSetItem } from "@/lib/safe-storage"

export type BackgroundEffect = "off" | "stars"

export const BACKGROUND_EFFECTS: BackgroundEffect[] = ["off", "stars"]

const STORAGE_KEY = "baby-bg-effect"
const LEGACY_KEY = "baby-aurora-bg"
const BG_ATTR = "data-bg"
const DEFAULT_EFFECT: BackgroundEffect = "off"

function normalize(value: string | null): BackgroundEffect | null {
  if (value === "off" || value === "stars") return value
  // Migrate removed aurora/bubbles preferences.
  if (value === "aurora" || value === "bubbles") return "off"
  return null
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
