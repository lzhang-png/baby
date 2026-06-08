import { useState } from "react"
import { DropletsIcon, MilkIcon, MoonIcon } from "lucide-react"
import { toast } from "sonner"

import { PumpIcon } from "@/components/icons/pump-icon"
import { useActivityRefresh } from "@/contexts/activity-refresh-context"
import { useAuth } from "@/contexts/auth-context"
import {
  endSleep,
  getActiveSleep,
  insertDiaper,
  insertFeed,
  insertPump,
  insertSleep,
} from "@/lib/api/logs"
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/format"
import type { DiaperType, FeedType, NursingSide } from "@/lib/types"
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
import { Textarea } from "@/components/ui/textarea"

type LogPanelProps = {
  onLogged?: () => void
}

const LOG_TAB_CLASS =
  "flex !h-auto min-h-0 flex-1 flex-col items-center gap-1 rounded-none border-0 bg-transparent px-2 py-2 text-[10px] font-medium leading-tight text-muted-foreground shadow-none transition-colors after:hidden hover:text-foreground data-active:bg-transparent data-active:text-primary data-active:shadow-none"

const LOG_SUBMIT_CLASS = "h-10 w-full"

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
  const [when, setWhen] = useState(toDatetimeLocalValue())
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [feedType, setFeedType] = useState<FeedType>("formula")
  const [amountMl, setAmountMl] = useState("90")
  const [durationMin, setDurationMin] = useState("20")
  const [side, setSide] = useState<NursingSide>("R")

  const [diaperType, setDiaperType] = useState<DiaperType>("wet")

  const [pumpMl, setPumpMl] = useState("")
  const [pumpLeft, setPumpLeft] = useState("15")
  const [pumpRight, setPumpRight] = useState("15")

  const [activeSleepId, setActiveSleepId] = useState<string | null>(null)

  async function ensureBaby() {
    if (!baby || !user) throw new Error("Missing baby or user")
    return { babyId: baby.id, userId: user.id }
  }

  function afterSuccess() {
    setWhen(toDatetimeLocalValue())
    notifyActivityChanged()
    onLogged?.()
  }

  async function handleFeed(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { babyId, userId } = await ensureBaby()
      await insertFeed({
        babyId,
        userId,
        occurredAt: fromDatetimeLocalValue(when),
        feedType,
        amountMl: feedType !== "nursing" ? Number(amountMl) || undefined : undefined,
        durationMin: feedType === "nursing" ? Number(durationMin) || undefined : undefined,
        side: feedType === "nursing" ? side : undefined,
        notes: notes || undefined,
      })
      toast.success("Feed logged")
      setNotes("")
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log feed")
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
        startedAt: fromDatetimeLocalValue(when),
        notes: notes || undefined,
      })
      setActiveSleepId(log.id)
      toast.success("Sleep started")
      setNotes("")
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
      await endSleep(sleepId, new Date().toISOString())
      setActiveSleepId(null)
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
        occurredAt: fromDatetimeLocalValue(when),
        diaperType,
        notes: notes || undefined,
      })
      toast.success("Diaper logged")
      setNotes("")
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
        occurredAt: fromDatetimeLocalValue(when),
        amountMl: pumpMl ? Number(pumpMl) : undefined,
        durationLeftMin: Number(pumpLeft) || undefined,
        durationRightMin: Number(pumpRight) || undefined,
        notes: notes || undefined,
      })
      toast.success("Pump logged")
      setNotes("")
      afterSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log pump")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Tabs defaultValue="feed" className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-6">
      <TabsContent value="feed" className="mt-0">
        <LogSection title="Feeding">
            <form onSubmit={handleFeed} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="feed-when">Time</Label>
                <Input
                  id="feed-when"
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </div>
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
                      <SelectItem value="nursing">Nursing</SelectItem>
                      <SelectItem value="formula">Formula</SelectItem>
                      <SelectItem value="expressed">Expressed</SelectItem>
                      <SelectItem value="donated">Donated milk</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {feedType === "nursing" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      value={durationMin}
                      onChange={(e) => setDurationMin(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Side</Label>
                    <Select value={side} onValueChange={(v) => setSide(v as NursingSide)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="L">Left</SelectItem>
                          <SelectItem value="R">Right</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
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
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="feed-notes">Notes</Label>
                <Textarea
                  id="feed-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
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
        </LogSection>
      </TabsContent>

      <TabsContent value="sleep" className="mt-0">
        <LogSection title="Sleep">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sleep-when">Start time</Label>
              <Input
                id="sleep-when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSleepStart}
                disabled={submitting}
              >
                Start sleeping
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSleepEnd}
                disabled={submitting}
              >
                End sleep now
              </Button>
            </div>
        </LogSection>
      </TabsContent>

      <TabsContent value="diaper" className="mt-0">
        <LogSection title="Diaper">
            <form onSubmit={handleDiaper} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="diaper-when">Time</Label>
                <Input
                  id="diaper-when"
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </div>
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="pump-when">Time</Label>
                <Input
                  id="pump-when"
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </div>
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
