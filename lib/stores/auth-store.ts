"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { TokenResponse, User } from "@/types/auth"

type AuthState = {
  accessToken: string | null
  user: User | null
  hasHydrated: boolean
  setTokens: (tokens: TokenResponse) => void
  setUser: (user: User | null) => void
  setHasHydrated: (hasHydrated: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      hasHydrated: false,
      setTokens: (tokens) =>
        set({
          accessToken: tokens.access_token,
        }),
      setUser: (user) => set({ user }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      clearAuth: () =>
        set({
          accessToken: null,
          user: null,
        }),
    }),
    {
      name: "learnable-auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive user info — access token is kept in memory only
      // so it's not readable after page refresh (silent refresh via httpOnly cookie)
      partialize: (state) => ({
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
