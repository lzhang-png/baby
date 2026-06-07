// ---------------------------------------------------------------------------
// Source: Luca's Baby Tracker daily report, 4/23/26–6/6/26 (born 4/21/26).
// Weekly values are averages of the daily summary lines in that report.
// ---------------------------------------------------------------------------

export type ActivityKind = "feed" | "sleep" | "wake"

export type WeeklyTrend = {
  week: string
  /** Avg of the single longest overnight sleep stretch per night, in hours. */
  nightStretch: number
  /** Avg measured bottle volume per day, in ml (nursing volume not measured). */
  bottleMl: number
  /** Typical largest single feed that week, in ml. */
  feedSize: number
}

export const TRENDS: WeeklyTrend[] = [
  { week: "Apr 23–30", nightStretch: 2.8, bottleMl: 404, feedSize: 55 },
  { week: "May 1–7", nightStretch: 3.1, bottleMl: 494, feedSize: 70 },
  { week: "May 8–14", nightStretch: 2.9, bottleMl: 495, feedSize: 80 },
  { week: "May 15–21", nightStretch: 3.3, bottleMl: 517, feedSize: 90 },
  { week: "May 22–28", nightStretch: 3.9, bottleMl: 524, feedSize: 100 },
  { week: "May 29–Jun 6", nightStretch: 4.6, bottleMl: 449, feedSize: 105 },
]

export type Stage = {
  id: string
  tab: string
  title: string
  dates: string
  age: string
  feedsPerDay: string
  perFeed: string
  totalIntake: string
  interval: string
  wakeWindow: string
  naps: string
  totalSleep: string
  nightStretch: string
  bedtime: string
  nightFeeds: string
  focus: string
  day: Array<{ time: string; label: string; kind: ActivityKind }>
}

export const STAGES: Stage[] = [
  {
    id: "s1",
    tab: "Stage 1",
    title: "Settling the rhythm",
    dates: "Jun 7 – Jul 5",
    age: "6–10 weeks (1.5–2.5 mo)",
    feedsPerDay: "7–8",
    perFeed: "100–130 ml (or 15–20 min nursing)",
    totalIntake: "750–900 ml/day",
    interval: "~3 h in the day",
    wakeWindow: "60–90 min",
    naps: "4–5",
    totalSleep: "15–16 h",
    nightStretch: "5–7 h (he already hits this)",
    bedtime: "8:30–9:00 PM",
    nightFeeds: "1–2",
    focus:
      "Nudge bedtime ~30 min earlier than the current 9:00–9:45 PM and keep a consistent wind-down. He is already giving you 6+ hour first stretches some nights — protect them by feeding fully before bed.",
    day: [
      { time: "7:00 AM", label: "Wake + Feed 1", kind: "wake" },
      { time: "8:15 AM", label: "Nap 1", kind: "sleep" },
      { time: "9:45 AM", label: "Wake", kind: "wake" },
      { time: "10:00 AM", label: "Feed 2", kind: "feed" },
      { time: "11:15 AM", label: "Nap 2", kind: "sleep" },
      { time: "1:00 PM", label: "Wake + Feed 3", kind: "feed" },
      { time: "2:15 PM", label: "Nap 3", kind: "sleep" },
      { time: "3:45 PM", label: "Wake + Feed 4", kind: "feed" },
      { time: "5:00 PM", label: "Catnap", kind: "sleep" },
      { time: "6:00 PM", label: "Wake", kind: "wake" },
      { time: "7:00 PM", label: "Bath + Feed 5", kind: "feed" },
      { time: "8:30 PM", label: "Bedtime — longest stretch", kind: "sleep" },
      { time: "~3:00 AM", label: "Night feed", kind: "feed" },
      { time: "~5:30 AM", label: "Optional brief feed", kind: "feed" },
    ],
  },
  {
    id: "s2",
    tab: "Stage 2",
    title: "Fewer, bigger feeds",
    dates: "Jul 6 – Aug 2",
    age: "10–14 weeks (2.5–3.5 mo)",
    feedsPerDay: "6–7",
    perFeed: "120–150 ml",
    totalIntake: "800–950 ml/day",
    interval: "3–3.5 h",
    wakeWindow: "75–105 min",
    naps: "4 → 3–4",
    totalSleep: "14.5–15.5 h",
    nightStretch: "6–8 h",
    bedtime: "7:30–8:30 PM",
    nightFeeds: "1",
    focus:
      "Naps start to consolidate into 3–4 predictable blocks. Stretch daytime feeds toward every 3.5 h so each feed is bigger — this is what pushes the night stretch past 7 h and usually drops you to a single night feed.",
    day: [
      { time: "7:00 AM", label: "Wake + Feed 1", kind: "wake" },
      { time: "8:30 AM", label: "Nap 1", kind: "sleep" },
      { time: "10:00 AM", label: "Wake + Feed 2", kind: "feed" },
      { time: "11:30 AM", label: "Nap 2", kind: "sleep" },
      { time: "1:00 PM", label: "Wake + Feed 3", kind: "feed" },
      { time: "2:30 PM", label: "Nap 3", kind: "sleep" },
      { time: "4:00 PM", label: "Wake + Feed 4", kind: "feed" },
      { time: "5:00 PM", label: "Catnap", kind: "sleep" },
      { time: "6:00 PM", label: "Wake", kind: "wake" },
      { time: "7:00 PM", label: "Bath + Feed 5", kind: "feed" },
      { time: "7:45 PM", label: "Bedtime", kind: "sleep" },
      { time: "~11:00 PM", label: "Optional dream feed", kind: "feed" },
      { time: "~4:00 AM", label: "Night feed", kind: "feed" },
    ],
  },
  {
    id: "s3",
    tab: "Stage 3",
    title: "A real day-night routine",
    dates: "Aug 3 – Sep 6",
    age: "14–19 weeks (3.5–4.5 mo)",
    feedsPerDay: "5–6",
    perFeed: "150–180 ml",
    totalIntake: "850–1000 ml/day (cap ~960 ml)",
    interval: "3.5–4 h",
    wakeWindow: "90–120 min",
    naps: "3–4",
    totalSleep: "14–15 h",
    nightStretch: "7–9 h (often through to early morning)",
    bedtime: "7:00–8:00 PM",
    nightFeeds: "0–1",
    focus:
      "A 3-nap day takes shape. Watch for a 4-month sleep regression around 15–17 weeks — temporary night waking is normal and not a sign to add feeds back. Keep the bedtime routine identical every night so he can resettle himself.",
    day: [
      { time: "7:00 AM", label: "Wake + Feed 1", kind: "wake" },
      { time: "9:00 AM", label: "Nap 1", kind: "sleep" },
      { time: "10:30 AM", label: "Wake + Feed 2", kind: "feed" },
      { time: "12:30 PM", label: "Nap 2", kind: "sleep" },
      { time: "2:00 PM", label: "Wake + Feed 3", kind: "feed" },
      { time: "4:00 PM", label: "Nap 3 (short)", kind: "sleep" },
      { time: "5:00 PM", label: "Wake + Feed 4", kind: "feed" },
      { time: "6:30 PM", label: "Bath / wind-down", kind: "wake" },
      { time: "7:00 PM", label: "Feed 5 + Bedtime", kind: "sleep" },
      { time: "~10:30 PM", label: "Optional dream feed", kind: "feed" },
      { time: "~4:00 AM", label: "Night feed if needed", kind: "feed" },
    ],
  },
]

export const COMPARISON_ROWS: Array<{ label: string; get: (s: Stage) => string }> = [
  { label: "Age", get: (s) => s.age },
  { label: "Calendar window", get: (s) => s.dates },
  { label: "Feeds / day", get: (s) => s.feedsPerDay },
  { label: "Volume per feed", get: (s) => s.perFeed },
  { label: "Total daily intake", get: (s) => s.totalIntake },
  { label: "Daytime feed interval", get: (s) => s.interval },
  { label: "Wake window", get: (s) => s.wakeWindow },
  { label: "Naps / day", get: (s) => s.naps },
  { label: "Total sleep / 24 h", get: (s) => s.totalSleep },
  { label: "Longest night stretch", get: (s) => s.nightStretch },
  { label: "Bedtime", get: (s) => s.bedtime },
  { label: "Night feeds", get: (s) => s.nightFeeds },
]
