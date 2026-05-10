"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, Sparkles } from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { Button } from "@/components/ui/button"
import { streamDeadlinePrep } from "@/lib/api/ai"

export default function DeadlinePrepPage() {
  return (
    <AuthGuard>
      <React.Suspense fallback={<PageSkeleton />}>
        <DeadlinePrepContent />
      </React.Suspense>
    </AuthGuard>
  )
}

function DeadlinePrepContent() {
  const params = useParams<{ deadlineId: string }>()
  const searchParams = useSearchParams()
  const deadlineId = params.deadlineId
  const title = searchParams.get("title") ?? "Deadline preparation"
  const date = searchParams.get("date") ?? ""

  const [content, setContent] = React.useState("")
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const startPrep = React.useCallback(async () => {
    if (isStreaming) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setContent("")
    setError(null)
    setIsStreaming(true)

    try {
      for await (const chunk of streamDeadlinePrep(deadlineId, controller.signal)) {
        setContent((prev) => prev + chunk)
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Stream failed.")
      }
    } finally {
      setIsStreaming(false)
    }
  }, [deadlineId, isStreaming])

  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return (
    <div className="flex min-h-svh flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex flex-col">
          <h1 className="text-base font-medium text-neutral-100">{title}</h1>
          {date && <span className="text-xs text-neutral-500">{date}</span>}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">
              Deadline preparation
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              AI generates a personalised study plan based on your error history
              for this deadline.
            </p>
          </div>
          <Button onClick={startPrep} disabled={isStreaming} className="shrink-0 gap-2">
            <Sparkles className="size-4" />
            {isStreaming ? "Generating…" : "Start preparation"}
          </Button>
        </div>

        {error && (
          <p className="rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {content || isStreaming ? (
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-relaxed text-neutral-200 whitespace-pre-wrap"
          >
            {content}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-neutral-400" />
            )}
          </div>
        ) : (
          !error && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 py-20 text-center">
              <Sparkles className="size-8 text-neutral-700" />
              <p className="text-sm text-neutral-600">
                Click &ldquo;Start preparation&rdquo; to generate your study
                plan.
              </p>
            </div>
          )
        )}
      </main>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="flex min-h-svh flex-col bg-neutral-950 text-neutral-100">
      <div className="h-[57px] border-b border-white/10" />
    </div>
  )
}
