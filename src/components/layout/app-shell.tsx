import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Outlet, useLocation } from "react-router-dom"
import {
  CirclePlusIcon,
  FilterIcon,
  MilkIcon,
  MoonIcon,
  SettingsIcon,
  ScrollTextIcon,
  type LucideIcon,
} from "lucide-react"

import { PumpIcon } from "@/components/icons/pump-icon"
import { DiaperIcon } from "@/components/icons/diaper-icon"
import { AppBackground } from "@/components/layout/app-background"
import { LogPanel, type LogPanelType } from "@/components/log/log-panel"
import { DaySummariesPanel } from "@/components/today/day-summaries-panel"
import { SettingsPanel } from "@/components/settings/settings-panel"
import { TimelineFilterPanel } from "@/components/today/timeline-filter-panel"
import { RECORDED_COLORS } from "@/components/today/recorded-events"
import { ActivityRefreshProvider } from "@/contexts/activity-refresh-context"
import { useAuth } from "@/contexts/auth-context"
import { LogPanelProvider } from "@/contexts/log-panel-context"
import { TimelineFilterProvider, useTimelineFilter } from "@/contexts/timeline-filter-context"
import { TimelineZoomProvider } from "@/contexts/timeline-zoom-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  hasOngoingPumpSession,
  usePumpTimerSession,
} from "@/lib/pump-timer-session"
import {
  hasOngoingNursingSession,
  useNursingTimerSession,
} from "@/lib/nursing-timer-session"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const FAB_BOTTOM = "calc(1rem + env(safe-area-inset-bottom, 0px))"
const FAB_CLASS = "size-14 rounded-full shadow-lg"

type BottomPanel =
  | { mode: "log"; logType: LogPanelType }
  | { mode: "filter" }
  | null

type LogMenuItem = {
  type: LogPanelType
  labelKey: "log.feed" | "log.sleep" | "log.diaper" | "log.pump"
  icon: LucideIcon | typeof PumpIcon | typeof DiaperIcon
}

const LOG_MENU: LogMenuItem[] = [
  { type: "feed", labelKey: "log.feed", icon: MilkIcon },
  { type: "sleep", labelKey: "log.sleep", icon: MoonIcon },
  { type: "diaper", labelKey: "log.diaper", icon: DiaperIcon },
  { type: "pump", labelKey: "log.pump", icon: PumpIcon },
]

function isNavItemActive(pathname: string, to: string) {
  return pathname === to || pathname.endsWith(to)
}

function BottomFabBar({
  panelOpen,
  summaryOpen,
  settingsOpen,
  onLogSelect,
  onFilterOpen,
  onSummaryOpen,
  onSettingsOpen,
}: {
  panelOpen: boolean
  summaryOpen: boolean
  settingsOpen: boolean
  onLogSelect: (type: LogPanelType) => void
  onFilterOpen: () => void
  onSummaryOpen: () => void
  onSettingsOpen: () => void
}) {
  const { t } = useTranslation()
  const { baby } = useAuth()
  const { pathname } = useLocation()
  const isTimelinePage = isNavItemActive(pathname, "/today")
  const { filterActive } = useTimelineFilter()
  const pumpSides = usePumpTimerSession(baby?.id)
  const hasOngoingPump = hasOngoingPumpSession(pumpSides)
  const nursingSides = useNursingTimerSession(baby?.id)
  const hasOngoingNursing = hasOngoingNursingSession(nursingSides)

  if (panelOpen || summaryOpen || settingsOpen) return null

  return (
    <div
      className="fixed right-4 z-50 flex items-center gap-2"
      style={{ bottom: FAB_BOTTOM }}
    >
      {isTimelinePage && (
        <>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label={t("nav.settings")}
            className={FAB_CLASS}
            onClick={onSettingsOpen}
          >
            <SettingsIcon className="size-6" aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label={t("nav.summary")}
            className={FAB_CLASS}
            onClick={onSummaryOpen}
          >
            <ScrollTextIcon className="size-6" aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label={t("timeline.filterLogs")}
            className={cn(FAB_CLASS, "relative")}
            onClick={onFilterOpen}
          >
            <FilterIcon className="size-6" aria-hidden />
            {filterActive && (
              <span
                aria-hidden
                className="absolute top-2.5 right-2.5 size-2.5 rounded-full bg-blue-500 ring-2 ring-secondary"
              />
            )}
          </Button>
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            aria-label={t("nav.logActivity")}
            className={cn(
              FAB_CLASS,
              "bg-blue-500 text-white hover:bg-blue-600",
            )}
          >
            <CirclePlusIcon className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="min-w-52 p-2">
          <DropdownMenuGroup>
            {LOG_MENU.map(({ type, labelKey, icon: Icon }) => (
              <DropdownMenuItem
                key={type}
                className="min-h-12 gap-3 px-3 py-3 text-base font-medium [&_svg]:size-5"
                onSelect={() => onLogSelect(type)}
              >
                <Icon aria-hidden className={cn("size-5", RECORDED_COLORS[type])} />
                <span className="min-w-0 flex-1">{t(labelKey)}</span>
                {type === "feed" && hasOngoingNursing && (
                  <Badge className="h-7 bg-blue-500 px-3 text-sm font-semibold text-white hover:bg-blue-500">
                    {t("common.ongoing")}
                  </Badge>
                )}
                {type === "pump" && hasOngoingPump && (
                  <Badge className="h-7 bg-blue-500 px-3 text-sm font-semibold text-white hover:bg-blue-500">
                    {t("common.ongoing")}
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function AppShell() {
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const panelOpen = bottomPanel !== null
  const { pathname } = useLocation()
  const isTimelinePage = isNavItemActive(pathname, "/today")
  const openLogPanel = useCallback((type: LogPanelType) => {
    setBottomPanel({ mode: "log", logType: type })
  }, [])

  return (
    <ActivityRefreshProvider>
      <TimelineFilterProvider>
      <LogPanelProvider openLogPanel={openLogPanel}>
      <TimelineZoomProvider>
      <div className="relative flex h-svh flex-col overflow-hidden">
      <AppBackground />
      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        {isTimelinePage ? (
          <Outlet />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-5">
            <Outlet />
          </div>
        )}
      </main>

      <BottomFabBar
        panelOpen={panelOpen}
        summaryOpen={summaryOpen}
        settingsOpen={settingsOpen}
        onLogSelect={(type) => setBottomPanel({ mode: "log", logType: type })}
        onFilterOpen={() => setBottomPanel({ mode: "filter" })}
        onSummaryOpen={() => setSummaryOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      <Drawer
        open={panelOpen}
        onOpenChange={(open) => {
          if (!open) setBottomPanel(null)
        }}
        direction="bottom"
        handleOnly
        repositionInputs={false}
      >
        <DrawerContent
          showHandle={false}
          className="min-w-0 bg-background pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
        >
          {bottomPanel?.mode === "log" ? (
            <LogPanel
              type={bottomPanel.logType}
              onLogged={() => setBottomPanel(null)}
            />
          ) : bottomPanel?.mode === "filter" ? (
            <TimelineFilterPanel />
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        direction="bottom"
        handleOnly
        repositionInputs={false}
      >
        <DrawerContent className="min-w-0 bg-background">
          <DaySummariesPanel open={summaryOpen} />
        </DrawerContent>
      </Drawer>

      <Drawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        direction="bottom"
        handleOnly
        repositionInputs={false}
      >
        <DrawerContent className="min-w-0 bg-background">
          <SettingsPanel open={settingsOpen} />
        </DrawerContent>
      </Drawer>
      </div>
      </TimelineZoomProvider>
      </LogPanelProvider>
      </TimelineFilterProvider>
    </ActivityRefreshProvider>
  )
}
