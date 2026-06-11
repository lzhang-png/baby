import { useEffect, useState } from "react"

import type { NursingSideKey } from "@/lib/nursing-timer-session"
import { safeGetItem, safeRemoveItem, safeSetItem } from "@/lib/safe-storage"

export type SidePumpState = {
  status: "idle" | "running" | "paused"
  startedAt: string | null
  accumulatedSec: number
  lastResumeAt: number | null
  pausedAtMs: number | null
}

export const INITIAL_SIDE_PUMP_STATE: SidePumpState = {
  status: "idle",
  startedAt: null,
  accumulatedSec: 0,
  lastResumeAt: null,
  pausedAtMs: null,
}

export const INITIAL_PUMP_SIDES: Record<NursingSideKey, SidePumpState> = {
  L: { ...INITIAL_SIDE_PUMP_STATE },
  R: { ...INITIAL_SIDE_PUMP_STATE },
}

const STORAGE_KEY_PREFIX = "baby-pump-timer:"

let pumpTimerCache: {
  babyId: string
  sides: Record<NursingSideKey, SidePumpState>
} | null = null

const listeners = new Set<() => void>()

function storageKey(babyId: string) {
  return `${STORAGE_KEY_PREFIX}${babyId}`
}

function isSidePumpState(value: unknown): value is SidePumpState {
  if (!value || typeof value !== "object") return false

  const state = value as SidePumpState
  return (
    (state.status === "idle" ||
      state.status === "running" ||
      state.status === "paused") &&
    (state.startedAt === null || typeof state.startedAt === "string") &&
    typeof state.accumulatedSec === "number" &&
    (state.lastResumeAt === null || typeof state.lastResumeAt === "number") &&
    (state.pausedAtMs === null || typeof state.pausedAtMs === "number")
  )
}

function loadStoredPumpSides(
  babyId: string,
): Record<NursingSideKey, SidePumpState> | null {
  const raw = safeGetItem(storageKey(babyId))
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null

    const sides = parsed as Record<NursingSideKey, SidePumpState>
    if (!isSidePumpState(sides.L) || !isSidePumpState(sides.R)) return null

    return {
      L: { ...sides.L },
      R: { ...sides.R },
    }
  } catch {
    return null
  }
}

function persistStoredPumpSides(
  babyId: string,
  sides: Record<NursingSideKey, SidePumpState>,
) {
  safeSetItem(
    storageKey(babyId),
    JSON.stringify({
      L: sides.L,
      R: sides.R,
    }),
  )
}

function removeStoredPumpSides(babyId: string) {
  safeRemoveItem(storageKey(babyId))
}

function notifyPumpTimerListeners() {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribePumpTimer(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function readPumpTimerCache(babyId: string) {
  if (pumpTimerCache?.babyId === babyId) {
    return pumpTimerCache.sides
  }

  const stored = loadStoredPumpSides(babyId)
  if (!stored) return null

  pumpTimerCache = { babyId, sides: stored }
  return stored
}

export function writePumpTimerCache(
  babyId: string,
  sides: Record<NursingSideKey, SidePumpState>,
) {
  if (sides.L.status === "idle" && sides.R.status === "idle") {
    pumpTimerCache = null
    removeStoredPumpSides(babyId)
    notifyPumpTimerListeners()
    return
  }

  const snapshot = {
    L: { ...sides.L },
    R: { ...sides.R },
  }

  pumpTimerCache = {
    babyId,
    sides: snapshot,
  }
  persistStoredPumpSides(babyId, snapshot)
  notifyPumpTimerListeners()
}

export function clearPumpTimerCache() {
  const babyId = pumpTimerCache?.babyId
  pumpTimerCache = null
  if (babyId) removeStoredPumpSides(babyId)
  notifyPumpTimerListeners()
}

export function getPumpSideElapsedSec(state: SidePumpState) {
  if (state.status === "running" && state.lastResumeAt) {
    return (
      state.accumulatedSec +
      Math.floor((Date.now() - state.lastResumeAt) / 1000)
    )
  }
  return state.accumulatedSec
}

export function pausePumpSideState(state: SidePumpState): SidePumpState {
  if (state.status !== "running" || !state.lastResumeAt) return state
  return {
    ...state,
    status: "paused",
    accumulatedSec:
      state.accumulatedSec +
      Math.floor((Date.now() - state.lastResumeAt) / 1000),
    lastResumeAt: null,
    pausedAtMs: Date.now(),
  }
}

export function resumePumpSideState(state: SidePumpState): SidePumpState {
  return {
    ...state,
    status: "running",
    lastResumeAt: Date.now(),
    pausedAtMs: null,
  }
}

export function isPumpSideStarted(state: SidePumpState) {
  return state.status !== "idle"
}

export function hasOngoingPumpSession(
  sides: Record<NursingSideKey, SidePumpState> | null | undefined,
) {
  if (!sides) return false
  return isPumpSideStarted(sides.L) || isPumpSideStarted(sides.R)
}

export function usePumpTimerSession(babyId: string | undefined) {
  const [revision, setRevision] = useState(0)
  const sides = babyId ? readPumpTimerCache(babyId) : null

  useEffect(() => {
    if (!babyId) return
    return subscribePumpTimer(() => setRevision((value) => value + 1))
  }, [babyId])

  const hasRunningSide =
    sides?.L.status === "running" || sides?.R.status === "running"

  useEffect(() => {
    if (!hasRunningSide) return
    const id = window.setInterval(() => setRevision((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [hasRunningSide, sides?.L.status, sides?.R.status])

  void revision

  return babyId ? readPumpTimerCache(babyId) : null
}
