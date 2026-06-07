import { useAuth } from "@/contexts/auth-context"
import { ScheduleTimeline } from "@/components/today/schedule-timeline"

export function TodayPage() {
  const { baby } = useAuth()

  if (!baby) return null

  return (
    <div className="flex min-h-[calc(100svh-5rem-env(safe-area-inset-bottom,0px)-3rem)] flex-col">
      <ScheduleTimeline babyId={baby.id} />
    </div>
  )
}
