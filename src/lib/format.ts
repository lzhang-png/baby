import i18n, { getDateLocale } from "@/lib/i18n"

export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return startOfDay(d)
}

export function formatDayHeading(date: Date) {
  if (isSameDay(date, new Date())) return i18n.t("common.today")
  return date.toLocaleDateString(getDateLocale(), {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(getDateLocale(), {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatDuration(minutes: number | null | undefined) {
  if (!minutes) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} ${i18n.t("activity.min")}`
  return `${h} ${i18n.t("activity.hr")} ${m} ${i18n.t("activity.min")}`
}

export function formatElapsedClock(totalSec: number) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

/** Digit-only form of an elapsed clock value for masked MM:SS entry. */
export function elapsedSecToClockDigits(totalSec: number) {
  const clamped = Math.max(0, Math.floor(totalSec))
  const minutes = Math.min(99, Math.floor(clamped / 60))
  const seconds = clamped % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(minutes)}${pad(seconds)}`
}

/** Formats digit input as MM:SS with the colon always present. */
export function formatElapsedClockInput(digits: string) {
  const mmss = digits.replace(/\D/g, "").slice(-4).padStart(4, "0")
  return `${mmss.slice(0, 2)}:${mmss.slice(2, 4)}`
}

export function parseElapsedClock(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parts = trimmed.split(":").map((part) => Number(part))
  if (parts.some((part) => Number.isNaN(part))) return null

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null
    return minutes * 60 + seconds
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
      return null
    }
    return hours * 3600 + minutes * 60 + seconds
  }

  return null
}

export function formatCompactDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const padDatePart = (n: number) => String(n).padStart(2, "0")

export function toDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

export function toTimeInputValue(date = new Date()) {
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`
}

export function toDatetimeLocalValue(date = new Date()) {
  return `${toDateInputValue(date)}T${toTimeInputValue(date)}`
}

export function fromDateAndTimeValues(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString()
}

export function fromDatetimeLocalValue(value: string) {
  return new Date(value).toISOString()
}
