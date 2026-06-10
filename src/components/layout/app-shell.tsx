import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import {
  CalendarDaysIcon,
  CirclePlusIcon,
  ClipboardListIcon,
  MenuIcon,
  MilkIcon,
  MoonIcon,
  ScrollTextIcon,
  UsersIcon,
  ZoomInIcon,
  ZoomOutIcon,
  type LucideIcon,
} from "lucide-react"

import { PumpIcon } from "@/components/icons/pump-icon"
import { DiaperIcon } from "@/components/icons/diaper-icon"
import { LogPanel, type LogPanelType } from "@/components/log/log-panel"
import { DaySummariesPanel } from "@/components/today/day-summaries-panel"
import { RECORDED_COLORS } from "@/components/today/recorded-events"
import { ActivityRefreshProvider } from "@/contexts/activity-refresh-context"
import { useAuth } from "@/contexts/auth-context"
import { LogPanelProvider } from "@/contexts/log-panel-context"
import { TimelineZoomProvider, useTimelineZoom } from "@/contexts/timeline-zoom-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  hasOngoingPumpSession,
  usePumpTimerSession,
} from "@/lib/pump-timer-session"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type NavItem = {
  to: string
  labelKey: "nav.timeline" | "nav.schedule" | "nav.settings"
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { to: "/today", labelKey: "nav.timeline", icon: CalendarDaysIcon },
  { to: "/schedule", labelKey: "nav.schedule", icon: ClipboardListIcon },
  { to: "/family", labelKey: "nav.settings", icon: UsersIcon },
]

const FAB_BOTTOM = "calc(1rem + env(safe-area-inset-bottom, 0px))"
const FAB_CLASS = "size-14 rounded-full shadow-lg"

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

function NavMenuItem({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const Icon = item.icon
  const isActive = isNavItemActive(pathname, item.to)

  return (
    <DropdownMenuItem
      asChild
      className={cn(
        "min-h-12 gap-3 px-3 py-3 text-base font-medium [&_svg]:size-5",
        isActive &&
          "bg-secondary text-foreground font-semibold focus:bg-secondary focus:text-foreground",
      )}
    >
      <NavLink
        to={item.to}
        aria-current={isActive ? "page" : undefined}
        className="flex w-full items-center gap-3"
      >
        <Icon aria-hidden />
        {t(item.labelKey)}
      </NavLink>
    </DropdownMenuItem>
  )
}

function BottomFabBar({
  logOpen,
  summaryOpen,
  onLogSelect,
  onSummaryOpen,
}: {
  logOpen: boolean
  summaryOpen: boolean
  onLogSelect: (type: LogPanelType) => void
  onSummaryOpen: () => void
}) {
  const { t } = useTranslation()
  const { baby } = useAuth()
  const { pathname } = useLocation()
  const isTimelinePage = isNavItemActive(pathname, "/today")
  const { zoomInEnabled, zoomOutEnabled, zoomIn, zoomOut } = useTimelineZoom()
  const pumpSides = usePumpTimerSession(baby?.id)
  const hasOngoingPump = hasOngoingPumpSession(pumpSides)

  if (logOpen || summaryOpen) return null

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
            aria-label={t("common.zoomOut")}
            disabled={!zoomOutEnabled}
            className={FAB_CLASS}
            onClick={zoomOut}
          >
            <ZoomOutIcon className="size-6" aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label={t("common.zoomIn")}
            disabled={!zoomInEnabled}
            className={FAB_CLASS}
            onClick={zoomIn}
          >
            <ZoomInIcon className="size-6" aria-hidden />
          </Button>
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            aria-label={t("nav.openMenu")}
            className={FAB_CLASS}
          >
            <MenuIcon className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="min-w-52 p-2">
          <DropdownMenuGroup>
            <NavMenuItem item={NAV[0]} />
            <DropdownMenuItem
              className="min-h-12 gap-3 px-3 py-3 text-base font-medium [&_svg]:size-5"
              onSelect={onSummaryOpen}
            >
              <ScrollTextIcon aria-hidden />
              {t("nav.summary")}
            </DropdownMenuItem>
            {NAV.slice(1).map((item) => (
              <NavMenuItem key={item.to} item={item} />
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

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
  const [logPanelType, setLogPanelType] = useState<LogPanelType | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const logOpen = logPanelType !== null
  const { pathname } = useLocation()
  const isTimelinePage = isNavItemActive(pathname, "/today")
  const openLogPanel = useCallback((type: LogPanelType) => {
    setLogPanelType(type)
  }, [])

  return (
    <ActivityRefreshProvider>
      <LogPanelProvider openLogPanel={openLogPanel}>
      <TimelineZoomProvider>
      <div className="bg-background flex h-svh flex-col overflow-hidden">
      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        {isTimelinePage ? (
          <Outlet />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-5">
            <Outlet />
          </div>
        )}
      </main>

      <BottomFabBar
        logOpen={logOpen}
        summaryOpen={summaryOpen}
        onLogSelect={setLogPanelType}
        onSummaryOpen={() => setSummaryOpen(true)}
      />

      <Drawer
        open={logOpen}
        onOpenChange={(open) => {
          if (!open) setLogPanelType(null)
        }}
        direction="bottom"
        handleOnly
        repositionInputs={false}
      >
        <DrawerContent
          showHandle={false}
          className="min-w-0 bg-background pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
        >
          {logPanelType ? (
            <LogPanel
              type={logPanelType}
              onLogged={() => setLogPanelType(null)}
            />
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
      </div>
      </TimelineZoomProvider>
      </LogPanelProvider>
    </ActivityRefreshProvider>
  )
}
