import type { PumpLog } from "@/lib/types"

export const PUMP_SIDE_ML_NOTE_PREFIX = "@side_ml:"

export function parseOptionalMlInput(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

export function formatSideAmountsNote(
  left: number | null,
  right: number | null,
): string {
  return `${PUMP_SIDE_ML_NOTE_PREFIX}${left ?? ""},${right ?? ""}`
}

export function parseSideAmountsFromNotes(notes: string | null): {
  leftMl: number | null
  rightMl: number | null
} {
  if (!notes) return { leftMl: null, rightMl: null }

  for (const line of notes.split("\n")) {
    if (!line.startsWith(PUMP_SIDE_ML_NOTE_PREFIX)) continue
    const rest = line.slice(PUMP_SIDE_ML_NOTE_PREFIX.length)
    const [leftRaw, rightRaw] = rest.split(",")
    const leftMl = leftRaw === "" ? null : Number(leftRaw)
    const rightMl = rightRaw === "" ? null : Number(rightRaw)
    return {
      leftMl: Number.isFinite(leftMl) ? leftMl : null,
      rightMl: Number.isFinite(rightMl) ? rightMl : null,
    }
  }

  return { leftMl: null, rightMl: null }
}

export function mergeSideAmountsNote(
  notes: string | null | undefined,
  left: number | null,
  right: number | null,
): string | null {
  if (left == null && right == null) return notes ?? null

  const withoutOld = (notes ?? "")
    .split("\n")
    .filter((line) => !line.startsWith(PUMP_SIDE_ML_NOTE_PREFIX))
    .join("\n")
    .trim()
  const sideLine = formatSideAmountsNote(left, right)
  return withoutOld ? `${withoutOld}\n${sideLine}` : sideLine
}

/** Resolve side columns from DB row, including legacy notes fallback. */
export function enrichPumpLog(row: PumpLog): PumpLog {
  let amount_left_ml = row.amount_left_ml ?? null
  let amount_right_ml = row.amount_right_ml ?? null

  if (amount_left_ml == null && amount_right_ml == null) {
    const fromNotes = parseSideAmountsFromNotes(row.notes)
    amount_left_ml = fromNotes.leftMl
    amount_right_ml = fromNotes.rightMl
  }

  return {
    ...row,
    amount_left_ml,
    amount_right_ml,
  }
}

export function getPumpSideAmounts(pump: PumpLog): {
  leftMl: number | null
  rightMl: number | null
} {
  const enriched = enrichPumpLog(pump)

  if (enriched.amount_left_ml != null || enriched.amount_right_ml != null) {
    return {
      leftMl: enriched.amount_left_ml,
      rightMl: enriched.amount_right_ml,
    }
  }

  if (!enriched.amount_ml) {
    return { leftMl: null, rightMl: null }
  }

  const leftMin = enriched.duration_left_min ?? 0
  const rightMin = enriched.duration_right_min ?? 0
  const totalMin = leftMin + rightMin

  if (leftMin > 0 && rightMin > 0) {
    const leftMl = Math.round((enriched.amount_ml * leftMin) / totalMin)
    return { leftMl, rightMl: enriched.amount_ml - leftMl }
  }

  if (leftMin > 0) {
    return { leftMl: enriched.amount_ml, rightMl: null }
  }

  if (rightMin > 0) {
    return { leftMl: null, rightMl: enriched.amount_ml }
  }

  return { leftMl: null, rightMl: null }
}

export function getPumpTotalMl(pump: PumpLog): number {
  const { leftMl, rightMl } = getPumpSideAmounts(pump)
  const sideTotal = (leftMl ?? 0) + (rightMl ?? 0)
  if (sideTotal > 0) return sideTotal
  return pump.amount_ml ?? 0
}
