"use client"

import { LogOut } from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuthStore } from "@/lib/stores/auth-store"

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return (
    <AuthGuard>
      <main className="min-h-svh bg-background p-6 md:p-10">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Protected client route
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={clearAuth}>
                <LogOut />
                Logout
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current user</CardTitle>
              <CardDescription>
                Loaded from core-api and persisted in Zustand
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div>Email: {user?.email ?? "Unknown"}</div>
              <div>Username: {user?.username ?? "Unknown"}</div>
              <div>Role: {user?.role ?? "Unknown"}</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AuthGuard>
  )
}
