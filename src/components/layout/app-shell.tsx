import { NavLink, Outlet } from "react-router-dom"
import { BabyIcon, LogOutIcon } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/today", label: "Today" },
  { to: "/log", label: "Log" },
  { to: "/schedule", label: "Schedule" },
  { to: "/family", label: "Family" },
]

export function AppShell() {
  const { baby, signOut } = useAuth()

  return (
    <div className="bg-background min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
              <BabyIcon className="size-4" />
            </span>
            <span className="font-semibold tracking-tight">
              {baby?.name ?? "Luca"}
            </span>
          </div>
          <nav className="flex flex-1 items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-muted font-medium"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOutIcon data-icon="inline-start" />
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  )
}
