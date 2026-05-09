import { coreApi } from "@/lib/api/client"

export type TaskStatus = "backlog" | "not_started" | "in_progress" | "done"
export type TaskPriority = "low" | "medium" | "high"

export type Task = {
  id: string
  owner_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  graph_id: string | null
  topic_id: string | null
  source: string
  tags: string[]
  created_at: string
  updated_at: string
}

export type CreateTaskPayload = {
  title: string
  description?: string | null
  status?: TaskStatus
  graph_id?: string | null
  topic_id?: string | null
  tags?: string[]
}

export type UpdateTaskPayload = {
  title?: string
  description?: string | null
  status?: TaskStatus
  topic_id?: string | null
  tags?: string[]
}

function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined),
  )
}

export async function listTasks(): Promise<Task[]> {
  const { data } = await coreApi.get<Task[]>("/api/v1/kanban", {
    params: { limit: 500 },
  })
  return data
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await coreApi.post<Task>(
    "/api/v1/kanban",
    stripNulls(payload as Record<string, unknown>),
  )
  return data
}

export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload,
): Promise<Task> {
  const { data } = await coreApi.patch<Task>(
    `/api/v1/kanban/${taskId}`,
    stripNulls(payload as Record<string, unknown>),
  )
  return data
}

export async function deleteTask(taskId: string): Promise<void> {
  await coreApi.delete(`/api/v1/kanban/${taskId}`)
}
