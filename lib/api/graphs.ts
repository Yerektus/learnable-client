import { coreApi } from "@/lib/api/client"

export type Graph = {
  id: string
  owner_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type GraphNode = {
  id: string
  owner_id: string
  graph_id: string
  title: string
  description: string | null
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

export type CreateGraphPayload = {
  name: string
  description?: string | null
}

export type CreateGraphNodePayload = {
  title: string
  description?: string | null
  position_x: number
  position_y: number
}

export type UpdateGraphNodePayload = Partial<CreateGraphNodePayload>

export async function listGraphs() {
  const { data } = await coreApi.get<Graph[]>("/api/v1/graphs")

  return data
}

export async function createGraph(payload: CreateGraphPayload) {
  const { data } = await coreApi.post<Graph>("/api/v1/graphs", payload)

  return data
}

export async function listGraphNodes(graphId: string) {
  const { data } = await coreApi.get<GraphNode[]>(
    `/api/v1/graphs/${graphId}/nodes`
  )

  return data
}

export async function createGraphNode(
  graphId: string,
  payload: CreateGraphNodePayload
) {
  const { data } = await coreApi.post<GraphNode>(
    `/api/v1/graphs/${graphId}/nodes`,
    payload
  )

  return data
}

export async function updateGraphNode(
  graphId: string,
  nodeId: string,
  payload: UpdateGraphNodePayload
) {
  const { data } = await coreApi.patch<GraphNode>(
    `/api/v1/graphs/${graphId}/nodes/${nodeId}`,
    payload
  )

  return data
}
