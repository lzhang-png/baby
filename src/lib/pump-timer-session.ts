import { useEffect, useState } from "react"

import type { NursingSideKey } from "@/lib/nursing-timer-session"

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

let pumpTimerCache: {
  babyId: string
  sides: Record<NursingSideKey, SidePumpState>
} | null = null

const listeners = new Set<() => void>()

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
  if (pumpTimerCache?.babyId !== babyId) return null
  return pumpTimerCache.sides
}

export function writePumpTimerCache(
  babyId: string,
  sides: Record<NursingSideKey, SidePumpState>,
) {
  if (sides.L.status === "idle" && sides.R.status === "idle") {
    pumpTimerCache = null
    notifyPumpTimerListeners()
    return
  }

  pumpTimerCache = {
    babyId,
    sides: {
      L: { ...sides.L },
      R: { ...sides.R },
    },
  }
  notifyPumpTimerListeners()
}

export function clearPumpTimerCache() {
  pumpTimerCache = null
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
