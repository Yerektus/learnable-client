"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { usePathname, useRouter } from "next/navigation"

import { FullPageSpinner } from "@/components/ui/spinner"
import { getCurrentUser } from "@/lib/api/auth"
import { useAuthStore } from "@/lib/stores/auth-store"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const setUser = useAuthStore((state) => state.setUser)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const profileQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: hasHydrated && Boolean(accessToken),
    retry: false,
  })

  React.useEffect(() => {
    if (!hasHydrated) {
      return
    }

    if (!accessToken) {
      router.replace(`/?next=${encodeURIComponent(pathname)}`)
    }
  }, [accessToken, hasHydrated, pathname, router])

  React.useEffect(() => {
    if (profileQuery.data) {
      setUser(profileQuery.data)
    }
  }, [profileQuery.data, setUser])

  React.useEffect(() => {
    if (profileQuery.isError) {
      clearAuth()
      router.replace(`/?next=${encodeURIComponent(pathname)}`)
    }
  }, [clearAuth, pathname, profileQuery.isError, router])

  if (!hasHydrated || !accessToken || (!user && profileQuery.isLoading)) {
    return <FullPageSpinner />
  }

  return children
}
