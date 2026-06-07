import { useAuth } from "@/contexts/auth-context"
import { ScheduleTimeline } from "@/components/today/schedule-timeline"

export function TodayPage() {
  const { baby } = useAuth()

  if (!baby) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScheduleTimeline babyId={baby.id} />
    </div>
  )
}
