import { useState } from "react"
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
  const { user, refreshHousehold } = useAuth()
  const [inviteCode, setInviteCode] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const displayName =
    user?.user_metadata?.display_name ??
    user?.email?.split("@")[0] ??
    "Family"

  async function handleCreate() {
    setSubmitting(true)
    try {
      await ensureHousehold(displayName)
      await refreshHousehold()
      toast.success("Family set up for Luca")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed")
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
      toast.success("Joined family")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Join failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Join your family</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Set up Luca's household or enter an invite code from someone already
          on the account.
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Household</CardTitle>
          <CardDescription>Signed in as {user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="w-full">
              <TabsTrigger value="create" className="flex-1">
                First setup
              </TabsTrigger>
              <TabsTrigger value="join" className="flex-1">
                Have invite code
              </TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="flex flex-col gap-4 pt-4">
              <p className="text-muted-foreground text-sm">
                Creates the family, Luca as baby, and your invite code for
                others.
              </p>
              <Button onClick={handleCreate} disabled={submitting}>
                Set up family
              </Button>
            </TabsContent>
            <TabsContent value="join" className="pt-4">
              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="code">Invite code</Label>
                  <Input
                    id="code"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  />
                </div>
                <Button type="submit" disabled={submitting}>
                  Join family
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
