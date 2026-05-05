"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

const subscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

export function ThemeToggle() {
  const mounted = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )
  const { resolvedTheme, setTheme } = useTheme()

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" aria-label="Toggle theme" disabled />
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="outline"
      size="icon"
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}
