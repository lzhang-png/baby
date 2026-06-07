import { Outlet } from "react-router-dom"

import { useAuth } from "@/contexts/auth-context"
import { SetupHouseholdPage } from "@/pages/setup-household-page"

export function HouseholdGate() {
  const { household, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  if (!household) {
    return <SetupHouseholdPage />
  }

  return <Outlet />
}
