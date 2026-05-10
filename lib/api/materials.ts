import { coreApi } from "@/lib/api/client"

export type Flashcard = { front: string; back: string }

export type GeneratedMaterials = {
  node_id: string
  cards: Flashcard[]
  notes: string
  material_ids: string[]
}

export type MaterialListItem = {
  id: string
  node_id: string
  type: "notes" | "cards"
  title: string
  created_at: string
}

export type MaterialDetail = {
  id: string
  node_id: string
  type: "notes" | "cards"
  title: string
  content: string
  cards: Flashcard[]
  created_at: string
}

export async function generateMaterialsFromFile(
  nodeId: string,
  file: File,
  materialType: "cards" | "notes" | "both" = "both"
): Promise<GeneratedMaterials> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("material_type", materialType)

  const { data } = await coreApi.post<GeneratedMaterials>(
    `/api/v1/ai/nodes/${nodeId}/materials/generate-from-file`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  )

  return data
}

export async function listMaterials(nodeId: string): Promise<MaterialListItem[]> {
  const { data } = await coreApi.get<MaterialListItem[]>(
    `/api/v1/materials/nodes/${nodeId}/materials`
  )
  return data
}

export async function getMaterial(
  nodeId: string,
  materialId: string
): Promise<MaterialDetail> {
  const { data } = await coreApi.get<MaterialDetail>(
    `/api/v1/materials/nodes/${nodeId}/materials/${materialId}`
  )
  return data
}

export async function deleteMaterial(
  nodeId: string,
  materialId: string
): Promise<void> {
  await coreApi.delete(`/api/v1/materials/nodes/${nodeId}/materials/${materialId}`)
}
