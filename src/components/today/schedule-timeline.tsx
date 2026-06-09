import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DayTimelineSection } from "@/components/today/day-timeline-section"
import { Button } from "@/components/ui/button"
import { getNavigationDateBounds } from "@/lib/baby-tracker-import"
import { addDays, isSameDay, startOfDay } from "@/lib/format"
import i18n, { getDateLocale } from "@/lib/i18n"

const INITIAL_PAST_DAYS = 2
const INITIAL_FUTURE_DAYS = 2
const LOAD_BATCH = 3
const FAB_BOTTOM = "calc(1rem + env(safe-area-inset-bottom, 0px))"
const DAY_SCROLL_ANCHOR_PX = 24
const DAY_ACTIVE_ANCHOR_SCROLL_DOWN_PX = 24
const DAY_ACTIVE_ANCHOR_SCROLL_UP_PX = 80
const NOW_FAB_CLASS =
  "fixed left-4 z-[60] h-12 gap-1.5 rounded-full px-4 text-white shadow-lg hover:text-white [&_svg]:text-white"

type NowScrollOffset = "at" | "past" | "future"

type ScheduleTimelineProps = {
  babyId: string
}

function dateKey(date: Date) {
  return startOfDay(date).toISOString()
}

function buildAllNavigationDays() {
  const { min, max } = getNavigationDateBounds()
  const days: Date[] = []

  for (let day = startOfDay(min); day <= max; day = addDays(day, 1)) {
    days.push(new Date(day))
  }

  return days
}

function buildDayRange(anchor: Date, past: number, future: number) {
  const { min, max } = getNavigationDateBounds()
  const days: Date[] = []

  for (let offset = -past; offset <= future; offset++) {
    const day = startOfDay(addDays(anchor, offset))
    if (day < min || day > max) continue
    days.push(day)
  }

  return days
}

function mergeUniqueDays(existing: Date[], incoming: Date[]) {
  const keys = new Set(existing.map(dateKey))
  const merged = [...existing]

  for (const day of incoming) {
    const key = dateKey(day)
    if (!keys.has(key)) {
      keys.add(key)
      merged.push(startOfDay(day))
    }
  }

  return merged.sort((a, b) => a.getTime() - b.getTime())
}

function scrollToTarget(
  scrollEl: HTMLDivElement,
  target: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  const scrollRect = scrollEl.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const top =
    scrollEl.scrollTop +
    targetRect.top -
    scrollRect.top -
    scrollEl.clientHeight / 2 +
    targetRect.height / 2
  scrollEl.scrollTo({ top: Math.max(0, top), behavior })
}

function scrollToDayStart(
  scrollEl: HTMLDivElement,
  target: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  const scrollRect = scrollEl.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const top =
    scrollEl.scrollTop +
    targetRect.top -
    scrollRect.top -
    DAY_SCROLL_ANCHOR_PX
  scrollEl.scrollTo({ top: Math.max(0, top), behavior })
}

function shortDayLabel(date: Date, today: Date) {
  if (isSameDay(date, today)) return i18n.t("common.today")
  return date.toLocaleDateString(getDateLocale(), {
    weekday: "short",
    day: "numeric",
  })
}

function getActiveDayKey(
  scrollEl: HTMLDivElement,
  dayStartRefs: Map<string, HTMLDivElement>,
  navigationDays: Date[],
  anchorPx: number,
) {
  const anchorY = scrollEl.getBoundingClientRect().top + anchorPx
  let activeKey: string | null = null
  let containingKey: string | null = null

  for (const date of navigationDays) {
    const key = dateKey(date)
    const el = dayStartRefs.get(key)
    if (!el) continue

    const rect = el.getBoundingClientRect()
    if (rect.top <= anchorY && rect.bottom >= anchorY) {
      containingKey = key
    }
    if (rect.top <= anchorY) {
      activeKey = key
    }
  }

  if (containingKey) return containingKey
  if (activeKey) return activeKey

  for (const date of navigationDays) {
    const key = dateKey(date)
    if (dayStartRefs.has(key)) return key
  }

  return null
}

export function ScheduleTimeline({ babyId }: ScheduleTimelineProps) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => new Date())
  const todayKey = dateKey(now)
  const today = useMemo(() => startOfDay(now), [todayKey])
  const [days, setDays] = useState(() =>
    buildDayRange(startOfDay(new Date()), INITIAL_PAST_DAYS, INITIAL_FUTURE_DAYS),
  )
  const [nowOffset, setNowOffset] = useState<NowScrollOffset>("at")
  const [activeDayKey, setActiveDayKey] = useState<string | null>(() =>
    dateKey(startOfDay(new Date())),
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const pillsRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const nowNodeRef = useRef<HTMLDivElement | null>(null)
  const todayDayStartRef = useRef<HTMLDivElement | null>(null)
  const dayStartRefs = useRef(new Map<string, HTMLDivElement>())
  const navigationDays = useMemo(() => buildAllNavigationDays(), [])
  const loadingMoreRef = useRef(false)
  const hasScrolledToTodayRef = useRef(false)
  const lastScrollTopRef = useRef(0)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const scrollToNow = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      setNow(new Date())

      const scrollEl = scrollRef.current
      if (!scrollEl) return

      setDays((current) => mergeUniqueDays(current, [today]))

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const target = nowNodeRef.current ?? todayDayStartRef.current
          if (target) scrollToTarget(scrollEl, target, behavior)
        })
      })
    },
    [todayKey, today],
  )

  const loadPastDays = useCallback(() => {
    const { min } = getNavigationDateBounds()
    const first = days[0]
    if (!first || startOfDay(first) <= min) return

    const incoming: Date[] = []
    for (let i = LOAD_BATCH; i >= 1; i--) {
      const day = startOfDay(addDays(first, -i))
      if (day < min) break
      incoming.push(day)
    }
    if (incoming.length === 0) return

    const scrollEl = scrollRef.current
    const prevHeight = scrollEl?.scrollHeight ?? 0

    setDays((current) => mergeUniqueDays(current, incoming))

    requestAnimationFrame(() => {
      if (scrollEl) {
        scrollEl.scrollTop += scrollEl.scrollHeight - prevHeight
      }
    })
  }, [days])

  const loadFutureDays = useCallback(() => {
    const { max } = getNavigationDateBounds()
    const last = days[days.length - 1]
    if (!last || startOfDay(last) >= max) return

    const incoming: Date[] = []
    for (let i = 1; i <= LOAD_BATCH; i++) {
      const day = startOfDay(addDays(last, i))
      if (day > max) break
      incoming.push(day)
    }
    if (incoming.length === 0) return

    setDays((current) => mergeUniqueDays(current, incoming))
  }, [days])

  useEffect(() => {
    const scrollEl = scrollRef.current
    const topSentinel = topSentinelRef.current
    const bottomSentinel = bottomSentinelRef.current
    if (!scrollEl || !topSentinel || !bottomSentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || loadingMoreRef.current) continue

          loadingMoreRef.current = true
          if (entry.target === topSentinel) {
            loadPastDays()
          } else if (entry.target === bottomSentinel) {
            loadFutureDays()
          }
          window.setTimeout(() => {
            loadingMoreRef.current = false
          }, 200)
        }
      },
      { root: scrollEl, rootMargin: "240px" },
    )

    observer.observe(topSentinel)
    observer.observe(bottomSentinel)
    return () => observer.disconnect()
  }, [loadPastDays, loadFutureDays])

  useEffect(() => {
    if (hasScrolledToTodayRef.current) return

    const scrollEl = scrollRef.current
    const target = nowNodeRef.current ?? todayDayStartRef.current
    if (!scrollEl || !target) return

    scrollToTarget(scrollEl, target, "auto")
    hasScrolledToTodayRef.current = true
  }, [days])

  const syncActiveDay = useCallback(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const scrollTop = scrollEl.scrollTop
    const scrollingUp = scrollTop < lastScrollTopRef.current
    lastScrollTopRef.current = scrollTop

    const anchorPx = scrollingUp
      ? DAY_ACTIVE_ANCHOR_SCROLL_UP_PX
      : DAY_ACTIVE_ANCHOR_SCROLL_DOWN_PX

    const nextKey = getActiveDayKey(
      scrollEl,
      dayStartRefs.current,
      navigationDays,
      anchorPx,
    )
    setActiveDayKey((current) => (current === nextKey ? current : nextKey))
  }, [navigationDays])

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const updateScrollState = () => {
      syncActiveDay()

      const target = nowNodeRef.current ?? todayDayStartRef.current
      if (!target) {
        setNowOffset("at")
        return
      }

      const rootRect = scrollEl.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const targetMidY = targetRect.top + targetRect.height / 2
      const edgePadding = 72
      const inView =
        targetMidY >= rootRect.top + edgePadding &&
        targetMidY <= rootRect.bottom - edgePadding

      if (inView) {
        setNowOffset("at")
      } else if (targetMidY > rootRect.bottom - edgePadding) {
        setNowOffset("past")
      } else {
        setNowOffset("future")
      }
    }

    updateScrollState()
    scrollEl.addEventListener("scroll", updateScrollState, { passive: true })
    window.addEventListener("resize", updateScrollState)

    return () => {
      scrollEl.removeEventListener("scroll", updateScrollState)
      window.removeEventListener("resize", updateScrollState)
    }
  }, [days, now, syncActiveDay])

  useEffect(() => {
    if (!activeDayKey || !pillsRef.current) return

    const activePill = pillsRef.current.querySelector(
      `[data-day-key="${activeDayKey}"]`,
    )
    activePill?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: "smooth",
    })
  }, [activeDayKey])

  const registerNowRef = useCallback((el: HTMLDivElement | null) => {
    nowNodeRef.current = el
    if (el && !hasScrolledToTodayRef.current) {
      requestAnimationFrame(() => {
        const scrollEl = scrollRef.current
        if (!scrollEl || hasScrolledToTodayRef.current) return
        scrollToTarget(scrollEl, el, "auto")
        hasScrolledToTodayRef.current = true
      })
    }
  }, [])

  const registerDayStartRef = useCallback(
    (date: Date, el: HTMLDivElement | null) => {
      const key = dateKey(date)
      if (el) {
        dayStartRefs.current.set(key, el)
      } else {
        dayStartRefs.current.delete(key)
      }

      if (key === todayKey) {
        todayDayStartRef.current = el
        if (
          el &&
          !hasScrolledToTodayRef.current &&
          !nowNodeRef.current
        ) {
          requestAnimationFrame(() => {
            const scrollEl = scrollRef.current
            if (!scrollEl || hasScrolledToTodayRef.current) return
            scrollToTarget(scrollEl, el, "auto")
            hasScrolledToTodayRef.current = true
          })
        }
      }

      if (el) requestAnimationFrame(syncActiveDay)
    },
    [todayKey, syncActiveDay],
  )

  const scrollToDay = useCallback(
    (date: Date, behavior: ScrollBehavior = "smooth") => {
      const scrollEl = scrollRef.current
      if (!scrollEl) return

      setActiveDayKey(dateKey(date))

      setDays((current) =>
        mergeUniqueDays(
          current,
          buildDayRange(date, INITIAL_PAST_DAYS, INITIAL_FUTURE_DAYS),
        ),
      )

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const target = dayStartRefs.current.get(dateKey(date))
          if (target) scrollToDayStart(scrollEl, target, behavior)
        })
      })
    },
    [],
  )

  return (
    <section className="relative flex min-h-0 flex-1 flex-col">
      <div className="bg-background/95 shrink-0 border-b backdrop-blur-sm">
        <div
          ref={pillsRef}
          className="flex gap-2 overflow-x-auto px-1 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {navigationDays.map((date) => {
            const key = dateKey(date)
            const isActive = key === activeDayKey
            return (
              <Button
                key={key}
                type="button"
                data-day-key={key}
                variant={isActive ? "default" : "secondary"}
                size="sm"
                className="shrink-0 rounded-full px-3"
                aria-current={isActive ? "true" : undefined}
                onClick={() => scrollToDay(date)}
              >
                {shortDayLabel(date, today)}
              </Button>
            )
          })}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div ref={topSentinelRef} className="h-px shrink-0" aria-hidden />

        {days.map((date) => (
          <DayTimelineSection
            key={dateKey(date)}
            babyId={babyId}
            date={date}
            now={now}
            registerNowRef={
              isSameDay(date, today) ? registerNowRef : undefined
            }
            registerDayStartRef={registerDayStartRef}
          />
        ))}

        <div
          ref={bottomSentinelRef}
          className="h-px shrink-0 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
          aria-hidden
        />
      </div>

      {nowOffset !== "at" && days.some((date) => dateKey(date) === todayKey) && (
        <Button
          variant="secondary"
          aria-label={
            nowOffset === "past"
              ? t("common.goDownToNow")
              : t("common.goUpToNow")
          }
          className={NOW_FAB_CLASS}
          style={{ bottom: FAB_BOTTOM }}
          onClick={() => scrollToNow()}
        >
          {nowOffset === "past" ? (
            <ArrowDownIcon className="size-5" aria-hidden />
          ) : (
            <ArrowUpIcon className="size-5" aria-hidden />
          )}
          {t("common.now")}
        </Button>
      )}
    </section>
  )
}
