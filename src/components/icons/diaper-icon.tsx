import { forwardRef } from "react"
import type { LucideProps } from "lucide-react"

export const DiaperIcon = forwardRef<SVGSVGElement, LucideProps>(
  (
    { className, color = "currentColor", size = 24, strokeWidth = 2, ...props },
    ref,
  ) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M5 4.5h14l1.1 6.2c.4 2.2-.3 4.4-1.9 6L15 20H9l-3.2-3.3c-1.6-1.6-2.3-3.8-1.9-6L5 4.5z" />
      <path d="M5.7 8.5H9c1.1 0 2-.9 2-2v-2" />
      <path d="M18.3 8.5H15c-1.1 0-2-.9-2-2v-2" />
      <path d="M8.8 20c.5-2.2 1.5-3.4 3.2-3.4s2.7 1.2 3.2 3.4" />
    </svg>
  ),
)

DiaperIcon.displayName = "DiaperIcon"
