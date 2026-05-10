import { coreApi } from "@/lib/api/client"

export type Flashcard = { front: string; back: string }

export type GeneratedMaterials = {
  node_id: string
  cards: Flashcard[]
  notes: string
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
