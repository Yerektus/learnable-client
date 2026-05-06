import { coreApi } from "@/lib/api/client"

export type Graph = {
  id: string
  owner_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type CreateGraphPayload = {
  name: string
  description?: string | null
}

export async function listGraphs() {
  const { data } = await coreApi.get<Graph[]>("/api/v1/graphs")

  return data
}

export async function createGraph(payload: CreateGraphPayload) {
  const { data } = await coreApi.post<Graph>("/api/v1/graphs", payload)

  return data
}
