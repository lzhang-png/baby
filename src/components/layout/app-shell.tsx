import { useState } from "react"
import { useTranslation } from "react-i18next"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import {
  CalendarDaysIcon,
  CirclePlusIcon,
  ClipboardListIcon,
  MenuIcon,
  ScrollTextIcon,
  UsersIcon,
  ZoomInIcon,
  ZoomOutIcon,
  type LucideIcon,
} from "lucide-react"

import { LogPanel } from "@/components/log/log-panel"
import { DaySummariesPanel } from "@/components/today/day-summaries-panel"
import { ActivityRefreshProvider } from "@/contexts/activity-refresh-context"
import { TimelineZoomProvider, useTimelineZoom } from "@/contexts/timeline-zoom-context"
import { Button } from "@/components/ui/button"
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
  onLogOpen,
  onSummaryOpen,
}: {
  logOpen: boolean
  summaryOpen: boolean
  onLogOpen: () => void
  onSummaryOpen: () => void
}) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isTimelinePage = isNavItemActive(pathname, "/today")
  const { zoomInEnabled, zoomOutEnabled, zoomIn, zoomOut } = useTimelineZoom()

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

      <Button
        size="icon"
        aria-label={t("nav.logActivity")}
        className={cn(
          FAB_CLASS,
          "bg-blue-500 text-white hover:bg-blue-600",
        )}
        onClick={onLogOpen}
      >
        <CirclePlusIcon className="size-6" />
      </Button>
    </div>
  )
}

export function AppShell() {
  const [logOpen, setLogOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const { pathname } = useLocation()
  const isTimelinePage = isNavItemActive(pathname, "/today")

  return (
    <ActivityRefreshProvider>
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
        onLogOpen={() => setLogOpen(true)}
        onSummaryOpen={() => setSummaryOpen(true)}
      />

      <Drawer
        open={logOpen}
        onOpenChange={setLogOpen}
        direction="bottom"
        handleOnly
        repositionInputs={false}
      >
        <DrawerContent className="min-w-0 bg-background pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          <LogPanel onLogged={() => setLogOpen(false)} />
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
    </ActivityRefreshProvider>
  )
}
