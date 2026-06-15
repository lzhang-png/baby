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
import {
  updateDiaper,
  updateFeed,
  updatePump,
  updateSleep,
} from "@/lib/api/logs"
import { DateTimeFields } from "@/components/log/date-time-fields"
import {
  fromDateAndTimeValues,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/format"
import { enrichPumpLog, parseOptionalMlInput } from "@/lib/pump-side-amounts"
import type { SavedNursingGroup } from "@/lib/nursing-timeline"
import type {
  ActivityItem,
  DiaperType,
  FeedType,
  NursingSide,
} from "@/lib/types"
import { AnimatedHeight } from "@/components/ui/animated-height"
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
import { SegmentedControl } from "@/components/ui/segmented-control"

type EditLogDrawerProps = {
  item: ActivityItem | null
  nursingGroup?: SavedNursingGroup
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function EditLogDrawer({
  item,
  nursingGroup,
  open,
  onOpenChange,
  onSaved,
}: EditLogDrawerProps) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const kindLabels: Record<ActivityItem["kind"], string> = {
    feed: t("log.editFeed"),
    sleep: t("log.editSleep"),
    diaper: t("log.editDiaper"),
    pump: t("log.editPump"),
  }
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [notes, setNotes] = useState("")

  const [feedType, setFeedType] = useState<FeedType>("formula")
  const [amountMl, setAmountMl] = useState("")
  const [durationMin, setDurationMin] = useState("")
  const [side, setSide] = useState<NursingSide>("R")
  const [nursingLeftDuration, setNursingLeftDuration] = useState("")
  const [nursingRightDuration, setNursingRightDuration] = useState("")

  const [diaperType, setDiaperType] = useState<DiaperType>("wet")

  const [pumpLeftMl, setPumpLeftMl] = useState("")
  const [pumpRightMl, setPumpRightMl] = useState("")
  const [pumpLeft, setPumpLeft] = useState("")
  const [pumpRight, setPumpRight] = useState("")

  useEffect(() => {
    if (!item) return

    setNotes(item.data.notes ?? "")

    switch (item.kind) {
      case "feed": {
        const occurredAt = new Date(item.data.occurred_at)
        setDate(toDateInputValue(occurredAt))
        setTime(toTimeInputValue(occurredAt))
        setFeedType(
          item.data.feed_type === "donated" ? "formula" : item.data.feed_type,
        )
        setAmountMl(item.data.amount_ml?.toString() ?? "")
        setDurationMin(item.data.duration_min?.toString() ?? "")
        setSide(item.data.side ?? "R")
        if (item.data.feed_type === "nursing" && nursingGroup) {
          setNursingLeftDuration(
            nursingGroup.left?.duration_min?.toString() ?? "",
          )
          setNursingRightDuration(
            nursingGroup.right?.duration_min?.toString() ?? "",
          )
        } else {
          setNursingLeftDuration("")
          setNursingRightDuration("")
        }
        break
      }
      case "sleep": {
        const startedAt = new Date(item.data.started_at)
        setDate(toDateInputValue(startedAt))
        setTime(toTimeInputValue(startedAt))
        if (item.data.ended_at) {
          const endedAt = new Date(item.data.ended_at)
          setEndDate(toDateInputValue(endedAt))
          setEndTime(toTimeInputValue(endedAt))
        } else {
          setEndDate("")
          setEndTime("")
        }
        break
      }
      case "diaper": {
        const occurredAt = new Date(item.data.occurred_at)
        setDate(toDateInputValue(occurredAt))
        setTime(toTimeInputValue(occurredAt))
        setDiaperType(item.data.diaper_type)
        break
      }
      case "pump": {
        const pump = enrichPumpLog(item.data)
        const occurredAt = new Date(pump.occurred_at)
        setDate(toDateInputValue(occurredAt))
        setTime(toTimeInputValue(occurredAt))
        setPumpLeftMl(pump.amount_left_ml?.toString() ?? "")
        setPumpRightMl(pump.amount_right_ml?.toString() ?? "")
        setPumpLeft(pump.duration_left_min?.toString() ?? "")
        setPumpRight(pump.duration_right_min?.toString() ?? "")
        break
      }
    }
  }, [item, nursingGroup])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!item) return

    setSubmitting(true)
    try {
      const occurredAt = fromDateAndTimeValues(date, time)
      const endedAt =
        endDate && endTime ? fromDateAndTimeValues(endDate, endTime) : null

      switch (item.kind) {
        case "feed":
          if (feedType === "nursing" && nursingGroup) {
            await Promise.all(
              (
                [
                  {
                    feed: nursingGroup.left,
                    sideKey: "L" as const,
                    durationMin: Number(nursingLeftDuration) || null,
                  },
                  {
                    feed: nursingGroup.right,
                    sideKey: "R" as const,
                    durationMin: Number(nursingRightDuration) || null,
                  },
                ] as const
              )
                .filter(
                  (entry): entry is typeof entry & { feed: NonNullable<typeof entry.feed> } =>
                    entry.feed != null,
                )
                .map((entry) =>
                  updateFeed(entry.feed.id, {
                    occurredAt:
                      entry.feed.id === item.data.id
                        ? occurredAt
                        : entry.feed.occurred_at,
                    feedType: "nursing",
                    amountMl: entry.feed.amount_ml,
                    durationMin: entry.durationMin,
                    side: entry.sideKey,
                    notes: entry.feed.notes,
                  }),
                ),
            )
          } else {
            await updateFeed(item.data.id, {
              occurredAt,
              feedType,
              amountMl:
                feedType !== "nursing" ? Number(amountMl) || null : null,
              durationMin:
                feedType === "nursing" ? Number(durationMin) || null : null,
              side: feedType === "nursing" ? side : null,
              notes: notes || null,
            })
          }
          break
        case "sleep":
          await updateSleep(item.data.id, {
            startedAt: occurredAt,
            endedAt,
            notes: notes || null,
          })
          break
        case "diaper":
          await updateDiaper(item.data.id, {
            occurredAt,
            diaperType,
            notes: notes || null,
          })
          break
        case "pump":
          await updatePump(item.data.id, {
            occurredAt,
            amountLeftMl: parseOptionalMlInput(pumpLeftMl),
            amountRightMl: parseOptionalMlInput(pumpRightMl),
            durationLeftMin: Number(pumpLeft) || null,
            durationRightMin: Number(pumpRight) || null,
            notes: notes || null,
          })
          break
      }

      toast.success(t("log.logUpdated"))
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("log.logUpdateFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="flex max-h-[88vh] flex-col bg-background">
        <DrawerHeader>
          <DrawerTitle>
            {item ? kindLabels[item.kind] : t("log.editLog")}
          </DrawerTitle>
        </DrawerHeader>

        {item && (
          <form
            onSubmit={handleSave}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4"
          >
            <AnimatedHeight>
            <div className="flex flex-col gap-4">
            {item.kind === "feed" && (
              <>
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
                  idPrefix="edit-feed"
                  date={date}
                  time={time}
                  onDateChange={setDate}
                  onTimeChange={setTime}
                />
                {feedType === "nursing" ? (
                  nursingGroup ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="edit-nursing-left-duration">
                          {t("log.leftMin")}
                        </Label>
                        <Input
                          id="edit-nursing-left-duration"
                          type="number"
                          min={0}
                          value={nursingLeftDuration}
                          onChange={(e) =>
                            setNursingLeftDuration(e.target.value)
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="edit-nursing-right-duration">
                          {t("log.rightMin")}
                        </Label>
                        <Input
                          id="edit-nursing-right-duration"
                          type="number"
                          min={0}
                          value={nursingRightDuration}
                          onChange={(e) =>
                            setNursingRightDuration(e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="edit-duration">
                          {t("log.durationMin")}
                        </Label>
                        <Input
                          id="edit-duration"
                          type="number"
                          min={1}
                          value={durationMin}
                          onChange={(e) => setDurationMin(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>{t("log.side")}</Label>
                        <SegmentedControl
                          value={side}
                          onValueChange={setSide}
                          options={[
                            { value: "L", label: t("common.left") },
                            { value: "R", label: t("common.right") },
                          ]}
                        />
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-amount">{t("log.amountMl")}</Label>
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
                <DateTimeFields
                  idPrefix="edit-sleep-start"
                  date={date}
                  time={time}
                  onDateChange={setDate}
                  onTimeChange={setTime}
                  dateLabel={t("log.startDate")}
                  timeLabel={t("log.startTime")}
                />
                <DateTimeFields
                  idPrefix="edit-sleep-end"
                  date={endDate}
                  time={endTime}
                  onDateChange={setEndDate}
                  onTimeChange={setEndTime}
                  dateLabel={t("log.endDate")}
                  timeLabel={t("log.endTime")}
                />
              </>
            )}

            {item.kind === "diaper" && (
              <>
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
                  idPrefix="edit-diaper"
                  date={date}
                  time={time}
                  onDateChange={setDate}
                  onTimeChange={setTime}
                />
              </>
            )}

            {item.kind === "pump" && (
              <>
                <DateTimeFields
                  idPrefix="edit-pump"
                  date={date}
                  time={time}
                  onDateChange={setDate}
                  onTimeChange={setTime}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-pump-left-ml">{t("log.leftAmountMl")}</Label>
                    <Input
                      id="edit-pump-left-ml"
                      type="number"
                      min={0}
                      value={pumpLeftMl}
                      onChange={(e) => setPumpLeftMl(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-pump-right-ml">{t("log.rightAmountMl")}</Label>
                    <Input
                      id="edit-pump-right-ml"
                      type="number"
                      min={0}
                      value={pumpRightMl}
                      onChange={(e) => setPumpRightMl(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-pump-l">{t("log.leftMin")}</Label>
                    <Input
                      id="edit-pump-l"
                      type="number"
                      min={0}
                      value={pumpLeft}
                      onChange={(e) => setPumpLeft(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-pump-r">{t("log.rightMin")}</Label>
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

            <DrawerFooter className="px-0">
              <Button type="submit" disabled={submitting}>
                {t("common.saveChanges")}
              </Button>
            </DrawerFooter>
            </div>
            </AnimatedHeight>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  )
}
