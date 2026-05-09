"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  ChevronDown,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { AuthGuard } from "@/components/auth/auth-guard"
import { KanbanBoard } from "@/components/kanban-board"
import { NavUser } from "@/components/nav-user"
import { SettingsDialog } from "@/components/settings-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  deleteGraphNode,
  getGraph,
  getGraphNode,
  listGraphNodes,
  type GraphNode,
} from "@/lib/api/graphs"
import { getApiErrorMessage } from "@/lib/api/auth"
import { listTasks } from "@/lib/api/tasks"
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
  const deleteNodeMutation = useMutation({
    mutationFn: () => deleteGraphNode(graphId, nodeId),
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })

  const node = nodeQuery.data
  const graphNodes = graphNodesQuery.data ?? []
  const isDeletableNode =
    node?.node_type === "lesson" || node?.node_type === "topic"

  async function handleDeleteNode() {
    if (!node || !isDeletableNode) return

    const deleteLabel = node.node_type === "topic" ? "topic" : "node"
    const shouldDelete = window.confirm(
      `Delete ${deleteLabel} "${node.title}"?`
    )
    if (!shouldDelete) return

    try {
      await deleteNodeMutation.mutateAsync()
    } catch {
      return
    }

    queryClient.setQueryData<GraphNode[]>(["graph-nodes", graphId], (nodes) =>
      (nodes ?? []).filter((candidate) => candidate.id !== nodeId)
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
            nodeTitle={node?.title ?? ""}
            graphNodes={graphNodes}
            isLoadingNodes={graphNodesQuery.isLoading}
            onBack={() => router.push(`/dashboard/graphs/${graphId}`)}
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
                    "w-fit text-neutral-300 hover:text-neutral-50"
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
                <NodeWorkspace graphId={graphId} nodeId={nodeId} />
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

function NodeSidebar({
  graphId,
  nodeId,
  nodeTitle,
  graphNodes,
  isLoadingNodes,
  onBack,
  onLogout,
  onOpenSettings,
  userName,
}: {
  graphId: string
  nodeId: string
  nodeTitle: string
  graphNodes: GraphNode[]
  isLoadingNodes: boolean
  onBack: () => void
  onLogout: () => void
  onOpenSettings: () => void
  userName: string
}) {
  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: listTasks,
  })
  const nodeTasks = (tasksQuery.data ?? []).filter(
    (t) => t.topic_id === nodeId
  )
  const [nodesOpen, setNodesOpen] = React.useState(true)
  const [subtopicsOpen, setSubtopicsOpen] = React.useState(false)

  const btnClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-300 hover:bg-white/10 hover:text-white transition-colors text-left"

  const userData = { name: userName, email: "Profile", avatar: "" }

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
        <div className="px-2 py-2">
          <button onClick={onBack} className={btnClass}>
            <ArrowLeft className="size-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Back</span>
          </button>
        </div>

        <div className="group-data-[collapsible=icon]:hidden px-2 pb-4">
          <button className={btnClass} onClick={() => alert("TODO")}>
            <Plus className="size-4 shrink-0" />
            new task
          </button>
          <button className={btnClass} onClick={() => alert("TODO")}>
            <Search className="size-4 shrink-0" />
            search
          </button>

          <div className="my-2 h-px bg-white/10" />

          <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-white">
            <span className="truncate text-sm">{nodeTitle}</span>
            <MoreHorizontal className="size-4 shrink-0 text-neutral-500" />
          </div>

          {nodeTasks.map((task) => (
            <div key={task.id} className={cn(btnClass, "cursor-default pl-6")}>
              <span className="truncate">{task.title}</span>
            </div>
          ))}

          <div className="my-2 h-px bg-white/10" />

          <button
            className={cn(btnClass, "justify-between")}
            onClick={() => setNodesOpen((o) => !o)}
          >
            <span>Nodes</span>
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                !nodesOpen && "-rotate-90"
              )}
            />
          </button>
          {nodesOpen && (
            <div className="mt-0.5">
              {isLoadingNodes ? (
                <div className="px-3 py-1 text-xs text-neutral-500">
                  Loading...
                </div>
              ) : graphNodes.length > 0 ? (
                graphNodes.map((n) => (
                  <Link
                    key={n.id}
                    href={`/dashboard/graphs/${graphId}/nodes/${n.id}`}
                    className={cn(
                      btnClass,
                      n.id === nodeId ? "bg-white/10 text-white" : ""
                    )}
                  >
                    <span className="truncate">{n.title}</span>
                  </Link>
                ))
              ) : (
                <div className="px-3 py-1 text-xs text-neutral-600">Empty</div>
              )}
            </div>
          )}

          <button
            className={cn(btnClass, "justify-between")}
            onClick={() => setSubtopicsOpen((o) => !o)}
          >
            <span>Subtopics</span>
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                !subtopicsOpen && "-rotate-90"
              )}
            />
          </button>
          {subtopicsOpen && (
            <div className="px-3 py-1 text-xs text-neutral-600">Empty</div>
          )}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-r border-sidebar-border">
        <NavUser
          user={userData}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NodeWorkspace({
  graphId,
  nodeId: _nodeId,
}: {
  graphId: string
  nodeId: string
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
        <TabsTrigger value="canvas">Canvas</TabsTrigger>
        <TabsTrigger value="kanban">Kanban</TabsTrigger>
      </TabsList>

      <TabsContent value="chat">
        <ChatTab />
      </TabsContent>

      <TabsContent value="materials" className="min-h-80">
        <Card className="h-full rounded-lg border-white/10 bg-white/[0.03] text-neutral-100">
          <CardHeader>
            <CardTitle className="text-lg">Materials</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-500">
            No materials yet.
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="canvas" className="min-h-80">
        <div className="flex min-h-80 items-center justify-center text-sm text-neutral-500">
          Canvas — coming soon
        </div>
      </TabsContent>

      <TabsContent value="kanban" className="min-h-0 pt-4">
        <KanbanBoard graphId={graphId} />
      </TabsContent>
    </Tabs>
  )
}

function ChatTab() {
  const [input, setInput] = React.useState("")

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-white/10"
      style={{ minHeight: 520 }}
    >
      <div className="flex-1 p-6" />
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-transparent text-sm text-neutral-200 outline-none placeholder:text-neutral-600"
          />
        </div>
      </div>
    </div>
  )
}
