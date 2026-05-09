import { useAuthStore } from "@/lib/stores/auth-store"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_CORE_API_URL ?? "http://localhost:8000"

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type GenerateGraphResponse = {
  graph_id: string
  nodes_created: number
  deadlines_created: number
}

export type ChatType = "theory" | "task"

export async function* streamNodeChat({
  nodeId,
  message,
  chatType,
  threadId,
}: {
  nodeId: string
  message: string
  chatType: ChatType
  threadId: string
}): AsyncGenerator<string> {
  const token = useAuthStore.getState().accessToken

  const response = await fetch(
    `${API_BASE_URL}/api/v1/ai/nodes/${nodeId}/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        chat_type: chatType,
        thread_id: threadId,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const token = line.slice(6)
          if (token) yield token
        }
      }
    }

    // flush remaining buffer
    if (buffer.startsWith("data: ")) {
      const token = buffer.slice(6)
      if (token) yield token
    }
  } finally {
    reader.releaseLock()
  }
}

export async function* streamPlanningPanel({
  graphId,
  message,
}: {
  graphId: string
  message: string
}): AsyncGenerator<string> {
  const token = useAuthStore.getState().accessToken

  const response = await fetch(
    `${API_BASE_URL}/api/v1/ai/graphs/${graphId}/plan`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    },
  )

  if (!response.ok) {
    throw new Error(`Planning request failed: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const chunk = line.slice(6)
          if (chunk) yield chunk
        }
      }
    }

    if (buffer.startsWith("data: ")) {
      const chunk = buffer.slice(6)
      if (chunk) yield chunk
    }
  } finally {
    reader.releaseLock()
  }
}

export async function generateGraphFromFile(
  graphId: string,
  file: File,
): Promise<GenerateGraphResponse> {
  const token = useAuthStore.getState().accessToken

  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(
    `${API_BASE_URL}/api/v1/ai/graphs/${graphId}/generate`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    },
  )

  if (!response.ok) {
    throw new Error(`Graph generation failed: ${response.status}`)
  }

  return response.json() as Promise<GenerateGraphResponse>
}
