import { useEffect, useState } from "react"

import type { NursingSide } from "@/lib/types"

export type NursingSideKey = Exclude<NursingSide, "both">

export type SideNursingState = {
  status: "idle" | "running" | "paused"
  startedAt: string | null
  accumulatedSec: number
  lastResumeAt: number | null
  feedId: string | null
  pausedAtMs: number | null
}

export const INITIAL_SIDE_NURSING_STATE: SideNursingState = {
  status: "idle",
  startedAt: null,
  accumulatedSec: 0,
  lastResumeAt: null,
  feedId: null,
  pausedAtMs: null,
}

export const INITIAL_NURSING_SIDES: Record<NursingSideKey, SideNursingState> = {
  L: { ...INITIAL_SIDE_NURSING_STATE },
  R: { ...INITIAL_SIDE_NURSING_STATE },
}

let nursingTimerCache: {
  babyId: string
  sides: Record<NursingSideKey, SideNursingState>
} | null = null

const listeners = new Set<() => void>()

function notifyNursingTimerListeners() {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeNursingTimer(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function readNursingTimerCache(babyId: string) {
  if (nursingTimerCache?.babyId !== babyId) return null
  return nursingTimerCache.sides
}

export function writeNursingTimerCache(
  babyId: string,
  sides: Record<NursingSideKey, SideNursingState>,
) {
  if (sides.L.status === "idle" && sides.R.status === "idle") {
    nursingTimerCache = null
    notifyNursingTimerListeners()
    return
  }

  nursingTimerCache = {
    babyId,
    sides: {
      L: { ...sides.L },
      R: { ...sides.R },
    },
  }
  notifyNursingTimerListeners()
}

export function clearNursingTimerCache() {
  nursingTimerCache = null
  notifyNursingTimerListeners()
}

export function getSideElapsedSec(state: SideNursingState) {
  if (state.status === "running" && state.lastResumeAt) {
    return (
      state.accumulatedSec +
      Math.floor((Date.now() - state.lastResumeAt) / 1000)
    )
  }
  return state.accumulatedSec
}

export function pauseSideState(state: SideNursingState): SideNursingState {
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

export function setSideAccumulatedSec(
  state: SideNursingState,
  elapsedSec: number,
): SideNursingState {
  if (state.status !== "paused") return state
  return {
    ...state,
    accumulatedSec: Math.max(0, Math.floor(elapsedSec)),
  }
}

export function resumeSideState(state: SideNursingState): SideNursingState {
  return {
    ...state,
    status: "running",
    lastResumeAt: Date.now(),
    pausedAtMs: null,
  }
}

export function feedToSideState(feed: {
  id: string
  occurred_at: string
}): SideNursingState {
  return {
    status: "running",
    startedAt: feed.occurred_at,
    accumulatedSec: 0,
    lastResumeAt: new Date(feed.occurred_at).getTime(),
    feedId: feed.id,
    pausedAtMs: null,
  }
}

export function mergeNursingSidesFromServer(
  prev: Record<NursingSideKey, SideNursingState>,
  activeNursingSessions: { id: string; occurred_at: string; side: string | null }[],
): Record<NursingSideKey, SideNursingState> {
  const nextSides = { ...INITIAL_NURSING_SIDES }

  for (const feed of activeNursingSessions) {
    if (feed.side !== "L" && feed.side !== "R") continue

    const prevSide = prev[feed.side]
    if (prevSide.feedId === feed.id && prevSide.status !== "idle") {
      nextSides[feed.side] = prevSide
    } else {
      nextSides[feed.side] = feedToSideState(feed)
    }
  }

  return nextSides
}

export function getNursingSideStateForFeed(
  sides: Record<NursingSideKey, SideNursingState> | null | undefined,
  feedId: string,
  side: NursingSideKey,
) {
  const state = sides?.[side]
  if (!state || state.feedId !== feedId) return null
  return state
}

export function useNursingTimerSession(babyId: string | undefined) {
  const [revision, setRevision] = useState(0)
  const sides = babyId ? readNursingTimerCache(babyId) : null

  useEffect(() => {
    if (!babyId) return
    return subscribeNursingTimer(() => setRevision((value) => value + 1))
  }, [babyId])

  const hasRunningSide =
    sides?.L.status === "running" || sides?.R.status === "running"

  useEffect(() => {
    if (!hasRunningSide) return
    const id = window.setInterval(() => setRevision((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [hasRunningSide, sides?.L.status, sides?.R.status])

  void revision

  return babyId ? readNursingTimerCache(babyId) : null
}
