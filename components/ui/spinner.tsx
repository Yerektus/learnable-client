import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof Loader2>) {
  return (
    <Loader2
      aria-hidden="true"
      data-slot="spinner"
      className={cn("size-5 animate-spin text-muted-foreground", className)}
      {...props}
    />
  )
}

function FullPageSpinner({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="status"
      className={cn(
        "flex min-h-svh items-center justify-center bg-background",
        className
      )}
      {...props}
    >
      <Spinner className="size-6" />
      <span className="sr-only">Loading</span>
    </div>
  )
}

export { FullPageSpinner, Spinner }
