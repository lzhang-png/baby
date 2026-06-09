import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

type SegmentedControlOption<T extends string> = {
  value: T
  label: string
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  iconClassName?: string
}

type SegmentedControlProps<T extends string> = {
  value: T
  onValueChange: (value: T) => void
  options: SegmentedControlOption<T>[]
  disabled?: boolean
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  disabled,
  className,
}: SegmentedControlProps<T>) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  return (
    <div
      role="radiogroup"
      className={cn(
        "relative grid h-9 w-full rounded-lg border border-input bg-input/30 p-0.5",
        disabled && "opacity-50",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-md bg-secondary shadow-sm transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {options.map((option) => {
        const selected = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            className={cn(
              "relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-md px-1 text-sm font-medium transition-colors outline-none select-none",
              "focus-visible:ring-2 focus-visible:ring-ring/50",
              selected
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
              disabled && "cursor-not-allowed",
            )}
            onClick={() => onValueChange(option.value)}
          >
            {Icon && (
              <Icon
                aria-hidden
                className={cn("size-4 shrink-0", option.iconClassName)}
              />
            )}
            <span className="truncate">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
