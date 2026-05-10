"use client"

import { useMutation } from "@tanstack/react-query"
import {
  FileText,
  ImageIcon,
  Loader2,
  Music,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorMessage } from "@/lib/api/auth"
import { generateMaterialsFromFile, type Flashcard } from "@/lib/api/materials"

type UploadedFile = {
  id: string
  name: string
  size: number
  type: string
}

type Note = {
  id: string
  title: string
  content: string
  createdAt: Date
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon
  if (type.startsWith("video/")) return Video
  if (type.startsWith("audio/")) return Music
  if (type.includes("pdf") || type.includes("text")) return FileText
  return Paperclip
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MaterialsTab({ nodeId }: { nodeId: string }) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile | null>(
    null
  )
  const [generatedCards, setGeneratedCards] = React.useState<Flashcard[]>([])
  const [generatedNotes, setGeneratedNotes] = React.useState("")
  const [myNotes, setMyNotes] = React.useState<Note[]>([])
  const [isDragging, setIsDragging] = React.useState(false)
  const [noteTitle, setNoteTitle] = React.useState("")
  const [noteContent, setNoteContent] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const generateMutation = useMutation({
    mutationFn: (file: File) =>
      generateMaterialsFromFile(nodeId, file, "both"),
    onSuccess: (data) => {
      setGeneratedCards(data.cards)
      setGeneratedNotes(data.notes)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
      setUploadedFile(null)
    },
  })

  function handleFile(file: File) {
    setUploadedFile({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
    })
    setGeneratedCards([])
    setGeneratedNotes("")
    generateMutation.mutate(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function addNote() {
    if (!noteContent.trim()) return
    setMyNotes((prev) => [
      {
        id: crypto.randomUUID(),
        title: noteTitle.trim() || "Untitled",
        content: noteContent.trim(),
        createdAt: new Date(),
      },
      ...prev,
    ])
    setNoteTitle("")
    setNoteContent("")
  }

  const isPending = generateMutation.isPending
  const hasResults = generatedCards.length > 0 || generatedNotes.length > 0

  return (
    <div className="grid gap-10 py-6">
      {/* Upload */}
      <section className="grid gap-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          Upload
        </h2>

        {!uploadedFile ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            onKeyDown={(e) =>
              e.key === "Enter" && fileInputRef.current?.click()
            }
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 outline-none transition-colors ${
              isDragging
                ? "border-white/30 bg-white/5"
                : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
            }`}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-white/5">
              <Upload className="size-5 text-neutral-400" />
            </div>
            <div className="text-center">
              <p className="text-sm text-neutral-300">
                Drop a file here or{" "}
                <span className="text-white underline underline-offset-2">
                  click to upload
                </span>
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                AI will generate flashcards and notes
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ""
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            {(() => {
              const Icon = getFileIcon(uploadedFile.type)
              return (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/5">
                  <Icon className="size-4 text-neutral-400" />
                </div>
              )
            })()}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-neutral-200">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-neutral-500">
                {formatBytes(uploadedFile.size)}
                {isPending && (
                  <span className="ml-2 text-neutral-600">Generating…</span>
                )}
              </p>
            </div>
            {isPending ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-neutral-500" />
            ) : (
              <button
                onClick={() => {
                  setUploadedFile(null)
                  setGeneratedCards([])
                  setGeneratedNotes("")
                }}
                className="shrink-0 rounded p-1 text-neutral-600 hover:text-neutral-300"
                aria-label="Remove file"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* AI Generated — shown only after successful generation or while pending */}
      {(isPending || hasResults) && (
        <section className="grid gap-6">
          <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-neutral-500">
            <Sparkles className="size-3" />
            AI Generated
          </h2>

          {/* Flashcards */}
          <div className="grid gap-3">
            <p className="text-xs text-neutral-600">Flashcards</p>
            {isPending ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl bg-white/5" />
                ))}
              </div>
            ) : generatedCards.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {generatedCards.map((card, i) => (
                  <div
                    key={i}
                    className="grid divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]"
                  >
                    <div className="px-4 py-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                        Question
                      </p>
                      <p className="text-sm text-neutral-200">{card.front}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                        Answer
                      </p>
                      <p className="text-sm text-neutral-400">{card.back}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Notes */}
          <div className="grid gap-3">
            <p className="text-xs text-neutral-600">Notes</p>
            {isPending ? (
              <div className="grid gap-2">
                <Skeleton className="h-4 rounded bg-white/5" />
                <Skeleton className="h-4 w-5/6 rounded bg-white/5" />
                <Skeleton className="h-4 w-4/6 rounded bg-white/5" />
                <Skeleton className="h-4 w-5/6 rounded bg-white/5" />
                <Skeleton className="h-4 w-3/6 rounded bg-white/5" />
              </div>
            ) : generatedNotes ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                  {generatedNotes}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* My Notes */}
      <section className="grid gap-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          My Notes
        </h2>

        <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <Input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Title (optional)"
            className="border-transparent bg-transparent px-0 text-sm font-medium text-neutral-100 placeholder:text-neutral-600 focus-visible:ring-0"
          />
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Write a note…"
            rows={3}
            className="resize-none border-transparent bg-transparent px-0 text-sm text-neutral-300 placeholder:text-neutral-600 focus-visible:ring-0"
          />
          <div className="flex justify-end">
            <Button size="sm" disabled={!noteContent.trim()} onClick={addNote}>
              <Plus className="mr-1 size-3.5" />
              Add note
            </Button>
          </div>
        </div>

        {myNotes.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {myNotes.map((note) => (
              <div
                key={note.id}
                className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <button
                  onClick={() =>
                    setMyNotes((prev) => prev.filter((n) => n.id !== note.id))
                  }
                  className="absolute right-3 top-3 rounded p-1 text-neutral-600 opacity-0 transition-opacity hover:text-neutral-300 group-hover:opacity-100"
                  aria-label="Delete note"
                >
                  <Trash2 className="size-3.5" />
                </button>
                {note.title !== "Untitled" && (
                  <p className="mb-1 pr-6 text-sm font-medium text-neutral-200">
                    {note.title}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm text-neutral-400">
                  {note.content}
                </p>
                <p className="mt-3 text-xs text-neutral-600">
                  {note.createdAt.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
