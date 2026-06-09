import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { useAuth } from "@/contexts/auth-context"
import { ensureHousehold } from "@/lib/api/household"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SetupHouseholdPage() {
  const { t } = useTranslation()
  const { user, refreshHousehold } = useAuth()
  const [inviteCode, setInviteCode] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const displayName =
    user?.user_metadata?.display_name ??
    user?.email?.split("@")[0] ??
    t("common.family")

  async function handleCreate() {
    setSubmitting(true)
    try {
      await ensureHousehold(displayName)
      await refreshHousehold()
      toast.success(t("auth.familySetUp"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.setupFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await ensureHousehold(displayName, inviteCode)
      await refreshHousehold()
      toast.success(t("auth.joinedFamily"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.joinFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("auth.joinFamily")}
        </h1>
        <p className="text-muted-foreground max-w-md text-sm">
          {t("auth.joinFamilyDescription")}
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">{t("auth.household")}</CardTitle>
          <CardDescription>
            {t("auth.signedInAs")} {user?.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="w-full">
              <TabsTrigger value="create" className="flex-1">
                {t("auth.firstSetup")}
              </TabsTrigger>
              <TabsTrigger value="join" className="flex-1">
                {t("auth.haveInviteCode")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="flex flex-col gap-4 pt-4">
              <p className="text-muted-foreground text-sm">
                {t("auth.firstSetupDescription")}
              </p>
              <Button onClick={handleCreate} disabled={submitting}>
                {t("auth.setUpFamily")}
              </Button>
            </TabsContent>
            <TabsContent value="join" className="pt-4">
              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="code">{t("auth.inviteCode")}</Label>
                  <Input
                    id="code"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  />
                </div>
                <Button type="submit" disabled={submitting}>
                  {t("auth.joinFamilyButton")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
