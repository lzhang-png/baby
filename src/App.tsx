import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthProvider } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { HouseholdGate } from "@/components/auth/household-gate"
import { AppShell } from "@/components/layout/app-shell"
import { LoginPage } from "@/pages/login-page"
import { SignupPage } from "@/pages/signup-page"
import { TodayPage } from "@/pages/today-page"
import { SchedulePage } from "@/pages/schedule-page"
import { FamilyPage } from "@/pages/family-page"

export default function App() {
  return (
    <BrowserRouter basename="/baby">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route element={<HouseholdGate />}>
                <Route index element={<Navigate to="/today" replace />} />
                <Route path="today" element={<TodayPage />} />
                <Route path="log" element={<Navigate to="/today" replace />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="family" element={<FamilyPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
