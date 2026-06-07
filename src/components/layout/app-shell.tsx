import { useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import {
  CalendarDaysIcon,
  CirclePlusIcon,
  ClipboardListIcon,
  MenuIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { LogPanel } from "@/components/log/log-panel"
import { ActivityRefreshProvider } from "@/contexts/activity-refresh-context"
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
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { to: "/today", label: "Timeline", icon: CalendarDaysIcon },
  { to: "/schedule", label: "Schedule", icon: ClipboardListIcon },
  { to: "/family", label: "Family", icon: UsersIcon },
]

const FAB_BOTTOM = "calc(1rem + env(safe-area-inset-bottom, 0px))"
const FAB_CLASS = "size-14 rounded-full shadow-lg"

function isNavItemActive(pathname: string, to: string) {
  return pathname === to || pathname.endsWith(to)
}

function NavMenuItem({ item }: { item: NavItem }) {
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
        {item.label}
      </NavLink>
    </DropdownMenuItem>
  )
}

export function AppShell() {
  const [logOpen, setLogOpen] = useState(false)

  return (
    <ActivityRefreshProvider>
      <div className="bg-background flex h-svh flex-col overflow-hidden">
      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        <Outlet />
      </main>

      {!logOpen && (
        <div
          className="fixed right-4 z-50 flex items-center gap-3"
          style={{ bottom: FAB_BOTTOM }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                aria-label="Open navigation menu"
                className={FAB_CLASS}
              >
                <MenuIcon className="size-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="min-w-52 p-2">
              <DropdownMenuGroup>
                {NAV.map((item) => (
                  <NavMenuItem key={item.to} item={item} />
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="icon"
            variant="secondary"
            aria-label="Log activity"
            className={FAB_CLASS}
            onClick={() => setLogOpen(true)}
          >
            <CirclePlusIcon className="size-6" />
          </Button>
        </div>
      )}

      <Drawer open={logOpen} onOpenChange={setLogOpen} direction="bottom">
        <DrawerContent className="flex max-h-[88vh] flex-col bg-background pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex min-h-0 flex-1 flex-col">
            <LogPanel onLogged={() => setLogOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>
      </div>
    </ActivityRefreshProvider>
  )
}
