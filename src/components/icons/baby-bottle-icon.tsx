import { forwardRef } from "react"
import type { LucideProps } from "lucide-react"

export const BabyBottleIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      <path d="M10.2 5c0-1.3.8-2.3 1.8-2.3s1.8 1 1.8 2.3" />
      <path d="M9.5 5h5v3h-5z" />
      <path d="M7.5 8h9l.9 9.1a3.3 3.3 0 0 1-3.3 3.6h-4.2a3.3 3.3 0 0 1-3.3-3.6L7.5 8z" />
      <path d="M7.8 12.5h2.2" />
      <path d="M8.1 16h2.2" />
    </svg>
  ),
)

BabyBottleIcon.displayName = "BabyBottleIcon"
