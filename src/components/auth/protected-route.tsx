import { Navigate, Outlet } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { useAuth } from "@/contexts/auth-context"
import { isSupabaseConfigured } from "@/lib/supabase"

export function ProtectedRoute() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()

  if (!isSupabaseConfigured) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
