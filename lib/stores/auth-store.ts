"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { TokenResponse, User } from "@/types/auth"

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
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
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setTokens: (tokens) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),
      setUser: (user) => set({ user }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
        }),
    }),
    {
      name: "learnable-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
