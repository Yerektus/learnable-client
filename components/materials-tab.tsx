"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Shuffle,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"

import { getApiErrorMessage } from "@/lib/api/auth"
import {
  deleteMaterial,
  generateMaterialsFromFile,
  getMaterial,
  listMaterials,
  type Flashcard,
  type MaterialListItem,
} from "@/lib/api/materials"
import { cn } from "@/lib/utils"

type ViewState =
  | { view: "none" }
  | { view: "notes-list" }
  | { view: "cards-list" }
  | { view: "note-detail"; materialId: string }
  | { view: "cards-viewer"; materialId: string }

export function MaterialsTab({ nodeId }: { nodeId: string }) {
  const queryClient = useQueryClient()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [prompt, setPrompt] = React.useState("")
  const [viewState, setViewState] = React.useState<ViewState>({ view: "none" })

  const materialsQuery = useQuery({
    queryKey: ["materials", nodeId],
    queryFn: () => listMaterials(nodeId),
    staleTime: 30_000,
  })

  const allMaterials = materialsQuery.data ?? []
  const savedNotes = allMaterials.filter((m) => m.type === "notes")
  const savedCards = allMaterials.filter((m) => m.type === "cards")

  const generateMutation = useMutation({
    mutationFn: (file: File) => generateMaterialsFromFile(nodeId, file, "both"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["materials", nodeId] })
      toast.success("Materials generated and saved")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  function handleFile(file: File) {
    generateMutation.mutate(file)
  }

  return (
    <>
      <div className="grid gap-8 py-6">
        {/* Generate */}
        <section className="grid gap-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Generate
          </h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional instructions for AI generation…"
            rows={2}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neutral-300 outline-none placeholder:text-neutral-600 transition-colors focus:border-white/20"
          />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ""
              }}
            />
            <button
              type="button"
              disabled={generateMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neutral-400 transition-colors hover:border-white/20 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  <span>Upload file &amp; generate</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Library */}
        <section className="grid gap-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Library
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <LibraryCard
              icon={FileText}
              label="Notes"
              count={savedNotes.length}
              isLoading={materialsQuery.isLoading}
              onClick={() => setViewState({ view: "notes-list" })}
            />
            <LibraryCard
              icon={BookOpen}
              label="Flashcards"
              count={savedCards.length}
              isLoading={materialsQuery.isLoading}
              onClick={() => setViewState({ view: "cards-list" })}
            />
          </div>
        </section>
      </div>

      {/* Overlays */}
      {viewState.view === "notes-list" && (
        <MaterialsListOverlay
          title="Notes"
          emptyLabel="notes"
          items={savedNotes}
          nodeId={nodeId}
          onSelect={(id) => setViewState({ view: "note-detail", materialId: id })}
          onClose={() => setViewState({ view: "none" })}
        />
      )}
      {viewState.view === "cards-list" && (
        <MaterialsListOverlay
          title="Flashcard Packs"
          emptyLabel="flashcard packs"
          items={savedCards}
          nodeId={nodeId}
          onSelect={(id) => setViewState({ view: "cards-viewer", materialId: id })}
          onClose={() => setViewState({ view: "none" })}
        />
      )}
      {viewState.view === "note-detail" && (
        <NoteDetailOverlay
          nodeId={nodeId}
          materialId={viewState.materialId}
          onClose={() => setViewState({ view: "notes-list" })}
        />
      )}
      {viewState.view === "cards-viewer" && (
        <CardsViewerOverlay
          nodeId={nodeId}
          materialId={viewState.materialId}
          onClose={() => setViewState({ view: "cards-list" })}
        />
      )}
    </>
  )
}

// ── Library card ──────────────────────────────────────────────

function LibraryCard({
  icon: Icon,
  label,
  count,
  isLoading,
  onClick,
}: {
  icon: React.ElementType
  label: string
  count: number
  isLoading: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05]"
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-white/5 transition-colors group-hover:bg-white/10">
        <Icon className="size-5 text-neutral-400 transition-colors group-hover:text-neutral-200" />
      </div>
      <div>
        <p className="text-base font-medium text-neutral-200">{label}</p>
        <p className="mt-0.5 text-sm text-neutral-500">
          {isLoading ? (
            <span className="inline-block h-3 w-10 animate-pulse rounded bg-white/10" />
          ) : count === 0 ? (
            "Empty"
          ) : (
            `${count} saved`
          )}
        </p>
      </div>
    </button>
  )
}

// ── Shared list overlay ───────────────────────────────────────

function MaterialsListOverlay({
  title,
  emptyLabel,
  items,
  nodeId,
  onSelect,
  onClose,
}: {
  title: string
  emptyLabel: string
  items: MaterialListItem[]
  nodeId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (materialId: string) => deleteMaterial(nodeId, materialId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["materials", nodeId] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white/10 hover:text-neutral-200"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-600">
              No saved {emptyLabel} yet.
            </p>
          ) : (
            <ul className="grid gap-0.5">
              {items.map((item) => (
                <li key={item.id} className="group flex items-center gap-2 rounded-xl px-3 py-3 hover:bg-white/[0.05]">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelect(item.id)}
                  >
                    <p className="truncate text-sm font-medium text-neutral-200">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-600">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                    className="shrink-0 rounded-lg p-1.5 text-neutral-600 opacity-0 transition-all hover:bg-red-950/40 hover:text-red-400 group-hover:opacity-100 disabled:opacity-30"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Note detail overlay (fullscreen) ─────────────────────────

function NoteDetailOverlay({
  nodeId,
  materialId,
  onClose,
}: {
  nodeId: string
  materialId: string
  onClose: () => void
}) {
  const materialQuery = useQuery({
    queryKey: ["material", nodeId, materialId],
    queryFn: () => getMaterial(nodeId, materialId),
    staleTime: 60_000,
  })

  const material = materialQuery.data

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white/10 hover:text-neutral-200"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h2 className="flex-1 truncate text-sm font-semibold text-neutral-100">
          {material?.title ?? "Note"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white/10 hover:text-neutral-200"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        {materialQuery.isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-neutral-600" />
          </div>
        ) : material ? (
          <div className="prose prose-invert prose-sm mx-auto max-w-2xl [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {material.content}
            </ReactMarkdown>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Flashcard viewer overlay (fullscreen) ────────────────────

function CardsViewerOverlay({
  nodeId,
  materialId,
  onClose,
}: {
  nodeId: string
  materialId: string
  onClose: () => void
}) {
  const materialQuery = useQuery({
    queryKey: ["material", nodeId, materialId],
    queryFn: () => getMaterial(nodeId, materialId),
    staleTime: 60_000,
  })

  const [cards, setCards] = React.useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isFlipped, setIsFlipped] = React.useState(false)

  React.useEffect(() => {
    if (materialQuery.data?.cards) {
      setCards(materialQuery.data.cards)
      setCurrentIndex(0)
      setIsFlipped(false)
    }
  }, [materialQuery.data])

  function goTo(index: number) {
    setCurrentIndex(index)
    setIsFlipped(false)
  }

  function shuffle() {
    setCards((prev) => {
      const arr = [...prev]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    })
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  const card = cards[currentIndex]
  const total = cards.length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white/10 hover:text-neutral-200"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h2 className="flex-1 truncate text-sm font-semibold text-neutral-100">
          {materialQuery.data?.title ?? "Flashcards"}
        </h2>
        <button
          type="button"
          onClick={shuffle}
          disabled={total === 0}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-white/20 hover:text-neutral-200 disabled:opacity-30"
        >
          <Shuffle className="size-3.5" />
          Shuffle
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white/10 hover:text-neutral-200"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Card area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
        {materialQuery.isLoading ? (
          <Loader2 className="size-8 animate-spin text-neutral-600" />
        ) : card ? (
          <>
            <p className="text-sm tabular-nums text-neutral-500">
              {currentIndex + 1} / {total}
            </p>

            {/* Flip card */}
            <div
              className="w-full max-w-lg cursor-pointer select-none"
              style={{ perspective: "1200px" }}
              onClick={() => setIsFlipped((v) => !v)}
            >
              <div
                style={{
                  transformStyle: "preserve-3d",
                  transition: "transform 0.45s ease",
                  transform: isFlipped ? "rotateY(180deg)" : "none",
                  height: "260px",
                  position: "relative",
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-8"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                    Question
                  </p>
                  <p className="flex-1 text-base leading-relaxed text-neutral-100">
                    {card.front}
                  </p>
                  <p className="mt-4 text-xs text-neutral-600">
                    Click to reveal answer
                  </p>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 flex flex-col rounded-2xl border border-white/10 bg-indigo-950/25 px-8 py-8"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-indigo-400/60">
                    Answer
                  </p>
                  <p className="flex-1 text-base leading-relaxed text-neutral-200">
                    {card.back}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="flex size-11 items-center justify-center rounded-xl border border-white/10 text-neutral-400 transition-colors hover:border-white/20 hover:text-neutral-200 disabled:opacity-30"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(currentIndex + 1)}
                disabled={currentIndex === total - 1}
                className="flex size-11 items-center justify-center rounded-xl border border-white/10 text-neutral-400 transition-colors hover:border-white/20 hover:text-neutral-200 disabled:opacity-30"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-neutral-600">No cards in this pack.</p>
        )}
      </div>
    </div>
  )
}
