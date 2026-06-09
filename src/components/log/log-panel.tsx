import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  BlendIcon,
  DropletOffIcon,
  DropletsIcon,
  MilkIcon,
  ToiletIcon,
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
  fromDateAndTimeValues,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/format"
import type { DiaperType, FeedType, NursingSide } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { AnimatedHeight } from "@/components/ui/animated-height"
import { DrawerHandle, DrawerHandleBar, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

export type LogPanelType = "feed" | "sleep" | "diaper" | "pump"

type LogPanelProps = {
  type: LogPanelType
  onLogged?: () => void
}

const LOG_SUBMIT_CLASS = "h-10 w-full"

type NursingSideKey = Exclude<NursingSide, "both">

type SideNursingState = {
  status: "idle" | "running" | "paused"
  startedAt: string | null
  accumulatedSec: number
  lastResumeAt: number | null
  feedId: string | null
}

const INITIAL_SIDE_NURSING_STATE: SideNursingState = {
  status: "idle",
  startedAt: null,
  accumulatedSec: 0,
  lastResumeAt: null,
  feedId: null,
}

const INITIAL_NURSING_SIDES: Record<NursingSideKey, SideNursingState> = {
  L: { ...INITIAL_SIDE_NURSING_STATE },
  R: { ...INITIAL_SIDE_NURSING_STATE },
}

function getSideElapsedSec(state: SideNursingState) {
  if (state.status === "running" && state.lastResumeAt) {
    return (
      state.accumulatedSec +
      Math.floor((Date.now() - state.lastResumeAt) / 1000)
    )
  }
  return state.accumulatedSec
}

function pauseSideState(state: SideNursingState): SideNursingState {
  if (state.status !== "running" || !state.lastResumeAt) return state
  return {
    ...state,
    status: "paused",
    accumulatedSec:
      state.accumulatedSec +
      Math.floor((Date.now() - state.lastResumeAt) / 1000),
    lastResumeAt: null,
  }
}

function resumeSideState(state: SideNursingState): SideNursingState {
  return {
    ...state,
    status: "running",
    lastResumeAt: Date.now(),
  }
}

function feedToSideState(feed: {
  id: string
  occurred_at: string
}): SideNursingState {
  return {
    status: "running",
    startedAt: feed.occurred_at,
    accumulatedSec: 0,
    lastResumeAt: new Date(feed.occurred_at).getTime(),
    feedId: feed.id,
  }
}

function isSideStarted(state: SideNursingState) {
  return state.status !== "idle"
}

function NursingSideRow({
  label,
  state,
  elapsedSec,
  onStart,
  onPause,
  onResume,
  disabled,
}: {
  label: string
  state: SideNursingState
  elapsedSec: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const isRunning = state.status === "running"
  const isPaused = state.status === "paused"

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border p-3",
        isRunning && "border-primary bg-primary/10 ring-2 ring-primary/40",
        isPaused && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="font-heading text-2xl font-semibold tabular-nums">
          {formatElapsedClock(elapsedSec)}
        </p>
      </div>
      {state.status === "idle" ? (
        <Button
          type="button"
          variant="secondary"
          onClick={onStart}
          disabled={disabled}
        >
          {t("common.start")}
        </Button>
      ) : isRunning ? (
        <Button
          type="button"
          variant="outline"
          onClick={onPause}
          disabled={disabled}
        >
          {t("common.pause")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={onResume}
          disabled={disabled}
        >
          {t("common.resume")}
        </Button>
      )}
    </div>
  )
}

function LogDateTimeFields({
  idPrefix,
  date,
  time,
  onDateChange,
  onTimeChange,
  dateLabel,
  timeLabel,
}: {
  idPrefix: string
  date: string
  time: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  dateLabel?: string
  timeLabel?: string
}) {
  const { t } = useTranslation()
  const resolvedDateLabel = dateLabel ?? t("common.date")
  const resolvedTimeLabel = timeLabel ?? t("common.time")

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={`${idPrefix}-date`}>{resolvedDateLabel}</Label>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          className="w-full min-w-0"
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={`${idPrefix}-time`}>{resolvedTimeLabel}</Label>
        <Input
          id={`${idPrefix}-time`}
          type="time"
          value={time}
          className="w-full min-w-0"
          onChange={(e) => onTimeChange(e.target.value)}
        />
      </div>
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
  const [amountMl, setAmountMl] = useState("90")
  const [nursingSides, setNursingSides] = useState(INITIAL_NURSING_SIDES)
  const [nursingTick, setNursingTick] = useState(0)

  const [diaperType, setDiaperType] = useState<DiaperType>("wet")

  const [pumpMl, setPumpMl] = useState("")
  const [pumpLeft, setPumpLeft] = useState("15")
  const [pumpRight, setPumpRight] = useState("15")

  const [activeSleepId, setActiveSleepId] = useState<string | null>(null)
  const [sleepStartedAt, setSleepStartedAt] = useState<string | null>(null)
  const [sleepElapsedSec, setSleepElapsedSec] = useState(0)

  const isNursingActive =
    isSideStarted(nursingSides.L) || isSideStarted(nursingSides.R)
  const isAnyNursingSideRunning =
    nursingSides.L.status === "running" || nursingSides.R.status === "running"

  useEffect(() => {
    if (!baby?.id) {
      setActiveSleepId(null)
      setSleepStartedAt(null)
      setNursingSides(INITIAL_NURSING_SIDES)
      return
    }
    let cancelled = false
    Promise.all([getActiveSleep(baby.id), getActiveNursingSessions(baby.id)]).then(
      ([activeSleep, activeNursingSessions]) => {
        if (cancelled) return
        setActiveSleepId(activeSleep?.id ?? null)
        setSleepStartedAt(activeSleep?.started_at ?? null)

        const nextSides = { ...INITIAL_NURSING_SIDES }
        for (const feed of activeNursingSessions) {
          if (feed.side === "L" || feed.side === "R") {
            nextSides[feed.side] = feedToSideState(feed)
          }
        }
        setNursingSides(nextSides)

        if (activeNursingSessions.length > 0) {
          setFeedType("nursing")
          setLogDate(toDateInputValue())
          setLogTime(toTimeInputValue())
        } else if (activeSleep) {
          setLogDate(toDateInputValue())
          setLogTime(toTimeInputValue())
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [baby?.id, version])

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
      setNursingSides((prev) => ({
        ...prev,
        [sideKey]: {
          status: "running",
          startedAt: log.occurred_at,
          accumulatedSec: 0,
          lastResumeAt: Date.now(),
          feedId: log.id,
        },
      }))
      toast.success(
        sideKey === "L" ? t("log.leftSideStarted") : t("log.rightSideStarted"),
      )
      notifyActivityChanged()
      onLogged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("log.startSideFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  function pauseNursingSide(sideKey: NursingSideKey) {
    setNursingSides((prev) => ({
      ...prev,
      [sideKey]: pauseSideState(prev[sideKey]),
    }))
  }

  function resumeNursingSide(sideKey: NursingSideKey) {
    setNursingSides((prev) => ({
      ...prev,
      [sideKey]: resumeSideState(prev[sideKey]),
    }))
  }

  async function handleNursingSaveAll() {
    setSubmitting(true)
    try {
      await ensureBaby()
      const endedAt = occurredAt()
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
          await endNursing(state.feedId, endedAt, undefined, durationMin)
        }),
      )

      setNursingSides(INITIAL_NURSING_SIDES)
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
      await endSleep(sleepId, occurredAt())
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

  async function handlePump(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { babyId, userId } = await ensureBaby()
      await insertPump({
        babyId,
        userId,
        occurredAt: occurredAt(),
        amountMl: pumpMl ? Number(pumpMl) : undefined,
        durationLeftMin: Number(pumpLeft) || undefined,
        durationRightMin: Number(pumpRight) || undefined,
      })
      toast.success(t("log.pumpLogged"))
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("log.pumpLogFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  void nursingTick

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
                <div className="flex flex-col gap-2">
                  <NursingSideRow
                    label={t("common.left")}
                    state={nursingSides.L}
                    elapsedSec={getSideElapsedSec(nursingSides.L)}
                    onStart={() => startNursingSide("L")}
                    onPause={() => pauseNursingSide("L")}
                    onResume={() => resumeNursingSide("L")}
                    disabled={submitting}
                  />
                  <NursingSideRow
                    label={t("common.right")}
                    state={nursingSides.R}
                    elapsedSec={getSideElapsedSec(nursingSides.R)}
                    onStart={() => startNursingSide("R")}
                    onPause={() => pauseNursingSide("R")}
                    onResume={() => resumeNursingSide("R")}
                    disabled={submitting}
                  />
                </div>
              </div>
              {isNursingActive && (
                <LogDateTimeFields
                  idPrefix="feed"
                  date={logDate}
                  time={logTime}
                  onDateChange={setLogDate}
                  onTimeChange={setLogTime}
                  dateLabel={t("log.endDate")}
                  timeLabel={t("log.endTime")}
                />
              )}
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
              <LogDateTimeFields
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
            {activeSleepId ? (
              <>
                <ElapsedTimer elapsedSec={sleepElapsedSec} />
                <LogDateTimeFields
                  idPrefix="sleep"
                  date={logDate}
                  time={logTime}
                  onDateChange={setLogDate}
                  onTimeChange={setLogTime}
                  dateLabel={t("log.endDate")}
                  timeLabel={t("log.endTime")}
                />
              </>
            ) : (
              <LogDateTimeFields
                idPrefix="sleep"
                date={logDate}
                time={logTime}
                onDateChange={setLogDate}
                onTimeChange={setLogTime}
                dateLabel={t("log.startDate")}
                timeLabel={t("log.startTime")}
              />
            )}
            {activeSleepId ? (
              <Button
                type="button"
                variant="secondary"
                className={LOG_SUBMIT_CLASS}
                onClick={handleSleepEnd}
                disabled={submitting}
              >
                {t("log.endSleep")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className={LOG_SUBMIT_CLASS}
                onClick={handleSleepStart}
                disabled={submitting}
              >
                {t("log.startSleeping")}
              </Button>
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
              <LogDateTimeFields
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
            <form onSubmit={handlePump} className="flex flex-col gap-4">
              <LogDateTimeFields
                idPrefix="pump"
                date={logDate}
                time={logTime}
                onDateChange={setLogDate}
                onTimeChange={setLogTime}
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="pump-ml">{t("log.amountMlOptional")}</Label>
                <Input
                  id="pump-ml"
                  type="number"
                  min={0}
                  value={pumpMl}
                  onChange={(e) => setPumpMl(e.target.value)}
                />
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor="pump-l">{t("log.leftMin")}</Label>
                  <Input
                    id="pump-l"
                    type="number"
                    min={0}
                    value={pumpLeft}
                    onChange={(e) => setPumpLeft(e.target.value)}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor="pump-r">{t("log.rightMin")}</Label>
                  <Input
                    id="pump-r"
                    type="number"
                    min={0}
                    value={pumpRight}
                    onChange={(e) => setPumpRight(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="submit"
                variant="secondary"
                className={LOG_SUBMIT_CLASS}
                disabled={submitting}
              >
                {t("log.logPump")}
              </Button>
            </form>
        </LogSection>
        )}
      </AnimatedHeight>
    </DrawerHandle>
  )
}
