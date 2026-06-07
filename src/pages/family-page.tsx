import { CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function FamilyPage() {
  const { user, household } = useAuth()

  function copyInvite() {
    if (!household?.invite_code) return
    navigator.clipboard.writeText(household.invite_code)
    toast.success("Invite code copied")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Family</h1>
        <p className="text-muted-foreground text-sm">
          Share the invite code so your partner or relatives can sign up and log
          for Luca.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signed in as</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Household: <span className="font-medium">{household?.name}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite code</CardTitle>
          <CardDescription>
            New members enter this on the sign-up page
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="font-mono text-2xl font-semibold tracking-widest">
            {household?.invite_code ?? "—"}
          </p>
          <Button variant="secondary" onClick={copyInvite}>
            <CopyIcon data-icon="inline-start" />
            Copy code
          </Button>
        </CardContent>
      </Card>

      <Alert>
        <AlertTitle>How to add family</AlertTitle>
        <AlertDescription>
          Send them the invite code. They go to Sign up, enter the code, and
          they'll see the same logs and schedule. Each person uses their own
          email and password.
        </AlertDescription>
      </Alert>
    </div>
  )
}
