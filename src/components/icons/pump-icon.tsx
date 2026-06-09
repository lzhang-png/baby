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
      <path d="M7 3.5h10l1.4 4.2a.7.7 0 0 1-.65.9H6.25a.7.7 0 0 1-.65-.9L7 3.5z" />
      <path d="M9 8.6c.7 1.1 1.7 1.7 3 1.7s2.3-.6 3-1.7" />
      <path d="M10 10.3h4v3.2h-4z" />
      <path d="M9 13.5h6l.8 6.1c.1.8-.5 1.4-1.3 1.4h-5c-.8 0-1.4-.6-1.3-1.4L9 13.5z" />
      <path d="M10.2 16.2h1.3" />
      <path d="M10.2 18.4h1.3" />
    </svg>
  ),
)

PumpIcon.displayName = "PumpIcon"
