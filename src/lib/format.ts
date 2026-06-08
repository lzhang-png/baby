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
  if (isSameDay(date, new Date())) return "Today"
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatDuration(minutes: number | null | undefined) {
  if (!minutes) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return `${h} hr ${m} min`
}

export function formatElapsedClock(totalSec: number) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
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
