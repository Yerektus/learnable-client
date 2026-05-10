"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ArrowUp, Upload, X } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Spinner } from "@/components/ui/spinner"
import {
  generateGraphFromFile,
  streamPlanningPanel,
  type ChatMessage,
} from "@/lib/api/ai"
import { cn } from "@/lib/utils"

export function PlanningPanel({
  graphId,
  messages,
  onMessagesChange,
  onClose,
}: {
  graphId: string
  messages: ChatMessage[]
  onMessagesChange: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [input, setInput] = React.useState("")
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  function autoResizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    onMessagesChange((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "" },
    ])
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setIsStreaming(true)
    const history = messages

    try {
      for await (const chunk of streamPlanningPanel({
        graphId,
        message: trimmed,
        history,
      })) {
        onMessagesChange((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            }
          }
          return updated
        })
      }
    } catch {
      toast.error("Planning request failed")
      onMessagesChange((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role !== "assistant") return prev
        if (!last.content) return prev.slice(0, -1)
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...last,
          content: last.content + " ⚠ [прервано]",
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      void queryClient.invalidateQueries({ queryKey: ["graph-nodes", graphId] })
      void queryClient.invalidateQueries({ queryKey: ["graph-edges", graphId] })
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    setIsGenerating(true)
    try {
      const result = await generateGraphFromFile(graphId, file)
      await queryClient.invalidateQueries({
        queryKey: ["graph-nodes", graphId],
      })
      toast.success(`Graph generated: ${result.nodes_created} nodes created`)
    } catch {
      toast.error("Graph generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex w-[380px] shrink-0 flex-col border-l border-white/10 bg-neutral-950">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-medium text-neutral-100">
          ✦ planning panel
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex size-6 items-center justify-center rounded text-neutral-500 transition-colors hover:text-neutral-200"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Upload syllabus */}
      <div className="shrink-0 border-b border-white/10 px-4 py-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          disabled={isGenerating}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-neutral-400 transition-colors hover:border-white/20 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Spinner className="size-3.5" />
              Generating graph...
            </>
          ) : (
            <>
              <Upload className="size-3.5" />
              Upload syllabus
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-neutral-400">
              Ask me to build or edit your learning graph
            </p>
            <p className="text-xs text-neutral-600">
              e.g. &quot;Add a node about recursion after Binary Search&quot;
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {msg.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-neutral-700 px-3 py-2 text-sm text-neutral-100">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">
                  {msg.content}
                  {isStreaming && i === messages.length - 1 && (
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-neutral-400 align-middle" />
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-2.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              autoResizeTextarea()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask to add, remove, or connect nodes..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500 disabled:opacity-50"
            style={{ minHeight: "24px", maxHeight: "96px" }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-neutral-100 transition-colors hover:bg-neutral-600 disabled:opacity-40"
          >
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
