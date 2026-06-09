import { useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { BabyIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { useAuth } from "@/contexts/auth-context"
import { isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function LoginPage() {
  const { t } = useTranslation()
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/today" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      toast.success(t("auth.welcomeBack"))
      navigate("/today")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.signInFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-5">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
            <BabyIcon className="size-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">
            {t("auth.trackerTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <Alert>
            <AlertTitle>{t("auth.supabaseNotConfigured")}</AlertTitle>
            <AlertDescription>
              Copy <code className="text-xs">.env.example</code> to{" "}
              <code className="text-xs">.env.local</code>, add your Supabase URL
              and anon key, then run the SQL in{" "}
              <code className="text-xs">supabase/schema.sql</code>.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("auth.signIn")}</CardTitle>
            <CardDescription>{t("auth.signInDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">{t("common.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={submitting || !isSupabaseConfigured}>
                {submitting ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-center text-sm">
          {t("auth.newMember")}{" "}
          <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">
            {t("auth.createAccount")}
          </Link>
        </p>
      </div>
    </div>
  )
}
