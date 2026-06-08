import { CopyIcon, LogOutIcon } from "lucide-react"
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
export function FamilyPage() {
  const { user, household, signOut } = useAuth()

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
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm">
            Household: <span className="font-medium">{household?.name}</span>
          </p>
          <Button variant="destructive" onClick={() => signOut()}>
            <LogOutIcon data-icon="inline-start" />
            Sign out
          </Button>
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
          <Button variant="outline" onClick={copyInvite}>
            <CopyIcon data-icon="inline-start" />
            Copy code
          </Button>
          <div className="border-t pt-3">
            <p className="text-sm font-medium">How to add family</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Send them the invite code. They go to Sign up, enter the code, and
              they'll see the same logs and schedule. Each person uses their own
              email and password.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
