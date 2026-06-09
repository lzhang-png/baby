import { useEffect, useState } from "react"
import { DropletsIcon, MilkIcon, MoonIcon } from "lucide-react"
import { toast } from "sonner"

import { PumpIcon } from "@/components/icons/pump-icon"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
type LogPanelProps = {
  onLogged?: () => void
}

const LOG_TAB_CLASS =
  "flex !h-auto min-h-0 flex-1 flex-col items-center gap-1 rounded-none border-0 bg-transparent px-2 py-2 text-[10px] font-medium leading-tight text-muted-foreground shadow-none transition-colors after:hidden hover:text-foreground data-active:bg-transparent data-active:text-primary data-active:shadow-none"

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
          Start
        </Button>
      ) : isRunning ? (
        <Button
          type="button"
          variant="outline"
          onClick={onPause}
          disabled={disabled}
        >
          Pause
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={onResume}
          disabled={disabled}
        >
          Resume
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
  dateLabel = "Date",
  timeLabel = "Time",
}: {
  idPrefix: string
  date: string
  time: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  dateLabel?: string
  timeLabel?: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-date`}>{dateLabel}</Label>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-time`}>{timeLabel}</Label>
        <Input
          id={`${idPrefix}-time`}
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
        />
      </div>
    </div>
  )
}

function ElapsedTimer({ elapsedSec }: { elapsedSec: number }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <p className="text-muted-foreground text-xs font-medium">Elapsed</p>
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
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-base font-medium">{title}</h2>
      {children}
    </section>
  )
}

export function LogPanel({ onLogged }: LogPanelProps) {
  const { notifyActivityChanged } = useActivityRefresh()
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
  }, [baby?.id])

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
      toast.success("Feed logged")
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log feed")
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
      toast.success(`${sideKey === "L" ? "Left" : "Right"} side started`)
      notifyActivityChanged()
      onLogged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start side")
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
        throw new Error("Start at least one side before saving")
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
        startedSides.length === 2 ? "Both sides saved" : "Nursing saved",
      )
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save nursing")
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
      toast.success("Sleep started")
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start sleep")
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
      toast.success("Sleep ended")
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end sleep")
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
      toast.success("Diaper logged")
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log diaper")
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
      toast.success("Pump logged")
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log pump")
    } finally {
      setSubmitting(false)
    }
  }

  void nursingTick

  return (
    <Tabs defaultValue="feed" className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-6">
      <TabsContent value="feed" className="mt-0">
        <LogSection title="Feeding">
          {feedType === "nursing" ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Type</Label>
                <Select
                  value={feedType}
                  onValueChange={(v) => setFeedType(v as FeedType)}
                  disabled={isNursingActive}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="formula">Formula</SelectItem>
                      <SelectItem value="expressed">Expressed</SelectItem>
                      <SelectItem value="nursing">Nursing</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Sides</Label>
                <div className="flex flex-col gap-2">
                  <NursingSideRow
                    label="Left"
                    state={nursingSides.L}
                    elapsedSec={getSideElapsedSec(nursingSides.L)}
                    onStart={() => startNursingSide("L")}
                    onPause={() => pauseNursingSide("L")}
                    onResume={() => resumeNursingSide("L")}
                    disabled={submitting}
                  />
                  <NursingSideRow
                    label="Right"
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
                  dateLabel="End date"
                  timeLabel="End time"
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
                  Stop and save
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={handleFeed} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Type</Label>
                <Select
                  value={feedType}
                  onValueChange={(v) => setFeedType(v as FeedType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="formula">Formula</SelectItem>
                      <SelectItem value="expressed">Expressed</SelectItem>
                      <SelectItem value="nursing">Nursing</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <LogDateTimeFields
                idPrefix="feed"
                date={logDate}
                time={logTime}
                onDateChange={setLogDate}
                onTimeChange={setLogTime}
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="amount">Amount (ml)</Label>
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
                Log feed
              </Button>
            </form>
          )}
        </LogSection>
      </TabsContent>

      <TabsContent value="sleep" className="mt-0">
        <LogSection title="Sleep">
            {activeSleepId ? (
              <>
                <ElapsedTimer elapsedSec={sleepElapsedSec} />
                <LogDateTimeFields
                  idPrefix="sleep"
                  date={logDate}
                  time={logTime}
                  onDateChange={setLogDate}
                  onTimeChange={setLogTime}
                  dateLabel="End date"
                  timeLabel="End time"
                />
              </>
            ) : (
              <LogDateTimeFields
                idPrefix="sleep"
                date={logDate}
                time={logTime}
                onDateChange={setLogDate}
                onTimeChange={setLogTime}
                dateLabel="Start date"
                timeLabel="Start time"
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
                End sleep
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className={LOG_SUBMIT_CLASS}
                onClick={handleSleepStart}
                disabled={submitting}
              >
                Start sleeping
              </Button>
            )}
        </LogSection>
      </TabsContent>

      <TabsContent value="diaper" className="mt-0">
        <LogSection title="Diaper">
            <form onSubmit={handleDiaper} className="flex flex-col gap-4">
              <LogDateTimeFields
                idPrefix="diaper"
                date={logDate}
                time={logTime}
                onDateChange={setLogDate}
                onTimeChange={setLogTime}
              />
              <div className="flex flex-col gap-2">
                <Label>Type</Label>
                <Select
                  value={diaperType}
                  onValueChange={(v) => setDiaperType(v as DiaperType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="wet">Wet</SelectItem>
                      <SelectItem value="dirty">Dirty</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="dry">Dry</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                variant="secondary"
                className={LOG_SUBMIT_CLASS}
                disabled={submitting}
              >
                Log diaper
              </Button>
            </form>
        </LogSection>
      </TabsContent>

      <TabsContent value="pump" className="mt-0">
        <LogSection title="Pumping">
            <form onSubmit={handlePump} className="flex flex-col gap-4">
              <LogDateTimeFields
                idPrefix="pump"
                date={logDate}
                time={logTime}
                onDateChange={setLogDate}
                onTimeChange={setLogTime}
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="pump-ml">Amount (ml, optional)</Label>
                <Input
                  id="pump-ml"
                  type="number"
                  min={0}
                  value={pumpMl}
                  onChange={(e) => setPumpMl(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pump-l">Left (min)</Label>
                  <Input
                    id="pump-l"
                    type="number"
                    min={0}
                    value={pumpLeft}
                    onChange={(e) => setPumpLeft(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pump-r">Right (min)</Label>
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
                Log pump
              </Button>
            </form>
        </LogSection>
      </TabsContent>
      </div>

      <TabsList
        variant="line"
        className="bg-background !h-auto w-full shrink-0 items-stretch justify-around gap-0 overflow-visible rounded-none border-0 p-0"
      >
        <TabsTrigger value="feed" className={LOG_TAB_CLASS}>
          <MilkIcon aria-hidden className="size-5" />
          Feed
        </TabsTrigger>
        <TabsTrigger value="sleep" className={LOG_TAB_CLASS}>
          <MoonIcon aria-hidden className="size-5" />
          Sleep
        </TabsTrigger>
        <TabsTrigger value="diaper" className={LOG_TAB_CLASS}>
          <DropletsIcon aria-hidden className="size-5" />
          Diaper
        </TabsTrigger>
        <TabsTrigger value="pump" className={LOG_TAB_CLASS}>
          <PumpIcon aria-hidden className="size-5" />
          Pump
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
