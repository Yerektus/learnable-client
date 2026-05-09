"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { SquarePen, Plus, Sparkles, X, Trash2, Link } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { getApiErrorMessage } from "@/lib/api/auth"
import { listNodes, type GraphNode } from "@/lib/api/graphs"
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
  type Task,
  type TaskStatus,
} from "@/lib/api/tasks"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: {
  id: TaskStatus
  label: string
  dot: string
  cardBg: string
  colBg: string
  newTaskHover: string
}[] = [
  {
    id: "backlog",
    label: "backlog",
    dot: "bg-neutral-500",
    cardBg: "bg-neutral-900 border-white/[0.07] hover:border-white/[0.14]",
    colBg: "bg-neutral-900/40 border-white/[0.07]",
    newTaskHover: "hover:border-white/20 hover:text-neutral-300",
  },
  {
    id: "not_started",
    label: "not started",
    dot: "bg-neutral-400",
    cardBg: "bg-neutral-900 border-white/[0.07] hover:border-white/[0.14]",
    colBg: "bg-neutral-900/40 border-white/[0.07]",
    newTaskHover: "hover:border-white/20 hover:text-neutral-300",
  },
  {
    id: "in_progress",
    label: "in progress",
    dot: "bg-blue-500",
    cardBg: "bg-neutral-900 border-white/[0.07] hover:border-white/[0.14]",
    colBg: "bg-neutral-900/40 border-white/[0.07]",
    newTaskHover: "hover:border-white/20 hover:text-neutral-300",
  },
  {
    id: "done",
    label: "done",
    dot: "bg-green-500",
    cardBg: "bg-green-950/30 border-green-900/40 hover:border-green-700/50",
    colBg: "bg-green-950/20 border-green-900/30",
    newTaskHover: "hover:border-green-800/60 hover:text-green-300",
  },
]

// ─── KanbanBoard ──────────────────────────────────────────────────────────────

export function KanbanBoard({ graphId }: { graphId: string }) {
  const queryClient = useQueryClient()
  const [createStatus, setCreateStatus] = React.useState<TaskStatus | null>(null)
  const [editTask, setEditTask] = React.useState<Task | null>(null)

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: listTasks,
  })

  const nodesQuery = useQuery({
    queryKey: ["nodes", graphId],
    queryFn: () => listNodes(graphId),
  })

  const tasks = (tasksQuery.data ?? []).filter((t) => t.graph_id === graphId)
  const nodes = nodesQuery.data ?? []

  const moveMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTask(taskId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Task deleted.")
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  if (tasksQuery.isLoading) return <KanbanSkeleton />

  return (
    <>
      {/* Planning panel button */}
      <div className="mb-4 flex items-center justify-end">
        <button className="flex items-center gap-2 rounded-full border border-white/15 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:border-white/25 hover:bg-neutral-800">
          <Sparkles className="size-4 text-indigo-400" />
          planning panel
        </button>
      </div>

      {/* Board */}
      <div className="grid h-full items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            tasks={tasks.filter((t) => t.status === col.id)}
            nodes={nodes}
            otherColumns={COLUMNS.filter((c) => c.id !== col.id)}
            onAddTask={() => setCreateStatus(col.id)}
            onMoveTask={(taskId, status) =>
              moveMutation.mutate({ taskId, status })
            }
            onEditTask={setEditTask}
            onDeleteTask={(taskId) => {
              deleteMutation.mutate(taskId)
              if (editTask?.id === taskId) setEditTask(null)
            }}
          />
        ))}
      </div>

      <CreateTaskDialog
        open={createStatus !== null}
        graphId={graphId}
        initialStatus={createStatus ?? "not_started"}
        nodes={nodes}
        onClose={() => setCreateStatus(null)}
      />

      <EditTaskDialog
        task={editTask}
        nodes={nodes}
        otherColumns={COLUMNS}
        onMove={(taskId, status) => moveMutation.mutate({ taskId, status })}
        onDelete={(taskId) => {
          deleteMutation.mutate(taskId)
          setEditTask(null)
        }}
        onClose={() => setEditTask(null)}
      />
    </>
  )
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  tasks,
  nodes,
  onAddTask,
  onEditTask,
}: {
  col: (typeof COLUMNS)[number]
  tasks: Task[]
  nodes: GraphNode[]
  otherColumns: (typeof COLUMNS)[number][]
  onAddTask: () => void
  onMoveTask: (taskId: string, status: TaskStatus) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}) {
  return (
    <section
      className={cn("flex flex-col gap-3 rounded-2xl border p-4", col.colBg)}
    >
      <div className="flex items-center gap-2 pb-1">
        <span className={cn("size-2 rounded-full", col.dot)} />
        <h2 className="text-sm font-medium text-neutral-300">{col.label}</h2>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            nodes={nodes}
            cardBg={col.cardBg}
            onEdit={() => onEditTask(task)}
          />
        ))}
      </div>

      <button
        onClick={onAddTask}
        className={cn(
          "mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-sm text-neutral-600 transition-colors",
          col.newTaskHover,
        )}
      >
        <Plus className="size-4" />
        New task
      </button>
    </section>
  )
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  nodes,
  cardBg,
  onEdit,
}: {
  task: Task
  nodes: GraphNode[]
  cardBg: string
  onEdit: () => void
}) {
  const linkedNode = nodes.find((n) => n.id === task.topic_id)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => e.key === "Enter" && onEdit()}
      className={cn(
        "group flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-colors",
        cardBg,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-neutral-100">
          {task.title}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="shrink-0 rounded p-0.5 text-neutral-600 opacity-0 transition-opacity hover:text-neutral-300 group-hover:opacity-100"
        >
          <SquarePen className="size-3.5" />
        </button>
      </div>

      {task.description && (
        <p className="line-clamp-1 text-xs text-neutral-500">
          {task.description}
        </p>
      )}

      {(linkedNode || task.tags.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {linkedNode && (
            <span className="flex items-center gap-1 rounded-full border border-blue-800/60 bg-blue-950/40 px-2.5 py-0.5 text-xs text-blue-300">
              <Link className="size-3" />
              {linkedNode.title}
            </span>
          )}
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/[0.12] bg-white/[0.04] px-2.5 py-0.5 text-xs text-neutral-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── NodeSelector ─────────────────────────────────────────────────────────────

function NodeSelector({
  nodes,
  selectedId,
  onChange,
  disabled,
}: {
  nodes: GraphNode[]
  selectedId: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
}) {
  if (nodes.length === 0) {
    return (
      <p className="text-xs text-neutral-600">
        No nodes in this graph yet.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(null)}
        className={cn(
          "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
          selectedId === null
            ? "border-neutral-500 bg-neutral-700 text-neutral-200"
            : "border-white/10 bg-white/[0.03] text-neutral-500 hover:border-white/20 hover:text-neutral-300",
        )}
      >
        none
      </button>

      {nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(node.id === selectedId ? null : node.id)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            selectedId === node.id
              ? "border-blue-800/60 bg-blue-950/40 text-blue-300"
              : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:text-neutral-200",
          )}
        >
          {selectedId === node.id && <Link className="size-3" />}
          {node.title}
        </button>
      ))}
    </div>
  )
}

// ─── TagInput ─────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  disabled,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
}) {
  const [input, setInput] = React.useState("")

  function addTag() {
    const tag = input.trim()
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
    }
    setInput("")
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.04] px-2.5 py-0.5 text-xs text-neutral-300"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(tags.filter((t) => t !== tag))}
                  className="text-neutral-500 hover:text-neutral-200"
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            addTag()
          }
        }}
        onBlur={addTag}
        placeholder="Type a tag and press Enter"
        disabled={disabled}
      />
    </div>
  )
}

// ─── CreateTaskDialog ─────────────────────────────────────────────────────────

function CreateTaskDialog({
  open,
  graphId,
  initialStatus,
  nodes,
  onClose,
}: {
  open: boolean
  graphId: string
  initialStatus: TaskStatus
  nodes: GraphNode[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [topicId, setTopicId] = React.useState<string | null>(null)
  const [titleError, setTitleError] = React.useState<string | null>(null)

  const columnLabel =
    COLUMNS.find((c) => c.id === initialStatus)?.label ?? "New task"

  const createMutation = useMutation({
    mutationFn: async () => {
      const task = await createTask({
        title: title.trim(),
        description: description.trim() || null,
        graph_id: graphId,
        topic_id: topicId,
        tags,
      })
      if (initialStatus !== "not_started") {
        return updateTask(task.id, { status: initialStatus })
      }
      return task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Task created.")
      handleClose()
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  function handleClose() {
    if (createMutation.isPending) return
    setTitle("")
    setDescription("")
    setTags([])
    setTopicId(null)
    setTitleError(null)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError("Title is required.")
      return
    }
    setTitleError(null)
    createMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="rounded-2xl bg-neutral-950 text-neutral-100 sm:max-w-sm">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="capitalize">
              New task — {columnLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <Field>
              <FieldLabel htmlFor="task-title">Title</FieldLabel>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setTitleError(null)
                }}
                placeholder="e.g. Review chapter 3"
                disabled={createMutation.isPending}
                aria-invalid={Boolean(titleError)}
                autoFocus
              />
              {titleError && <FieldError>{titleError}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="task-description">
                Description{" "}
                <span className="text-neutral-500">(optional)</span>
              </FieldLabel>
              <Textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more context..."
                disabled={createMutation.isPending}
                rows={3}
              />
            </Field>

            <Field>
              <FieldLabel>Node</FieldLabel>
              <NodeSelector
                nodes={nodes}
                selectedId={topicId}
                onChange={setTopicId}
                disabled={createMutation.isPending}
              />
            </Field>

            <Field>
              <FieldLabel>Tags</FieldLabel>
              <TagInput
                tags={tags}
                onChange={setTags}
                disabled={createMutation.isPending}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── EditTaskDialog ───────────────────────────────────────────────────────────

function EditTaskDialog({
  task,
  nodes,
  otherColumns,
  onMove,
  onDelete,
  onClose,
}: {
  task: Task | null
  nodes: GraphNode[]
  otherColumns: (typeof COLUMNS)[number][]
  onMove: (taskId: string, status: TaskStatus) => void
  onDelete: (taskId: string) => void
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [topicId, setTopicId] = React.useState<string | null>(null)
  const [titleError, setTitleError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? "")
      setTags(task.tags)
      setTopicId(task.topic_id)
      setTitleError(null)
    }
  }, [task])

  const updateMutation = useMutation({
    mutationFn: () =>
      updateTask(task!.id, {
        title: title.trim(),
        description: description.trim() || null,
        topic_id: topicId,
        tags,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Task updated.")
      onClose()
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  const currentCol = COLUMNS.find((c) => c.id === task?.status)
  const moveTargets = otherColumns.filter((c) => c.id !== task?.status)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError("Title is required.")
      return
    }
    setTitleError(null)
    updateMutation.mutate()
  }

  return (
    <Dialog open={task !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl bg-neutral-950 text-neutral-100 sm:max-w-sm">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {currentCol && (
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", currentCol.dot)} />
                <span className="text-xs capitalize text-neutral-400">
                  {currentCol.label}
                </span>
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="edit-title">Title</FieldLabel>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setTitleError(null)
                }}
                disabled={updateMutation.isPending}
                aria-invalid={Boolean(titleError)}
                autoFocus
              />
              {titleError && <FieldError>{titleError}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-description">
                Description{" "}
                <span className="text-neutral-500">(optional)</span>
              </FieldLabel>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={updateMutation.isPending}
                rows={3}
              />
            </Field>

            <Field>
              <FieldLabel>Node</FieldLabel>
              <NodeSelector
                nodes={nodes}
                selectedId={topicId}
                onChange={setTopicId}
                disabled={updateMutation.isPending}
              />
            </Field>

            <Field>
              <FieldLabel>Tags</FieldLabel>
              <TagInput
                tags={tags}
                onChange={setTags}
                disabled={updateMutation.isPending}
              />
            </Field>

            {moveTargets.length > 0 && (
              <Field>
                <FieldLabel>Move to</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {moveTargets.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => {
                        onMove(task!.id, col.id)
                        onClose()
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      <span className={cn("size-1.5 rounded-full", col.dot)} />
                      {col.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </div>

          <DialogFooter className="flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-red-500 hover:bg-red-950 hover:text-red-400"
              disabled={updateMutation.isPending}
              onClick={() => task && onDelete(task.id)}
            >
              <Trash2 className="size-4" />
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !title.trim()}
              >
                {updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div className="grid h-full items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-neutral-900/40 p-4"
        >
          <div className="flex items-center gap-2 pb-1">
            <Skeleton className="size-2 rounded-full bg-white/10" />
            <Skeleton className="h-4 w-20 bg-white/10" />
          </div>
          {[1, 2].map((i) => (
            <Skeleton
              key={i}
              className="h-16 w-full rounded-xl bg-white/[0.04]"
            />
          ))}
        </div>
      ))}
    </div>
  )
}
