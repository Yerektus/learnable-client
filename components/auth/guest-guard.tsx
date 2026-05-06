"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { FullPageSpinner } from "@/components/ui/spinner"
import { useAuthStore } from "@/lib/stores/auth-store"

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accessToken = useAuthStore((state) => state.accessToken)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)

  React.useEffect(() => {
    if (!hasHydrated || !accessToken) {
      return
    }

    router.replace(searchParams.get("next") ?? "/dashboard")
  }, [accessToken, hasHydrated, router, searchParams])

  if (!hasHydrated || accessToken) {
    return <FullPageSpinner />
  }

  return children
}
