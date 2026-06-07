import { Navigate, Outlet } from "react-router-dom"

import { useAuth } from "@/contexts/auth-context"
import { isSupabaseConfigured } from "@/lib/supabase"

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (!isSupabaseConfigured) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
