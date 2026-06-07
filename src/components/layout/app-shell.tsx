import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import {
  CalendarDaysIcon,
  CirclePlusIcon,
  ClipboardListIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { LogPanel } from "@/components/log/log-panel"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { to: "/today", label: "Today", icon: CalendarDaysIcon },
  { to: "/schedule", label: "Schedule", icon: ClipboardListIcon },
  { to: "/family", label: "Family", icon: UsersIcon },
]

function NavTab({ item }: { item: NavItem }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-2 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground",
        )
      }
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="truncate text-[10px] font-medium leading-none">
        {item.label}
      </span>
    </NavLink>
  )
}

export function AppShell() {
  const { baby } = useAuth()
  const [logOpen, setLogOpen] = useState(false)

  return (
    <div className="bg-background min-h-svh">
      <main className="mx-auto max-w-5xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:px-5">
        <Outlet />
      </main>

      <nav
        aria-label="Main navigation"
        className="border-t bg-background/95 fixed inset-x-0 bottom-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex max-w-5xl items-stretch justify-around">
          {NAV.map((item) => (
            <NavTab key={item.to} item={item} />
          ))}
        </div>
      </nav>

      {!logOpen && (
        <Button
          size="icon"
          aria-label="Log activity"
          className="fixed right-4 z-50 size-14 rounded-full shadow-lg"
          style={{
            bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))",
          }}
          onClick={() => setLogOpen(true)}
        >
          <CirclePlusIcon className="size-6" />
        </Button>
      )}

      <Drawer open={logOpen} onOpenChange={setLogOpen} direction="bottom">
        <DrawerContent className="max-h-[88vh]">
          <DrawerHeader>
            <DrawerTitle>Log activity</DrawerTitle>
            <DrawerDescription>
              Quick-add feeds, sleep, diapers, and pumping for{" "}
              {baby?.name ?? "Luca"}.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <LogPanel onLogged={() => setLogOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
