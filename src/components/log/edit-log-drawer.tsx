import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  deleteActivity,
  updateDiaper,
  updateFeed,
  updatePump,
  updateSleep,
} from "@/lib/api/logs"
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/format"
import type {
  ActivityItem,
  DiaperType,
  FeedType,
  NursingSide,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
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
import { Textarea } from "@/components/ui/textarea"

type EditLogDrawerProps = {
  item: ActivityItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const KIND_LABELS: Record<ActivityItem["kind"], string> = {
  feed: "Feed",
  sleep: "Sleep",
  diaper: "Diaper",
  pump: "Pump",
}

export function EditLogDrawer({
  item,
  open,
  onOpenChange,
  onSaved,
}: EditLogDrawerProps) {
  const [submitting, setSubmitting] = useState(false)
  const [when, setWhen] = useState("")
  const [endWhen, setEndWhen] = useState("")
  const [notes, setNotes] = useState("")

  const [feedType, setFeedType] = useState<FeedType>("formula")
  const [amountMl, setAmountMl] = useState("")
  const [durationMin, setDurationMin] = useState("")
  const [side, setSide] = useState<NursingSide>("R")

  const [diaperType, setDiaperType] = useState<DiaperType>("wet")

  const [pumpMl, setPumpMl] = useState("")
  const [pumpLeft, setPumpLeft] = useState("")
  const [pumpRight, setPumpRight] = useState("")

  useEffect(() => {
    if (!item) return

    setNotes(item.data.notes ?? "")

    switch (item.kind) {
      case "feed":
        setWhen(toDatetimeLocalValue(new Date(item.data.occurred_at)))
        setFeedType(item.data.feed_type)
        setAmountMl(item.data.amount_ml?.toString() ?? "")
        setDurationMin(item.data.duration_min?.toString() ?? "")
        setSide(item.data.side ?? "R")
        break
      case "sleep":
        setWhen(toDatetimeLocalValue(new Date(item.data.started_at)))
        setEndWhen(
          item.data.ended_at
            ? toDatetimeLocalValue(new Date(item.data.ended_at))
            : "",
        )
        break
      case "diaper":
        setWhen(toDatetimeLocalValue(new Date(item.data.occurred_at)))
        setDiaperType(item.data.diaper_type)
        break
      case "pump":
        setWhen(toDatetimeLocalValue(new Date(item.data.occurred_at)))
        setPumpMl(item.data.amount_ml?.toString() ?? "")
        setPumpLeft(item.data.duration_left_min?.toString() ?? "")
        setPumpRight(item.data.duration_right_min?.toString() ?? "")
        break
    }
  }, [item])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!item) return

    setSubmitting(true)
    try {
      switch (item.kind) {
        case "feed":
          await updateFeed(item.data.id, {
            occurredAt: fromDatetimeLocalValue(when),
            feedType,
            amountMl:
              feedType !== "nursing" ? Number(amountMl) || null : null,
            durationMin:
              feedType === "nursing" ? Number(durationMin) || null : null,
            side: feedType === "nursing" ? side : null,
            notes: notes || null,
          })
          break
        case "sleep":
          await updateSleep(item.data.id, {
            startedAt: fromDatetimeLocalValue(when),
            endedAt: endWhen ? fromDatetimeLocalValue(endWhen) : null,
            notes: notes || null,
          })
          break
        case "diaper":
          await updateDiaper(item.data.id, {
            occurredAt: fromDatetimeLocalValue(when),
            diaperType,
            notes: notes || null,
          })
          break
        case "pump":
          await updatePump(item.data.id, {
            occurredAt: fromDatetimeLocalValue(when),
            amountMl: pumpMl ? Number(pumpMl) : null,
            durationLeftMin: Number(pumpLeft) || null,
            durationRightMin: Number(pumpRight) || null,
            notes: notes || null,
          })
          break
      }

      toast.success("Log updated")
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update log")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!item) return
    if (!confirm("Delete this log? This cannot be undone.")) return

    setSubmitting(true)
    try {
      await deleteActivity(item)
      toast.success("Log deleted")
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete log")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="flex max-h-[88vh] flex-col bg-background">
        <DrawerHeader>
          <DrawerTitle>
            Edit {item ? KIND_LABELS[item.kind] : "log"}
          </DrawerTitle>
        </DrawerHeader>

        {item && (
          <form
            onSubmit={handleSave}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4"
          >
            {item.kind === "feed" && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-when">Time</Label>
                  <Input
                    id="edit-when"
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
                      <Label htmlFor="edit-duration">Duration (min)</Label>
                      <Input
                        id="edit-duration"
                        type="number"
                        min={1}
                        value={durationMin}
                        onChange={(e) => setDurationMin(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Side</Label>
                      <Select
                        value={side}
                        onValueChange={(v) => setSide(v as NursingSide)}
                      >
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
                    <Label htmlFor="edit-amount">Amount (ml)</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      min={0}
                      value={amountMl}
                      onChange={(e) => setAmountMl(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {item.kind === "sleep" && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-sleep-start">Start time</Label>
                  <Input
                    id="edit-sleep-start"
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-sleep-end">End time (optional)</Label>
                  <Input
                    id="edit-sleep-end"
                    type="datetime-local"
                    value={endWhen}
                    onChange={(e) => setEndWhen(e.target.value)}
                  />
                </div>
              </>
            )}

            {item.kind === "diaper" && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-diaper-when">Time</Label>
                  <Input
                    id="edit-diaper-when"
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
              </>
            )}

            {item.kind === "pump" && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-pump-when">Time</Label>
                  <Input
                    id="edit-pump-when"
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-pump-ml">Amount (ml, optional)</Label>
                  <Input
                    id="edit-pump-ml"
                    type="number"
                    min={0}
                    value={pumpMl}
                    onChange={(e) => setPumpMl(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-pump-l">Left (min)</Label>
                    <Input
                      id="edit-pump-l"
                      type="number"
                      min={0}
                      value={pumpLeft}
                      onChange={(e) => setPumpLeft(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-pump-r">Right (min)</Label>
                    <Input
                      id="edit-pump-r"
                      type="number"
                      min={0}
                      value={pumpRight}
                      onChange={(e) => setPumpRight(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <DrawerFooter className="px-0">
              <Button type="submit" disabled={submitting}>
                Save changes
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={submitting}
                onClick={handleDelete}
              >
                Delete log
              </Button>
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  )
}
