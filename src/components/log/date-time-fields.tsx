import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type DateTimeFieldsProps = {
  idPrefix: string
  date: string
  time: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  dateLabel?: string
  timeLabel?: string
}

export function DateTimeFields({
  idPrefix,
  date,
  time,
  onDateChange,
  onTimeChange,
  dateLabel,
  timeLabel,
}: DateTimeFieldsProps) {
  const { t } = useTranslation()

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3">
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={`${idPrefix}-date`}>
          {dateLabel ?? t("common.date")}
        </Label>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          className="w-full min-w-0"
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={`${idPrefix}-time`}>
          {timeLabel ?? t("common.time")}
        </Label>
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
