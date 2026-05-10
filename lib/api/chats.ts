import { coreApi } from "@/lib/api/client"
import type { ChatType } from "@/lib/api/ai"

export type Chat = {
  id: string
  node_id: string | null
  title: string
  chat_type: ChatType | "planning"
  created_at: string
  updated_at: string
}

export type ChatMessage = {
  id: string
  chat_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export type PlanningChatHistory = {
  id: string
  messages: ChatMessage[]
}

export async function listChats(nodeId: string): Promise<Chat[]> {
  const { data } = await coreApi.get<Chat[]>("/api/v1/chats", {
    params: { node_id: nodeId },
  })
  return data
}

export async function createChat(nodeId: string, chatType: ChatType = "theory"): Promise<Chat> {
  const { data } = await coreApi.post<Chat>("/api/v1/chats", null, {
    params: { node_id: nodeId, chat_type: chatType },
  })
  return data
}

export async function deleteChat(chatId: string): Promise<void> {
  await coreApi.delete(`/api/v1/chats/${chatId}`)
}

export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const { data } = await coreApi.get<ChatMessage[]>(
    `/api/v1/chats/${chatId}/messages`,
  )
  return data
}

export async function getPlanningChat(graphId: string): Promise<PlanningChatHistory> {
  const { data } = await coreApi.get<PlanningChatHistory>(
    `/api/v1/chats/graphs/${graphId}/planning-chat`,
  )
  return data
}

export async function savePlanningMessage(
  graphId: string,
  role: "user" | "assistant",
  content: string,
): Promise<ChatMessage> {
  const { data } = await coreApi.post<ChatMessage>(
    `/api/v1/chats/graphs/${graphId}/planning-chat/messages`,
    { role, content },
  )
  return data
}
