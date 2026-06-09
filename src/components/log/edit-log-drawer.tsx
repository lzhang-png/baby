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
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/format"
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
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function EditLogDrawer({
  item,
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
                        value: "nursing",
                        label: t("log.nursing"),
                        icon: MotherIcon,
                        iconClassName: "text-sky-400",
                      },
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
                        value: "donated",
                        label: t("log.donated"),
                        icon: MilkIcon,
                        iconClassName: "text-sky-400",
                      },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-when">{t("common.time")}</Label>
                  <Input
                    id="edit-when"
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                  />
                </div>
                {feedType === "nursing" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="edit-duration">{t("log.durationMin")}</Label>
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-sleep-start">{t("log.startTimeLabel")}</Label>
                  <Input
                    id="edit-sleep-start"
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-sleep-end">{t("log.endTimeOptional")}</Label>
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-diaper-when">{t("common.time")}</Label>
                  <Input
                    id="edit-diaper-when"
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                  />
                </div>
              </>
            )}

            {item.kind === "pump" && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-pump-when">{t("common.time")}</Label>
                  <Input
                    id="edit-pump-when"
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-pump-ml">{t("log.amountMlOptional")}</Label>
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
