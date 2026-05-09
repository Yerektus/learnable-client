import { coreApi } from "@/lib/api/client"

export type Graph = {
  id: string
  owner_id: string
  name: string
  description: string | null
  custom_prompt: string | null
  created_at: string
  updated_at: string
}

export type UpdateGraphPayload = {
  name?: string
  description?: string | null
  custom_prompt?: string | null
}

export type GraphNode = {
  id: string
  owner_id: string
  graph_id: string
  title: string
  node_type: "lesson" | "topic" | "cluster" | "quiz"
  description: string | null
  position_x: number
  position_y: number
  color: string | null
  size: number | null
  accent: "left" | "right" | null
  node_ids: string[]
  created_at: string
  updated_at: string
}

export type GraphEdge = {
  id: string
  owner_id: string
  graph_id: string
  source_node_id: string
  target_node_id: string
  created_at: string
  updated_at: string
}

export type CreateGraphPayload = {
  name: string
  description?: string | null
}

export type CreateGraphNodePayload = {
  title: string
  node_type?: "lesson" | "topic" | "cluster" | "quiz"
  description?: string | null
  position_x: number
  position_y: number
  color?: string | null
  size?: number | null
  accent?: "left" | "right" | null
  node_ids?: string[]
}

export type UpdateGraphNodePayload = Partial<CreateGraphNodePayload>

export type CreateGraphEdgePayload = {
  source_node_id: string
  target_node_id: string
}

export async function listGraphs() {
  const { data } = await coreApi.get<Graph[]>("/api/v1/graphs")

  return data
}

export async function createGraph(payload: CreateGraphPayload) {
  const { data } = await coreApi.post<Graph>("/api/v1/graphs", payload)

  return data
}

export async function getGraph(graphId: string) {
  const { data } = await coreApi.get<Graph>(`/api/v1/graphs/${graphId}`)

  return data
}

export async function updateGraph(graphId: string, payload: UpdateGraphPayload) {
  const { data } = await coreApi.patch<Graph>(`/api/v1/graphs/${graphId}`, payload)

  return data
}

export async function listGraphNodes(graphId: string) {
  const { data } = await coreApi.get<GraphNode[]>(
    `/api/v1/graphs/${graphId}/nodes`
  )

  return data
}

export async function getGraphNode(graphId: string, nodeId: string) {
  const { data } = await coreApi.get<GraphNode>(
    `/api/v1/graphs/${graphId}/nodes/${nodeId}`
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

export async function deleteGraphNode(
  graphId: string,
  nodeId: string,
): Promise<void> {
  await coreApi.delete(`/api/v1/graphs/${graphId}/nodes/${nodeId}`)
}

export async function listGraphEdges(graphId: string): Promise<GraphEdge[]> {
  const { data } = await coreApi.get<GraphEdge[]>(
    `/api/v1/graphs/${graphId}/edges`,
  )
  return data
}

export async function createGraphEdge(
  graphId: string,
  payload: CreateGraphEdgePayload,
): Promise<GraphEdge> {
  const { data } = await coreApi.post<GraphEdge>(
    `/api/v1/graphs/${graphId}/edges`,
    payload,
  )
  return data
}

export async function deleteGraphEdge(
  graphId: string,
  edgeId: string,
): Promise<void> {
  await coreApi.delete(`/api/v1/graphs/${graphId}/edges/${edgeId}`)
}

export const listNodes = listGraphNodes
