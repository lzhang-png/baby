import { useTranslation } from "react-i18next"
import {
  EyeIcon,
  EyeOffIcon,
  MilkIcon,
  MoonIcon,
  type LucideIcon,
} from "lucide-react"

import { PumpIcon } from "@/components/icons/pump-icon"
import { DiaperIcon } from "@/components/icons/diaper-icon"
import { RECORDED_COLORS } from "@/components/today/recorded-events"
import {
  useTimelineFilter,
} from "@/contexts/timeline-filter-context"
import type { TimelineLogKind } from "@/lib/timeline-filter"
import {
  DrawerHandle,
  DrawerHandleBar,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

const FILTER_ITEMS: {
  kind: TimelineLogKind
  labelKey: "log.feed" | "log.sleep" | "log.diaper" | "log.pump"
  icon: LucideIcon | typeof PumpIcon | typeof DiaperIcon
}[] = [
  { kind: "feed", labelKey: "log.feed", icon: MilkIcon },
  { kind: "sleep", labelKey: "log.sleep", icon: MoonIcon },
  { kind: "diaper", labelKey: "log.diaper", icon: DiaperIcon },
  { kind: "pump", labelKey: "log.pump", icon: PumpIcon },
]

export function TimelineFilterPanel() {
  const { t } = useTranslation()
  const { isKindHidden, toggleKind } = useTimelineFilter()

  return (
    <DrawerHandle className="min-w-0 flex-col">
      <div className="flex w-full justify-center py-2">
        <DrawerHandleBar />
      </div>
      <section className="flex min-w-0 flex-col">
        <DrawerHeader>
          <DrawerTitle>{t("timeline.filterTitle")}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-1 px-4 pb-4">
          {FILTER_ITEMS.map(({ kind, labelKey, icon: Icon }) => {
            const hidden = isKindHidden(kind)
            return (
              <button
                key={kind}
                type="button"
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium transition-colors hover:bg-muted/60",
                  hidden && "bg-secondary",
                )}
                aria-pressed={hidden}
                onClick={() => toggleKind(kind)}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-5 shrink-0",
                    hidden ? "opacity-40" : RECORDED_COLORS[kind],
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1",
                    hidden && "text-muted-foreground",
                  )}
                >
                  {t(labelKey)}
                </span>
                {hidden ? (
                  <EyeOffIcon
                    aria-hidden
                    className="text-muted-foreground size-5 shrink-0"
                  />
                ) : (
                  <EyeIcon
                    aria-hidden
                    className="size-5 shrink-0 opacity-50"
                  />
                )}
              </button>
            )
          })}
        </div>
      </section>
    </DrawerHandle>
  )
}
