import { Outlet } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { useAuth } from "@/contexts/auth-context"
import { SetupHouseholdPage } from "@/pages/setup-household-page"

export function HouseholdGate() {
  const { t } = useTranslation()
  const { household, loading, householdLoading } = useAuth()

  if (loading || householdLoading) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      </div>
    )
  }

  if (!household) {
    return <SetupHouseholdPage />
  }

  return <Outlet />
}
