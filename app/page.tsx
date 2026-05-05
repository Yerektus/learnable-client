import { Suspense } from "react"

import { GuestGuard } from "@/components/auth/guest-guard"
import { LoginForm } from "@/components/auth/login-form"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <GuestGuard>
        <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </GuestGuard>
    </Suspense>
  )
}
