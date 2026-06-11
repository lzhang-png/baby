import { useEffect, useState } from "react"

import { safeGetItem, safeRemoveItem, safeSetItem } from "@/lib/safe-storage"
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

const STORAGE_KEY_PREFIX = "baby-nursing-timer:"

let nursingTimerCache: {
  babyId: string
  sides: Record<NursingSideKey, SideNursingState>
} | null = null

const listeners = new Set<() => void>()

function storageKey(babyId: string) {
  return `${STORAGE_KEY_PREFIX}${babyId}`
}

function isSideNursingState(value: unknown): value is SideNursingState {
  if (!value || typeof value !== "object") return false

  const state = value as SideNursingState
  return (
    (state.status === "idle" ||
      state.status === "running" ||
      state.status === "paused") &&
    (state.startedAt === null || typeof state.startedAt === "string") &&
    typeof state.accumulatedSec === "number" &&
    (state.lastResumeAt === null || typeof state.lastResumeAt === "number") &&
    (state.feedId === null || typeof state.feedId === "string") &&
    (state.pausedAtMs === null || typeof state.pausedAtMs === "number")
  )
}

function loadStoredNursingSides(
  babyId: string,
): Record<NursingSideKey, SideNursingState> | null {
  const raw = safeGetItem(storageKey(babyId))
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null

    const sides = parsed as Record<NursingSideKey, SideNursingState>
    if (!isSideNursingState(sides.L) || !isSideNursingState(sides.R)) {
      return null
    }

    return {
      L: { ...sides.L },
      R: { ...sides.R },
    }
  } catch {
    return null
  }
}

function persistStoredNursingSides(
  babyId: string,
  sides: Record<NursingSideKey, SideNursingState>,
) {
  safeSetItem(
    storageKey(babyId),
    JSON.stringify({
      L: sides.L,
      R: sides.R,
    }),
  )
}

function removeStoredNursingSides(babyId: string) {
  safeRemoveItem(storageKey(babyId))
}

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
  if (nursingTimerCache?.babyId === babyId) {
    return nursingTimerCache.sides
  }

  const stored = loadStoredNursingSides(babyId)
  if (!stored) return null

  nursingTimerCache = { babyId, sides: stored }
  return stored
}

export function writeNursingTimerCache(
  babyId: string,
  sides: Record<NursingSideKey, SideNursingState>,
) {
  if (sides.L.status === "idle" && sides.R.status === "idle") {
    nursingTimerCache = null
    removeStoredNursingSides(babyId)
    notifyNursingTimerListeners()
    return
  }

  const snapshot = {
    L: { ...sides.L },
    R: { ...sides.R },
  }

  nursingTimerCache = {
    babyId,
    sides: snapshot,
  }
  persistStoredNursingSides(babyId, snapshot)
  notifyNursingTimerListeners()
}

export function clearNursingTimerCache() {
  const babyId = nursingTimerCache?.babyId
  nursingTimerCache = null
  if (babyId) removeStoredNursingSides(babyId)
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

type ActiveNursingFeed = {
  id: string
  occurred_at: string
  side: string | null
}

function pickLatestFeedPerSide(
  activeNursingSessions: ActiveNursingFeed[],
): Partial<Record<NursingSideKey, ActiveNursingFeed>> {
  const bySide: Partial<Record<NursingSideKey, ActiveNursingFeed>> = {}

  for (const feed of activeNursingSessions) {
    if (feed.side !== "L" && feed.side !== "R") continue

    const existing = bySide[feed.side]
    if (
      !existing ||
      new Date(feed.occurred_at).getTime() >
        new Date(existing.occurred_at).getTime()
    ) {
      bySide[feed.side] = feed
    }
  }

  return bySide
}

function pausedSideStateFromFeed(
  feed: ActiveNursingFeed,
  accumulatedSec: number,
  pausedAtMs: number,
): SideNursingState {
  return {
    status: "paused",
    startedAt: feed.occurred_at,
    accumulatedSec: Math.max(0, Math.floor(accumulatedSec)),
    lastResumeAt: null,
    feedId: feed.id,
    pausedAtMs,
  }
}

/** Infer run/pause split when timer state was lost (e.g. cleared storage). */
function reconstructNursingSidesFromActiveFeeds(
  feedsBySide: Partial<Record<NursingSideKey, ActiveNursingFeed>>,
): Record<NursingSideKey, SideNursingState> {
  const nextSides = { ...INITIAL_NURSING_SIDES }
  const left = feedsBySide.L
  const right = feedsBySide.R

  if (left && right) {
    const leftMs = new Date(left.occurred_at).getTime()
    const rightMs = new Date(right.occurred_at).getTime()

    if (leftMs >= rightMs) {
      nextSides.L = feedToSideState(left)
      nextSides.R = pausedSideStateFromFeed(
        right,
        Math.max(0, Math.floor((leftMs - rightMs) / 1000)),
        leftMs,
      )
    } else {
      nextSides.R = feedToSideState(right)
      nextSides.L = pausedSideStateFromFeed(
        left,
        Math.max(0, Math.floor((rightMs - leftMs) / 1000)),
        rightMs,
      )
    }
    return nextSides
  }

  if (left) nextSides.L = feedToSideState(left)
  if (right) nextSides.R = feedToSideState(right)

  return nextSides
}

export function mergeNursingSidesFromServer(
  prev: Record<NursingSideKey, SideNursingState>,
  activeNursingSessions: ActiveNursingFeed[],
): Record<NursingSideKey, SideNursingState> {
  const feedsBySide = pickLatestFeedPerSide(activeNursingSessions)
  const nextSides = { ...INITIAL_NURSING_SIDES }
  const unmatchedSides: NursingSideKey[] = []

  for (const sideKey of ["L", "R"] as const) {
    const feed = feedsBySide[sideKey]
    if (!feed) continue

    const prevSide = prev[sideKey]
    if (prevSide.feedId === feed.id && prevSide.status !== "idle") {
      nextSides[sideKey] = prevSide
    } else {
      unmatchedSides.push(sideKey)
    }
  }

  if (unmatchedSides.length === 0) return nextSides

  const reconstructed = reconstructNursingSidesFromActiveFeeds(feedsBySide)

  if (unmatchedSides.length === 2) {
    return reconstructed
  }

  for (const sideKey of unmatchedSides) {
    nextSides[sideKey] = reconstructed[sideKey]
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

export function isNursingSideStarted(state: SideNursingState) {
  return state.status !== "idle"
}

export function hasOngoingNursingSession(
  sides: Record<NursingSideKey, SideNursingState> | null | undefined,
) {
  if (!sides) return false
  return isNursingSideStarted(sides.L) || isNursingSideStarted(sides.R)
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
