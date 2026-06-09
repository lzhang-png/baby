import { useLayoutEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Animates height changes of its children. Children render at natural height
 * inside an inner wrapper; the outer wrapper transitions to match.
 */
export function AnimatedHeight({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      setHeight(el.offsetHeight)
    })
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={cn(
        "overflow-hidden transition-[height] duration-300 ease-out",
        className,
      )}
      style={{ height: height ?? "auto" }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  )
}
