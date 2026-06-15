import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react"
import { useTranslation } from "react-i18next"
import {
  BlendIcon,
  DropletOffIcon,
  DropletsIcon,
  Loader2Icon,
  Link2Icon,
  MilkIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  ToiletIcon,
  UnlinkIcon,
} from "lucide-react"
import { toast } from "sonner"

import { BabyBottleIcon } from "@/components/icons/baby-bottle-icon"
import { MotherIcon } from "@/components/icons/mother-icon"
import { useActivityRefresh } from "@/contexts/activity-refresh-context"
import { useAuth } from "@/contexts/auth-context"
import {
  endNursing,
  endSleep,
  getActiveNursingSessions,
  getActiveSleep,
  insertDiaper,
  insertFeed,
  insertPump,
  insertSleep,
} from "@/lib/api/logs"
import {
  formatElapsedClock,
  formatElapsedClockInput,
  elapsedSecToClockDigits,
  formatTime,
  fromDateAndTimeValues,
  parseElapsedClock,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/format"
import {
  clearNursingTimerCache,
  getSideElapsedSec,
  INITIAL_NURSING_SIDES,
  mergeNursingSidesFromServer,
  pauseSideState,
  readNursingTimerCache,
  resumeSideState,
  setSideAccumulatedSec,
  writeNursingTimerCache,
  type NursingSideKey,
  type SideNursingState,
} from "@/lib/nursing-timer-session"
import {
  clearPumpTimerCache,
  getPumpSideElapsedSec,
  INITIAL_PUMP_SIDES,
  isPumpSideStarted,
  pausePumpSideState,
  readPumpTimerCache,
  resumePumpSideState,
  writePumpTimerCache,
  type SidePumpState,
} from "@/lib/pump-timer-session"
import type { DiaperType, FeedType } from "@/lib/types"
import { parseOptionalMlInput } from "@/lib/pump-side-amounts"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { DateTimeFields } from "@/components/log/date-time-fields"
import { AnimatedHeight } from "@/components/ui/animated-height"
import { DrawerHandle, DrawerHandleBar, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

export type LogPanelType = "feed" | "sleep" | "diaper" | "pump"

type LogPanelProps = {
  type: LogPanelType
  onLogged?: () => void
}

const LOG_SUBMIT_CLASS = "h-10 w-full"

function isSideStarted(state: SideNursingState) {
  return state.status !== "idle"
}

function otherNursingSide(sideKey: NursingSideKey): NursingSideKey {
  return sideKey === "L" ? "R" : "L"
}

function activateNursingSide(
  prev: Record<NursingSideKey, SideNursingState>,
  sideKey: NursingSideKey,
  nextActive: SideNursingState,
): Record<NursingSideKey, SideNursingState> {
  const otherKey = otherNursingSide(sideKey)
  return {
    ...prev,
    [otherKey]: pauseSideState(prev[otherKey]),
    [sideKey]: nextActive,
  }
}

type SideTimerStatus = SideNursingState["status"] | SidePumpState["status"]

function SideTimerRow({
  label,
  state,
  elapsedSec,
  onStart,
  onPause,
  onResume,
  disabled,
  compact,
}: {
  label: string
  state: { status: SideTimerStatus }
  elapsedSec: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
  disabled?: boolean
  compact?: boolean
}) {
  const { t } = useTranslation()
  const isRunning = state.status === "running"
  const isPaused = state.status === "paused"

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        compact
          ? "flex h-full min-w-0 flex-col gap-2"
          : "flex items-center justify-between gap-3",
        isRunning && "border-primary bg-primary/10 ring-2 ring-primary/40",
        isPaused && "border-primary/40 bg-primary/5",
      )}
    >
      <div className={cn("min-w-0", compact && "flex-1")}>
        <p className="text-sm font-medium">{label}</p>
        <p
          className={cn(
            "font-heading font-semibold tabular-nums",
            compact ? "text-xl" : "text-2xl",
          )}
        >
          {formatElapsedClock(elapsedSec)}
        </p>
      </div>
      {state.status === "idle" ? (
        <Button
          type="button"
          variant="secondary"
          className={compact ? "mt-auto w-full" : undefined}
          onClick={onStart}
          disabled={disabled}
        >
          <PlayIcon data-icon="inline-start" />
          {t("common.start")}
        </Button>
      ) : isRunning ? (
        <Button
          type="button"
          variant="outline"
          className={compact ? "mt-auto w-full" : undefined}
          onClick={onPause}
          disabled={disabled}
        >
          <PauseIcon data-icon="inline-start" />
          {t("common.pause")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className={compact ? "mt-auto w-full" : undefined}
          onClick={onResume}
          disabled={disabled}
        >
          <PlayIcon data-icon="inline-start" />
          {t("common.resume")}
        </Button>
      )}
    </div>
  )
}

function NursingSideTimerRow({
  sideKey,
  label,
  state,
  elapsedSec,
  onStart,
  onPause,
  onResume,
  onDurationChange,
  disabled,
}: {
  sideKey: NursingSideKey
  label: string
  state: SideNursingState
  elapsedSec: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onDurationChange: (elapsedSec: number) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationDigits, setDurationDigits] = useState("")
  const durationInputRef = useRef<HTMLInputElement>(null)
  const isRunning = state.status === "running"
  const isPaused = state.status === "paused"
  const durationInputId = `nursing-${sideKey}-duration`

  useEffect(() => {
    if (state.status !== "paused") {
      setEditingDuration(false)
    }
  }, [state.status])

  useEffect(() => {
    if (!editingDuration) return
    durationInputRef.current?.focus()
    durationInputRef.current?.select()
  }, [editingDuration])

  function beginDurationEdit() {
    setDurationDigits(elapsedSecToClockDigits(elapsedSec))
    setEditingDuration(true)
  }

  function commitDurationEdit() {
    const parsed = parseElapsedClock(
      formatElapsedClockInput(durationDigits),
    )
    if (parsed == null) {
      setEditingDuration(false)
      return
    }

    onDurationChange(parsed)
    setEditingDuration(false)
  }

  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col gap-2 rounded-lg border p-3",
        isRunning && "border-primary bg-primary/10 ring-2 ring-primary/40",
        isPaused && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center gap-1">
          {isPaused && editingDuration ? (
            <Input
              ref={durationInputRef}
              id={durationInputId}
              type="text"
              inputMode="numeric"
              className="font-heading h-9 min-w-0 flex-1 text-xl font-semibold tabular-nums"
              value={formatElapsedClockInput(durationDigits)}
              onChange={(event) => {
                setDurationDigits(
                  event.target.value.replace(/\D/g, "").slice(-4),
                )
              }}
              onBlur={commitDurationEdit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitDurationEdit()
                }
                if (event.key === "Escape") {
                  setEditingDuration(false)
                }
                if (
                  event.key.length === 1 &&
                  !/\d/.test(event.key)
                ) {
                  event.preventDefault()
                }
              }}
              disabled={disabled}
              aria-label={t("log.elapsed")}
            />
          ) : (
            <>
              <p className="font-heading text-xl font-semibold tabular-nums">
                {formatElapsedClockInput(elapsedSecToClockDigits(elapsedSec))}
              </p>
              {isPaused && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground size-8 shrink-0"
                  onClick={beginDurationEdit}
                  disabled={disabled}
                  aria-label={t("common.edit")}
                >
                  <PencilIcon className="size-4" />
                </Button>
              )}
            </>
          )}
        </div>
        {state.startedAt && (
          <p className="text-muted-foreground mt-1 text-xs tabular-nums">
            {t("log.startTime")}: {formatTime(state.startedAt)}
          </p>
        )}
      </div>
      {state.status === "idle" ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-auto w-full"
          onClick={onStart}
          disabled={disabled}
        >
          <PlayIcon data-icon="inline-start" />
          {t("common.start")}
        </Button>
      ) : isRunning ? (
        <Button
          type="button"
          variant="outline"
          className="mt-auto w-full"
          onClick={onPause}
          disabled={disabled}
        >
          <PauseIcon data-icon="inline-start" />
          {t("common.pause")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="mt-auto w-full"
          onClick={onResume}
          disabled={disabled}
        >
          <PlayIcon data-icon="inline-start" />
          {t("common.resume")}
        </Button>
      )}
    </div>
  )
}

function ElapsedTimer({ elapsedSec }: { elapsedSec: number }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <p className="text-muted-foreground text-xs font-medium">{t("log.elapsed")}</p>
      <p className="font-heading text-3xl font-semibold tabular-nums">
        {formatElapsedClock(elapsedSec)}
      </p>
    </div>
  )
}

function LogSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col">
      <DrawerHeader>
        <DrawerTitle>{title}</DrawerTitle>
      </DrawerHeader>
      <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
    </section>
  )
}

export function LogPanel({ type, onLogged }: LogPanelProps) {
  const { t } = useTranslation()
  const { version, notifyActivityChanged } = useActivityRefresh()
  const { user, baby } = useAuth()
  const [logDate, setLogDate] = useState(toDateInputValue)
  const [logTime, setLogTime] = useState(toTimeInputValue)
  const [submitting, setSubmitting] = useState(false)

  const [feedType, setFeedType] = useState<FeedType>("formula")
  const [amountMl, setAmountMl] = useState("")
  const [nursingSides, setNursingSides] = useState(INITIAL_NURSING_SIDES)
  const [nursingTick, setNursingTick] = useState(0)

  const setNursingSidesPersisted = useCallback(
    (action: SetStateAction<Record<NursingSideKey, SideNursingState>>) => {
      setNursingSides((prev) => {
        const next = typeof action === "function" ? action(prev) : action
        if (baby?.id) writeNursingTimerCache(baby.id, next)
        return next
      })
    },
    [baby?.id],
  )

  const [diaperType, setDiaperType] = useState<DiaperType>("wet")

  const [pumpLeftMl, setPumpLeftMl] = useState("")
  const [pumpRightMl, setPumpRightMl] = useState("")
  const [pumpSides, setPumpSides] = useState(INITIAL_PUMP_SIDES)
  const [pumpSidesLinked, setPumpSidesLinked] = useState(true)
  const [pumpTick, setPumpTick] = useState(0)

  const setPumpSidesPersisted = useCallback(
    (action: SetStateAction<Record<NursingSideKey, SidePumpState>>) => {
      setPumpSides((prev) => {
        const next = typeof action === "function" ? action(prev) : action
        if (baby?.id) writePumpTimerCache(baby.id, next)
        return next
      })
    },
    [baby?.id],
  )

  const [activeSleepId, setActiveSleepId] = useState<string | null>(null)
  const [sleepStartedAt, setSleepStartedAt] = useState<string | null>(null)
  const [sleepElapsedSec, setSleepElapsedSec] = useState(0)
  const [sessionsLoading, setSessionsLoading] = useState(true)

  const isNursingActive =
    isSideStarted(nursingSides.L) || isSideStarted(nursingSides.R)
  const isAnyNursingSideRunning =
    nursingSides.L.status === "running" || nursingSides.R.status === "running"
  const isPumpActive =
    isPumpSideStarted(pumpSides.L) || isPumpSideStarted(pumpSides.R)
  const isAnyPumpSideRunning =
    pumpSides.L.status === "running" || pumpSides.R.status === "running"

  useEffect(() => {
    if (!baby?.id) {
      setActiveSleepId(null)
      setSleepStartedAt(null)
      setSessionsLoading(false)
      clearNursingTimerCache()
      clearPumpTimerCache()
      setNursingSides(INITIAL_NURSING_SIDES)
      setPumpSides(INITIAL_PUMP_SIDES)
      return
    }

    const cached = readNursingTimerCache(baby.id)
    if (cached) setNursingSidesPersisted(cached)

    const pumpCached = readPumpTimerCache(baby.id)
    if (pumpCached) setPumpSidesPersisted(pumpCached)

    let cancelled = false
    setSessionsLoading(true)
    Promise.all([getActiveSleep(baby.id), getActiveNursingSessions(baby.id)])
      .then(([activeSleep, activeNursingSessions]) => {
        if (cancelled) return
        setActiveSleepId(activeSleep?.id ?? null)
        setSleepStartedAt(activeSleep?.started_at ?? null)

        const seed =
          readNursingTimerCache(baby.id) ?? INITIAL_NURSING_SIDES
        setNursingSidesPersisted(
          mergeNursingSidesFromServer(seed, activeNursingSessions),
        )

        if (activeNursingSessions.length > 0) {
          setFeedType("nursing")
          setLogDate(toDateInputValue())
          setLogTime(toTimeInputValue())
        } else if (activeSleep) {
          setLogDate(toDateInputValue())
          setLogTime(toTimeInputValue())
        }
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [baby?.id, version, setNursingSidesPersisted, setPumpSidesPersisted])

  useEffect(() => {
    if (!isAnyPumpSideRunning) return
    const id = window.setInterval(() => {
      setPumpTick((tick) => tick + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [isAnyPumpSideRunning])

  useEffect(() => {
    if (!isAnyNursingSideRunning) return
    const id = window.setInterval(() => {
      setNursingTick((tick) => tick + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [isAnyNursingSideRunning])

  useEffect(() => {
    if (!sleepStartedAt) {
      setSleepElapsedSec(0)
      return
    }

    const startedAt = sleepStartedAt

    function tick() {
      const startMs = new Date(startedAt).getTime()
      setSleepElapsedSec(
        Math.max(0, Math.floor((Date.now() - startMs) / 1000)),
      )
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [sleepStartedAt])

  async function ensureBaby() {
    if (!baby || !user) throw new Error("Missing baby or user")
    return { babyId: baby.id, userId: user.id }
  }

  function afterSuccess() {
    setLogDate(toDateInputValue())
    setLogTime(toTimeInputValue())
    notifyActivityChanged()
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    onLogged?.()
  }

  function occurredAt() {
    return fromDateAndTimeValues(logDate, logTime)
  }

  async function handleFeed(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { babyId, userId } = await ensureBaby()
      await insertFeed({
        babyId,
        userId,
        occurredAt: occurredAt(),
        feedType,
        amountMl: Number(amountMl) || undefined,
      })
      toast.success(t("log.feedLogged"))
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("log.feedLogFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  async function startNursingSide(sideKey: NursingSideKey) {
    setSubmitting(true)
    try {
      const { babyId, userId } = await ensureBaby()
      const startedAt = new Date().toISOString()
      const log = await insertFeed({
        babyId,
        userId,
        occurredAt: startedAt,
        feedType: "nursing",
        side: sideKey,
      })
      setNursingSidesPersisted((prev) =>
        activateNursingSide(prev, sideKey, {
          status: "running",
          startedAt: log.occurred_at,
          accumulatedSec: 0,
          lastResumeAt: Date.now(),
          feedId: log.id,
          pausedAtMs: null,
        }),
      )
      toast.success(
        sideKey === "L" ? t("log.leftSideStarted") : t("log.rightSideStarted"),
      )
      notifyActivityChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("log.startSideFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  function pauseNursingSide(sideKey: NursingSideKey) {
    setNursingSidesPersisted((prev) => ({
      ...prev,
      [sideKey]: pauseSideState(prev[sideKey]),
    }))
  }

  function resumeNursingSide(sideKey: NursingSideKey) {
    setNursingSidesPersisted((prev) =>
      activateNursingSide(prev, sideKey, resumeSideState(prev[sideKey])),
    )
  }

  function updateNursingSideDuration(
    sideKey: NursingSideKey,
    elapsedSec: number,
  ) {
    setNursingSidesPersisted((prev) => ({
      ...prev,
      [sideKey]: setSideAccumulatedSec(prev[sideKey], elapsedSec),
    }))
  }

  async function handleNursingSaveAll() {
    setSubmitting(true)
    try {
      await ensureBaby()
      const endedAt = new Date().toISOString()
      const pausedSides = {
        L: pauseSideState(nursingSides.L),
        R: pauseSideState(nursingSides.R),
      }
      const startedSides = (["L", "R"] as const).filter((sideKey) =>
        isSideStarted(pausedSides[sideKey]),
      )
      if (startedSides.length === 0) {
        throw new Error(t("log.startOneSide"))
      }

      await Promise.all(
        startedSides.map(async (sideKey) => {
          const state = pausedSides[sideKey]
          if (!state.feedId) {
            throw new Error(`Missing feed for ${sideKey} side`)
          }
          const durationMin = Math.max(
            1,
            Math.round(getSideElapsedSec(state) / 60),
          )
          await endNursing(
            state.feedId,
            endedAt,
            undefined,
            durationMin,
            startedSides.length > 1 ? endedAt : undefined,
          )
        }),
      )

      clearNursingTimerCache()
      setNursingSidesPersisted(INITIAL_NURSING_SIDES)
      toast.success(
        startedSides.length === 2
          ? t("log.bothSidesSaved")
          : t("log.nursingSaved"),
      )
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("log.nursingSaveFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSleepStart() {
    setSubmitting(true)
    try {
      const { babyId, userId } = await ensureBaby()
      const log = await insertSleep({
        babyId,
        userId,
        startedAt: occurredAt(),
      })
      setActiveSleepId(log.id)
      setSleepStartedAt(log.started_at)
      toast.success(t("log.sleepStarted"))
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("log.sleepStartFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSleepEnd() {
    setSubmitting(true)
    try {
      const { babyId } = await ensureBaby()
      let sleepId = activeSleepId
      if (!sleepId) {
        const active = await getActiveSleep(babyId)
        sleepId = active?.id ?? null
      }
      if (!sleepId) throw new Error("No active sleep to end")
      await endSleep(sleepId, new Date().toISOString())
      setActiveSleepId(null)
      setSleepStartedAt(null)
      toast.success(t("log.sleepEnded"))
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("log.sleepEndFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDiaper(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { babyId, userId } = await ensureBaby()
      await insertDiaper({
        babyId,
        userId,
        occurredAt: occurredAt(),
        diaperType,
      })
      toast.success(t("log.diaperLogged"))
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("log.diaperLogFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  function startPumpSide(sideKey: NursingSideKey) {
    setPumpSidesPersisted((prev) => {
      if (prev[sideKey].status !== "idle") return prev

      const startedAt = new Date().toISOString()
      const runningSide: SidePumpState = {
        status: "running",
        startedAt,
        accumulatedSec: 0,
        lastResumeAt: Date.now(),
        pausedAtMs: null,
      }

      if (!pumpSidesLinked) {
        return { ...prev, [sideKey]: runningSide }
      }

      const otherKey: NursingSideKey = sideKey === "L" ? "R" : "L"
      const next = { ...prev, [sideKey]: runningSide }
      if (prev[otherKey].status === "idle") {
        next[otherKey] = runningSide
      }
      return next
    })
  }

  function pausePumpSide(sideKey: NursingSideKey) {
    setPumpSidesPersisted((prev) => {
      if (!pumpSidesLinked) {
        return {
          ...prev,
          [sideKey]: pausePumpSideState(prev[sideKey]),
        }
      }

      const otherKey: NursingSideKey = sideKey === "L" ? "R" : "L"
      const next = {
        ...prev,
        [sideKey]: pausePumpSideState(prev[sideKey]),
      }
      if (prev[otherKey].status === "running") {
        next[otherKey] = pausePumpSideState(prev[otherKey])
      }
      return next
    })
  }

  function resumePumpSide(sideKey: NursingSideKey) {
    setPumpSidesPersisted((prev) => {
      if (!pumpSidesLinked) {
        return {
          ...prev,
          [sideKey]: resumePumpSideState(prev[sideKey]),
        }
      }

      const otherKey: NursingSideKey = sideKey === "L" ? "R" : "L"
      const next = {
        ...prev,
        [sideKey]: resumePumpSideState(prev[sideKey]),
      }
      if (prev[otherKey].status === "paused") {
        next[otherKey] = resumePumpSideState(prev[otherKey])
      }
      return next
    })
  }

  function durationMinFromSec(seconds: number) {
    return seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : undefined
  }

  async function handlePumpSaveAll() {
    setSubmitting(true)
    try {
      const { babyId, userId } = await ensureBaby()
      const pausedSides = {
        L: pausePumpSideState(pumpSides.L),
        R: pausePumpSideState(pumpSides.R),
      }
      const startedSides = (["L", "R"] as const).filter((sideKey) =>
        isPumpSideStarted(pausedSides[sideKey]),
      )
      if (startedSides.length === 0) {
        throw new Error(t("log.startOneSide"))
      }

      const leftSec = getPumpSideElapsedSec(pausedSides.L)
      const rightSec = getPumpSideElapsedSec(pausedSides.R)
      const startedAts = startedSides
        .map((sideKey) => pausedSides[sideKey].startedAt)
        .filter((value): value is string => value != null)
        .sort()

      await insertPump({
        babyId,
        userId,
        occurredAt: startedAts[0] ?? new Date().toISOString(),
        amountLeftMl: parseOptionalMlInput(pumpLeftMl) ?? undefined,
        amountRightMl: parseOptionalMlInput(pumpRightMl) ?? undefined,
        durationLeftMin: durationMinFromSec(leftSec),
        durationRightMin: durationMinFromSec(rightSec),
      })

      clearPumpTimerCache()
      setPumpSidesPersisted(INITIAL_PUMP_SIDES)
      setPumpLeftMl("")
      setPumpRightMl("")
      toast.success(t("log.pumpLogged"))
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("log.pumpLogFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  function handlePumpDiscard() {
    if (!confirm(t("log.discardSessionConfirm"))) return

    clearPumpTimerCache()
    setPumpSidesPersisted(INITIAL_PUMP_SIDES)
    setPumpLeftMl("")
    setPumpRightMl("")
    toast.success(t("log.sessionDiscarded"))
    afterSuccess()
  }

  void nursingTick
  void pumpTick

  return (
    <DrawerHandle className="min-w-0 flex-col">
      <div className="flex w-full justify-center py-2">
        <DrawerHandleBar />
      </div>
      <AnimatedHeight className="min-w-0 shrink-0 overflow-x-hidden">
        {type === "feed" && (
        <LogSection title={t("log.feeding")}>
          {feedType === "nursing" ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("common.type")}</Label>
                <SegmentedControl
                  value={feedType}
                  onValueChange={setFeedType}
                  disabled={isNursingActive}
                  options={[
                    {
                      value: "formula",
                      label: t("log.formula"),
                      icon: MilkIcon,
                      iconClassName: "text-sky-400",
                    },
                    {
                      value: "expressed",
                      label: t("log.expressed"),
                      icon: BabyBottleIcon,
                      iconClassName: "text-sky-400",
                    },
                    {
                      value: "nursing",
                      label: t("log.nursing"),
                      icon: MotherIcon,
                      iconClassName: "text-sky-400",
                    },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("log.sides")}</Label>
                <div className="grid grid-cols-2 items-stretch gap-2">
                  <NursingSideTimerRow
                    sideKey="L"
                    label={t("common.left")}
                    state={nursingSides.L}
                    elapsedSec={getSideElapsedSec(nursingSides.L)}
                    onStart={() => startNursingSide("L")}
                    onPause={() => pauseNursingSide("L")}
                    onResume={() => resumeNursingSide("L")}
                    onDurationChange={(elapsedSec) =>
                      updateNursingSideDuration("L", elapsedSec)
                    }
                    disabled={submitting}
                  />
                  <NursingSideTimerRow
                    sideKey="R"
                    label={t("common.right")}
                    state={nursingSides.R}
                    elapsedSec={getSideElapsedSec(nursingSides.R)}
                    onStart={() => startNursingSide("R")}
                    onPause={() => pauseNursingSide("R")}
                    onResume={() => resumeNursingSide("R")}
                    onDurationChange={(elapsedSec) =>
                      updateNursingSideDuration("R", elapsedSec)
                    }
                    disabled={submitting}
                  />
                </div>
              </div>
              {isNursingActive && (
                <Button
                  type="button"
                  variant="secondary"
                  className={LOG_SUBMIT_CLASS}
                  onClick={handleNursingSaveAll}
                  disabled={submitting}
                >
                  {t("log.stopAndSave")}
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={handleFeed} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("common.type")}</Label>
                <SegmentedControl
                  value={feedType}
                  onValueChange={setFeedType}
                  options={[
                    {
                      value: "formula",
                      label: t("log.formula"),
                      icon: MilkIcon,
                      iconClassName: "text-sky-400",
                    },
                    {
                      value: "expressed",
                      label: t("log.expressed"),
                      icon: BabyBottleIcon,
                      iconClassName: "text-sky-400",
                    },
                    {
                      value: "nursing",
                      label: t("log.nursing"),
                      icon: MotherIcon,
                      iconClassName: "text-sky-400",
                    },
                  ]}
                />
              </div>
              <DateTimeFields
                idPrefix="feed"
                date={logDate}
                time={logTime}
                onDateChange={setLogDate}
                onTimeChange={setLogTime}
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="amount">{t("log.amountMl")}</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  value={amountMl}
                  onChange={(e) => setAmountMl(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                className={LOG_SUBMIT_CLASS}
                disabled={submitting}
              >
                {t("log.logFeed")}
              </Button>
            </form>
          )}
        </LogSection>
        )}

        {type === "sleep" && (
        <LogSection title={t("log.sleep")}>
            {sessionsLoading ? (
              <div
                className="text-muted-foreground flex justify-center py-8"
                role="status"
                aria-live="polite"
              >
                <Loader2Icon className="size-6 animate-spin" aria-hidden />
              </div>
            ) : activeSleepId ? (
              <>
                <ElapsedTimer elapsedSec={sleepElapsedSec} />
                <Button
                  type="button"
                  variant="secondary"
                  className={LOG_SUBMIT_CLASS}
                  onClick={handleSleepEnd}
                  disabled={submitting}
                >
                  {t("log.endSleep")}
                </Button>
              </>
            ) : (
              <>
                <DateTimeFields
                  idPrefix="sleep"
                  date={logDate}
                  time={logTime}
                  onDateChange={setLogDate}
                  onTimeChange={setLogTime}
                  dateLabel={t("log.startDate")}
                  timeLabel={t("log.startTime")}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className={LOG_SUBMIT_CLASS}
                  onClick={handleSleepStart}
                  disabled={submitting}
                >
                  {t("log.startSleeping")}
                </Button>
              </>
            )}
        </LogSection>
        )}

        {type === "diaper" && (
        <LogSection title={t("log.diaper")}>
            <form onSubmit={handleDiaper} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("common.type")}</Label>
                <SegmentedControl
                  value={diaperType}
                  onValueChange={setDiaperType}
                  options={[
                    {
                      value: "wet",
                      label: t("log.wet"),
                      icon: DropletsIcon,
                      iconClassName: "text-amber-700",
                    },
                    {
                      value: "dirty",
                      label: t("log.dirty"),
                      icon: ToiletIcon,
                      iconClassName: "text-amber-700",
                    },
                    {
                      value: "mixed",
                      label: t("log.mixed"),
                      icon: BlendIcon,
                      iconClassName: "text-amber-700",
                    },
                    {
                      value: "dry",
                      label: t("log.dry"),
                      icon: DropletOffIcon,
                      iconClassName: "text-amber-700",
                    },
                  ]}
                />
              </div>
              <DateTimeFields
                idPrefix="diaper"
                date={logDate}
                time={logTime}
                onDateChange={setLogDate}
                onTimeChange={setLogTime}
              />
              <Button
                type="submit"
                variant="secondary"
                className={LOG_SUBMIT_CLASS}
                disabled={submitting}
              >
                {t("log.logDiaper")}
              </Button>
            </form>
        </LogSection>
        )}

        {type === "pump" && (
        <LogSection title={t("log.pumping")}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("log.sides")}</Label>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5">
                  <SideTimerRow
                    label={t("common.left")}
                    state={pumpSides.L}
                    elapsedSec={getPumpSideElapsedSec(pumpSides.L)}
                    onStart={() => startPumpSide("L")}
                    onPause={() => pausePumpSide("L")}
                    onResume={() => resumePumpSide("L")}
                    disabled={submitting}
                    compact
                  />
                  <div className="flex items-center self-center px-0.5">
                    <Button
                      type="button"
                      variant={pumpSidesLinked ? "secondary" : "ghost"}
                      size="icon"
                      className={cn(
                        "size-9 shrink-0",
                        pumpSidesLinked && "text-primary",
                      )}
                      onClick={() => setPumpSidesLinked((linked) => !linked)}
                      disabled={submitting}
                      aria-label={
                        pumpSidesLinked
                          ? t("log.unlinkPumpSides")
                          : t("log.linkPumpSides")
                      }
                      aria-pressed={pumpSidesLinked}
                    >
                      {pumpSidesLinked ? (
                        <Link2Icon className="size-4" aria-hidden />
                      ) : (
                        <UnlinkIcon className="size-4" aria-hidden />
                      )}
                    </Button>
                  </div>
                  <SideTimerRow
                    label={t("common.right")}
                    state={pumpSides.R}
                    elapsedSec={getPumpSideElapsedSec(pumpSides.R)}
                    onStart={() => startPumpSide("R")}
                    onPause={() => pausePumpSide("R")}
                    onResume={() => resumePumpSide("R")}
                    disabled={submitting}
                    compact
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pump-left-ml">{t("log.leftAmountMl")}</Label>
                  <Input
                    id="pump-left-ml"
                    type="number"
                    min={0}
                    value={pumpLeftMl}
                    onChange={(e) => setPumpLeftMl(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pump-right-ml">{t("log.rightAmountMl")}</Label>
                  <Input
                    id="pump-right-ml"
                    type="number"
                    min={0}
                    value={pumpRightMl}
                    onChange={(e) => setPumpRightMl(e.target.value)}
                  />
                </div>
              </div>
              {isPumpActive && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    className={LOG_SUBMIT_CLASS}
                    onClick={handlePumpDiscard}
                    disabled={submitting}
                  >
                    {t("log.discard")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className={LOG_SUBMIT_CLASS}
                    onClick={handlePumpSaveAll}
                    disabled={submitting}
                  >
                    {t("log.stopAndSave")}
                  </Button>
                </div>
              )}
            </div>
        </LogSection>
        )}
      </AnimatedHeight>
    </DrawerHandle>
  )
}
