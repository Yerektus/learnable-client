"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  MessageCircle,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { AuthGuard } from "@/components/auth/auth-guard"
import { KanbanBoard } from "@/components/kanban-board"
import { MaterialsTab } from "@/components/materials-tab"
import { NavUser } from "@/components/nav-user"
import { SettingsDialog } from "@/components/settings-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { streamNodeChat, type ChatMessage, type ChatType } from "@/lib/api/ai"
import { getApiErrorMessage } from "@/lib/api/auth"
import {
  createChat,
  deleteChat,
  getChatMessages,
  listChats,
  type Chat,
  type ChatMessage as StoredChatMessage,
} from "@/lib/api/chats"
import {
  deleteGraphNode,
  getGraph,
  getGraphNode,
  listGraphNodes,
  type GraphNode,
} from "@/lib/api/graphs"
import { useAuthStore } from "@/lib/stores/auth-store"
import { cn } from "@/lib/utils"

export default function NodePage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const params = useParams<{ graphId: string; nodeId: string }>()
  const graphId = params.graphId
  const nodeId = params.nodeId
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = React.useState(false)
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null)

  const graphQuery = useQuery({
    queryKey: ["graph", graphId],
    queryFn: () => getGraph(graphId),
    enabled: Boolean(graphId),
  })
  const nodeQuery = useQuery({
    queryKey: ["graph-node", graphId, nodeId],
    queryFn: () => getGraphNode(graphId, nodeId),
    enabled: Boolean(graphId && nodeId),
  })
  const graphNodesQuery = useQuery({
    queryKey: ["graph-nodes", graphId],
    queryFn: () => listGraphNodes(graphId),
    enabled: Boolean(graphId),
  })
  const chatsQuery = useQuery({
    queryKey: ["chats", nodeId],
    queryFn: () => listChats(nodeId),
    enabled: Boolean(nodeId),
  })

  const deleteNodeMutation = useMutation({
    mutationFn: () => deleteGraphNode(graphId, nodeId),
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
  const createChatMutation = useMutation({
    mutationFn: ({ type }: { type: ChatType }) => createChat(nodeId, type),
    onSuccess: (chat) => {
      queryClient.setQueryData<Chat[]>(["chats", nodeId], (prev) => [
        chat,
        ...(prev ?? []),
      ])
      setActiveChatId(chat.id)
    },
    onError: () => toast.error("Failed to create chat"),
  })
  const deleteChatMutation = useMutation({
    mutationFn: (chatId: string) => deleteChat(chatId),
    onSuccess: (_, chatId) => {
      queryClient.setQueryData<Chat[]>(["chats", nodeId], (prev) =>
        (prev ?? []).filter((c) => c.id !== chatId),
      )
      if (activeChatId === chatId) setActiveChatId(null)
    },
    onError: () => toast.error("Failed to delete chat"),
  })

  const node = nodeQuery.data
  const graphNodes = graphNodesQuery.data ?? []
  const isDeletableNode =
    node?.node_type === "lesson" || node?.node_type === "topic"
  const activeChatType: ChatType =
    (chatsQuery.data?.find((c) => c.id === activeChatId)?.chat_type as ChatType | undefined) ?? "theory"

  async function handleDeleteNode() {
    if (!node || !isDeletableNode) return

    const deleteLabel = node.node_type === "topic" ? "topic" : "node"
    const shouldDelete = window.confirm(
      `Delete ${deleteLabel} "${node.title}"?`,
    )
    if (!shouldDelete) return

    try {
      await deleteNodeMutation.mutateAsync()
    } catch {
      return
    }

    queryClient.setQueryData<GraphNode[]>(["graph-nodes", graphId], (nodes) =>
      (nodes ?? []).filter((candidate) => candidate.id !== nodeId),
    )
    queryClient.removeQueries({ queryKey: ["graph-node", graphId, nodeId] })
    await queryClient.invalidateQueries({ queryKey: ["graph-nodes", graphId] })
    toast.success(`${node.node_type === "topic" ? "Topic" : "Node"} deleted.`)
    router.push(`/dashboard/graphs/${graphId}`)
  }

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-svh w-full bg-neutral-950 text-neutral-100">
          <NodeSidebar
            graphId={graphId}
            nodeId={nodeId}
            graphNodes={graphNodes}
            isNodesLoading={graphNodesQuery.isLoading}
            chats={chatsQuery.data ?? []}
            isChatsLoading={chatsQuery.isLoading}
            activeChatId={activeChatId}
            onNewChat={(type) => createChatMutation.mutate({ type })}
            onSelectChat={setActiveChatId}
            onDeleteChat={(chatId) => deleteChatMutation.mutate(chatId)}
            onLogout={clearAuth}
            onOpenSettings={() => setIsSettingsDialogOpen(true)}
            userName={user?.username ?? user?.email ?? "Learner"}
          />

          <SidebarInset className="min-h-svh bg-neutral-950">
            <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-neutral-950/95 px-6 backdrop-blur">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="size-8 text-neutral-400 hover:bg-white/10 hover:text-neutral-100 md:hidden" />
                <Link
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "w-fit text-neutral-300 hover:text-neutral-50",
                  )}
                  href={`/dashboard/graphs/${graphId}`}
                >
                  <ArrowLeft className="size-4" />
                  Back to graph
                </Link>
              </div>
              {isDeletableNode ? (
                <Button
                  disabled={deleteNodeMutation.isPending}
                  onClick={handleDeleteNode}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  <Trash2 className="size-4" />
                  Delete {node.node_type === "topic" ? "topic" : "node"}
                </Button>
              ) : null}
            </header>

            <main className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-6">
              {nodeQuery.isLoading || graphQuery.isLoading ? (
                <div
                  role="status"
                  className="flex min-h-96 items-center justify-center"
                >
                  <Spinner className="size-6" />
                  <span className="sr-only">Loading</span>
                </div>
              ) : nodeQuery.isError ? (
                <Card className="rounded-lg border-white/10 bg-white/[0.03] text-neutral-100">
                  <CardHeader>
                    <CardTitle>Node not found</CardTitle>
                    <CardDescription>
                      The selected node could not be loaded.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : node ? (
                <NodeWorkspace
                  nodeId={nodeId}
                  graphId={graphId}
                  activeChatId={activeChatId}
                  chatType={activeChatType}
                />
              ) : null}
            </main>
          </SidebarInset>
        </div>
        <SettingsDialog
          open={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
        />
      </SidebarProvider>
    </AuthGuard>
  )
}

// ─── NodeSidebar ──────────────────────────────────────────────────────────────

function NodeSidebar({
  graphId,
  nodeId,
  graphNodes,
  isNodesLoading,
  chats,
  isChatsLoading,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onLogout,
  onOpenSettings,
  userName,
}: {
  graphId: string
  nodeId: string
  graphNodes: GraphNode[]
  isNodesLoading: boolean
  chats: Chat[]
  isChatsLoading: boolean
  activeChatId: string | null
  onNewChat: (type: ChatType) => void
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onLogout: () => void
  onOpenSettings: () => void
  userName: string
}) {
  const [nodesExpanded, setNodesExpanded] = React.useState(true)
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  const navUser = { name: userName, email: "Profile", avatar: "" }

  function handleSelectType(type: ChatType) {
    setPopoverOpen(false)
    onNewChat(type)
  }

  return (
    <Sidebar collapsible="icon" className="bg-neutral-950">
      <SidebarHeader className="border-r border-sidebar-border">
        <div className="flex items-center justify-between gap-3 px-3 text-neutral-100 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <span className="text-2xl font-medium group-data-[collapsible=icon]:hidden">
            Learnable
          </span>
          <SidebarTrigger className="size-8 text-neutral-400 group-data-[state=collapsed]:cursor-e-resize group-data-[state=expanded]:cursor-w-resize hover:bg-white/10 hover:text-neutral-100" />
        </div>
      </SidebarHeader>

      <SidebarContent className="border-r border-sidebar-border">
        {/* New chat — Popover для выбора Theory или Task */}
        <div className="px-3 py-2 group-data-[collapsible=icon]:px-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger className="flex w-full items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-100 transition-colors hover:bg-neutral-700 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
              <Plus className="size-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">New chat</span>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-52 gap-1 p-2">
              <button
                type="button"
                onClick={() => handleSelectType("theory")}
                className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/10"
              >
                <span className="text-sm font-medium text-neutral-100">
                  <span className="text-blue-400">T</span> Theory
                </span>
                <span className="text-xs text-neutral-500">
                  Explain concepts, discuss theory
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectType("task")}
                className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/10"
              >
                <span className="text-sm font-medium text-neutral-100">
                  <span className="text-yellow-400">⚡</span> Task
                </span>
                <span className="text-xs text-neutral-500">
                  Solve problems step by step
                </span>
              </button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Chats list */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-neutral-500 group-data-[collapsible=icon]:hidden">
            Chats
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {isChatsLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-500 group-data-[collapsible=icon]:hidden">
                <Spinner className="size-3" />
                Loading
              </div>
            ) : chats.length === 0 ? (
              <div className="px-3 py-2 text-xs text-neutral-600 group-data-[collapsible=icon]:hidden">
                No chats yet
              </div>
            ) : (
              <SidebarMenu>
                {chats.map((chat) => (
                  <SidebarMenuItem key={chat.id} className="group/chat flex items-center">
                    <SidebarMenuButton
                      onClick={() => onSelectChat(chat.id)}
                      isActive={chat.id === activeChatId}
                      className="flex-1 rounded-lg text-neutral-300 hover:bg-white/10 hover:text-white data-active:bg-white/10"
                      tooltip={chat.title || "New chat"}
                    >
                      <MessageCircle className="size-4 shrink-0" />
                      <span className="flex-1 truncate">{chat.title || "New chat"}</span>
                      {chat.chat_type === "theory" && (
                        <span className="text-xs font-semibold text-blue-400">T</span>
                      )}
                      {chat.chat_type === "task" && (
                        <span className="text-xs text-yellow-400">⚡</span>
                      )}
                    </SidebarMenuButton>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteChat(chat.id)
                      }}
                      className="mr-1 hidden size-5 shrink-0 items-center justify-center rounded text-neutral-600 hover:text-red-400 group-hover/chat:flex group-data-[collapsible=icon]:hidden"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Nodes list (collapsible) */}
        <SidebarGroup>
          <button
            type="button"
            onClick={() => setNodesExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-2 py-1.5 text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-300 group-data-[collapsible=icon]:hidden"
          >
            <span>Nodes</span>
            {nodesExpanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </button>
          {nodesExpanded && (
            <SidebarGroupContent>
              {isNodesLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-500 group-data-[collapsible=icon]:hidden">
                  <Spinner className="size-3" />
                  Loading
                </div>
              ) : graphNodes.length === 0 ? (
                <div className="px-3 py-2 text-xs text-neutral-600 group-data-[collapsible=icon]:hidden">
                  No nodes
                </div>
              ) : (
                <SidebarMenu>
                  {graphNodes.map((n) => (
                    <SidebarMenuItem key={n.id}>
                      <SidebarMenuButton
                        render={
                          <Link href={`/dashboard/graphs/${graphId}/nodes/${n.id}`} />
                        }
                        isActive={n.id === nodeId}
                        className="rounded-lg text-neutral-300 hover:bg-white/10 hover:text-white data-active:bg-white/10"
                        tooltip={n.title}
                      >
                        {n.node_type === "topic" ? (
                          <Circle
                            className="size-4 shrink-0"
                            fill={n.color ?? "#61bd61"}
                            strokeWidth={1.8}
                          />
                        ) : (
                          <FileText className="size-4 shrink-0" strokeWidth={1.8} />
                        )}
                        <span className="truncate">{n.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-r border-sidebar-border">
        <NavUser
          user={navUser}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

// ─── NodeWorkspace ─────────────────────────────────────────────────────────────

function NodeWorkspace({
  nodeId,
  graphId,
  activeChatId,
  chatType,
}: {
  nodeId: string
  graphId: string
  activeChatId: string | null
  chatType: ChatType
}) {
  return (
    <Tabs defaultValue="chat" className="grid gap-4">
      <TabsList>
        <TabsTrigger value="chat">
          <MessageCircle className="size-4" />
          Chat
        </TabsTrigger>
        <TabsTrigger value="materials">
          <Paperclip className="size-4" />
          Materials
        </TabsTrigger>
        <TabsTrigger value="kanban">Kanban</TabsTrigger>
      </TabsList>

      <TabsContent value="chat">
        <ChatPanel
          nodeId={nodeId}
          activeChatId={activeChatId}
          chatType={chatType}
        />
      </TabsContent>

      <TabsContent value="materials" className="min-h-0">
        <MaterialsTab nodeId={nodeId} />
      </TabsContent>

      <TabsContent value="kanban" className="min-h-0 pt-2">
        <KanbanBoard graphId={graphId} />
      </TabsContent>
    </Tabs>
  )
}

// ─── ChatPanel ─────────────────────────────────────────────────────────────────

function ChatPanel({
  nodeId,
  activeChatId,
  chatType,
}: {
  nodeId: string
  activeChatId: string | null
  chatType: ChatType
}) {
  const queryClient = useQueryClient()
  const [streamingMessages, setStreamingMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState("")
  const [isStreaming, setIsStreaming] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", activeChatId],
    queryFn: () => getChatMessages(activeChatId!),
    enabled: Boolean(activeChatId),
  })

  // Мёрджим персистированную историю с оптимистичными стриминг-сообщениями
  const serverMessages: ChatMessage[] = (messagesQuery.data ?? []).map(
    (m: StoredChatMessage) => ({ role: m.role, content: m.content }),
  )
  const displayMessages = [...serverMessages, ...streamingMessages]

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [displayMessages.length, isStreaming])

  // Сбрасываем при смене чата
  React.useEffect(() => {
    setStreamingMessages([])
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }, [activeChatId])

  function autoResizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isStreaming || !activeChatId) return

    setStreamingMessages([
      { role: "user", content: trimmed },
      { role: "assistant", content: "" },
    ])
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setIsStreaming(true)

    try {
      for await (const token of streamNodeChat({
        nodeId,
        message: trimmed,
        chatType,
        threadId: activeChatId,
      })) {
        setStreamingMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content + token }
          }
          return updated
        })
      }
    } catch {
      toast.error("Chat unavailable")
      setStreamingMessages([])
    } finally {
      setIsStreaming(false)
      // Рефетчим персистированную историю, убираем оптимистичные сообщения
      queryClient
        .refetchQueries({ queryKey: ["chat-messages", activeChatId] })
        .then(() => setStreamingMessages([]))
        .catch(() => setStreamingMessages([]))
      // Обновляем заголовок чата в сайдбаре
      void queryClient.invalidateQueries({ queryKey: ["chats", nodeId] })
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  if (!activeChatId) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] text-neutral-500">
        <MessageCircle className="size-10 text-neutral-700" />
        <p className="text-sm">Select a chat or create a new one</p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
      style={{ height: "calc(100vh - 220px)" }}
    >
      {/* Chat type indicator */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        {chatType === "theory" ? (
          <span className="text-xs font-semibold text-blue-400">T</span>
        ) : (
          <span className="text-xs text-yellow-400">⚡</span>
        )}
        <span className="text-xs capitalize text-neutral-500">{chatType}</span>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messagesQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-5 text-neutral-600" />
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessageCircle className="size-10 text-neutral-600" />
            <p className="text-sm text-neutral-400">Ask anything about this topic</p>
            <p className="text-xs text-neutral-600">
              {chatType === "theory"
                ? "Theory mode — explains concepts"
                : "Task mode — solves problems step by step"}
            </p>
          </div>
        ) : (
          displayMessages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {msg.role === "user" ? (
                <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-neutral-700 px-4 py-2.5 text-sm text-neutral-100">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[80%] prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                  {isStreaming && i === displayMessages.length - 1 && (
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-neutral-400 align-middle" />
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-2.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              autoResizeTextarea()
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              chatType === "theory"
                ? "Ask about this topic..."
                : "Describe the task..."
            }
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500 disabled:opacity-50"
            style={{ minHeight: "24px", maxHeight: "96px" }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isStreaming || !input.trim()}
            className="mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-neutral-100 transition-colors hover:bg-neutral-600 disabled:opacity-40"
          >
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
