"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { usePathname, useRouter } from "next/navigation"

import { FullPageSpinner } from "@/components/ui/spinner"
import { getCurrentUser, silentRefresh } from "@/lib/api/auth"
import { useAuthStore } from "@/lib/stores/auth-store"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)

  // After hydration: if there's no access token in memory (not persisted),
  // try to get one via the httpOnly refresh cookie before redirecting to login.
  const [silentRefreshDone, setSilentRefreshDone] = React.useState(false)

  React.useEffect(() => {
    if (!hasHydrated) return

    if (accessToken) {
      setSilentRefreshDone(true)
      return
    }

    silentRefresh().then((token) => {
      if (token) {
        setTokens({ access_token: token, token_type: "bearer" })
      }
    }).finally(() => {
      setSilentRefreshDone(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated])

  const profileQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: hasHydrated && silentRefreshDone && Boolean(accessToken),
    retry: false,
  })

  React.useEffect(() => {
    if (!hasHydrated || !silentRefreshDone) return

    if (!accessToken) {
      router.replace(`/?next=${encodeURIComponent(pathname)}`)
    }
  }, [accessToken, hasHydrated, silentRefreshDone, pathname, router])

  React.useEffect(() => {
    if (profileQuery.data) {
      setUser(profileQuery.data)
    }
  }, [profileQuery.data, setUser])

  if (!hasHydrated || !silentRefreshDone || !accessToken || (!user && profileQuery.isLoading)) {
    return <FullPageSpinner />
  }

  return children
}
