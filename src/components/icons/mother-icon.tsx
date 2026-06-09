import { forwardRef } from "react"
import type { LucideProps } from "lucide-react"

export const MotherIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      <circle cx="9" cy="5.5" r="2.75" />
      <path d="M3.5 21v-1.5A6.5 6.5 0 0 1 10 13h.5" />
      <circle cx="16.5" cy="13.5" r="2.5" />
      <path d="M10 13.5a8 8 0 0 0 10.5 6.2" />
    </svg>
  ),
)

MotherIcon.displayName = "MotherIcon"
