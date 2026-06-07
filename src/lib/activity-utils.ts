import type { ActivityItem } from "@/lib/types"

const IMPORTED_BABY_ID = "baby-tracker"

export function isEditableActivity(item: ActivityItem) {
  return item.data.baby_id !== IMPORTED_BABY_ID
}
