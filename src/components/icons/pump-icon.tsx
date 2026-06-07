import { forwardRef } from "react"
import type { LucideProps } from "lucide-react"

export const PumpIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, color = "currentColor", size = 24, strokeWidth = 2, ...props }, ref) => (
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
      <path d="M7.5 3h9l1.75 4.75a.5.5 0 0 1-.48.65H6.23a.5.5 0 0 1-.48-.65L7.5 3z" />
      <circle cx="12" cy="6.2" r="0.9" fill="currentColor" stroke="none" />
      <path d="M12 8.4V10" />
      <rect x="9.5" y="10" width="5" height="3.5" rx="0.75" />
      <path d="M10 13.5h4c.55 0 1 .4 1 .9V19c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2v-4.6c0-.5.45-.9 1-.9z" />
      <path d="M9.5 21h5" />
    </svg>
  ),
)

PumpIcon.displayName = "PumpIcon"
