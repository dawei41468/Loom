import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Layout
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0",
      // Visible track border in both themes
      "border border-[hsl(var(--loom-border))] dark:border-[hsl(var(--loom-border-strong))]",
      // Track colors with good contrast
      "transition-colors data-[state=checked]:bg-[hsl(var(--loom-primary))] data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600",
      // Focus ring (offset blends with app surface)
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--loom-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
      // Disabled state
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // Size & shape
        "pointer-events-none block h-5 w-5 rounded-full",
        // Thumb fill (high contrast on both themes)
        "bg-white dark:bg-gray-200",
        // No border for cleaner look
        // Elevation
        "shadow-sm",
        // Motion (respect reduced motion) — with inner padding, 6 translates end-to-end
        "transition-transform motion-reduce:transition-none data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
