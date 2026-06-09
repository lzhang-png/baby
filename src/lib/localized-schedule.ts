import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import {
  COMPARISON_ROWS as COMPARISON_ROWS_EN,
  STAGES as STAGES_EN,
  TRENDS as TRENDS_EN,
  type Stage,
  type WeeklyTrend,
} from "@/lib/schedule-data"
import {
  COMPARISON_ROWS_ZH,
  STAGES_ZH,
  TRENDS_ZH,
} from "@/lib/schedule-data-zh"

export function getStages(language: string): Stage[] {
  return language === "zh" ? STAGES_ZH : STAGES_EN
}

export function getTrends(language: string): WeeklyTrend[] {
  return language === "zh" ? TRENDS_ZH : TRENDS_EN
}

export function getComparisonRows(language: string) {
  return language === "zh" ? COMPARISON_ROWS_ZH : COMPARISON_ROWS_EN
}

export function useLocalizedSchedule() {
  const { i18n } = useTranslation()

  return useMemo(
    () => ({
      stages: getStages(i18n.language),
      trends: getTrends(i18n.language),
      comparisonRows: getComparisonRows(i18n.language),
    }),
    [i18n.language],
  )
}
