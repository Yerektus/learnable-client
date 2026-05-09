"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Circle,
  FileText,
  MessageCircle,
  Paperclip,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { AuthGuard } from "@/components/auth/auth-guard"
import { MaterialsTab } from "@/components/materials-tab"
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
import {
  deleteGraphNode,
  getGraph,
  getGraphNode,
  listGraphNodes,
  type GraphNode,
} from "@/lib/api/graphs"
import { getApiErrorMessage } from "@/lib/api/auth"
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
  const lessonNodes = graphNodes.filter((item) => item.node_type === "lesson")
  const topicNodes = graphNodes.filter((item) => item.node_type === "topic")
  const isDeletableNode =
    node?.node_type === "lesson" || node?.node_type === "topic"

  async function handleDeleteNode() {
    if (!node || !isDeletableNode) {
      return
    }

    const deleteLabel = node.node_type === "topic" ? "topic" : "node"
    const shouldDelete = window.confirm(
      `Delete ${deleteLabel} "${node.title}"?`
    )

    if (!shouldDelete) {
      return
    }

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
            isLoading={graphNodesQuery.isLoading}
            lessonNodes={lessonNodes}
            nodeId={nodeId}
            onLogout={clearAuth}
            onOpenSettings={() => setIsSettingsDialogOpen(true)}
            topicNodes={topicNodes}
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
                <NodeWorkspace nodeId={nodeId} />
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
  isLoading,
  lessonNodes,
  nodeId,
  onLogout,
  onOpenSettings,
  topicNodes,
  userName,
}: {
  graphId: string
  isLoading: boolean
  lessonNodes: GraphNode[]
  nodeId: string
  onLogout: () => void
  onOpenSettings: () => void
  topicNodes: GraphNode[]
  userName: string
}) {
  const data = {
    user: {
      name: userName,
      email: "Profile",
      avatar: "",
    },
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
        {isLoading ? (
          <div className="flex items-center gap-2 px-5 py-3 text-sm text-neutral-500">
            <Spinner className="size-4" />
            Loading
          </div>
        ) : (
          <>
            <NodeSidebarGroup
              graphId={graphId}
              label="Lectures"
              nodes={lessonNodes}
              nodeId={nodeId}
            />
            <NodeSidebarGroup
              graphId={graphId}
              label="Topics"
              nodes={topicNodes}
              nodeId={nodeId}
            />
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="border-r border-sidebar-border">
        <NavUser
          user={data.user}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NodeSidebarGroup({
  graphId,
  label,
  nodes,
  nodeId,
}: {
  graphId: string
  label: string
  nodes: GraphNode[]
  nodeId: string
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-base text-neutral-100">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {nodes.length > 0 ? (
          <SidebarMenu>
            {nodes.map((node) => (
              <SidebarMenuItem key={node.id}>
                <SidebarMenuButton
                  render={
                    <Link
                      href={`/dashboard/graphs/${graphId}/nodes/${node.id}`}
                    />
                  }
                  isActive={node.id === nodeId}
                  className="rounded-full text-neutral-200 hover:bg-white/10 hover:text-white data-active:bg-white/10"
                  tooltip={node.title}
                >
                  {node.node_type === "topic" ? (
                    <Circle
                      className="size-4"
                      fill={node.color ?? "#61bd61"}
                      strokeWidth={1.8}
                    />
                  ) : (
                    <FileText className="size-4" strokeWidth={1.8} />
                  )}
                  <span>{node.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        ) : (
          <div className="px-3 py-2 text-sm text-neutral-500">Empty</div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function NodeWorkspace({ nodeId }: { nodeId: string }) {
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
      </TabsList>

      <TabsContent value="chat" className="min-h-80">
        <Card className="h-full rounded-lg border-white/10 bg-white/[0.03] text-neutral-100">
          <CardHeader>
            <CardTitle className="text-lg">Chat</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-500">
            No messages yet.
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="materials" className="min-h-0">
        <MaterialsTab nodeId={nodeId} />
      </TabsContent>
    </Tabs>
  )
}
