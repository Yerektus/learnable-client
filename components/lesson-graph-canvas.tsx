"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import * as React from "react"
import {
  Circle,
  Hand,
  MousePointer2,
  PencilLine,
  Plus,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react"
import {
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  createGraphEdge,
  createGraphNode,
  deleteGraphNode,
  listGraphEdges,
  listGraphNodes,
  updateGraphNode,
  type CreateGraphNodePayload,
  type GraphEdge as ApiGraphEdge,
  type GraphNode as ApiGraphNode,
} from "@/lib/api/graphs"
import { getApiErrorMessage } from "@/lib/api/auth"
import { cn } from "@/lib/utils"

type LessonData = {
  label: string
  size: number
}

type TopicData = {
  color: string
  label?: string
  size?: number
}

type ClusterData = {
  size: number
  accent: "left" | "right"
  nodeIds?: string[]
}

type QuizData = {
  label: string
}

type LessonNode = Node<LessonData, "lesson">
type TopicNode = Node<TopicData, "topic">
type ClusterNode = Node<ClusterData, "cluster">
type QuizNode = Node<QuizData, "quiz">
type GraphNode = LessonNode | TopicNode | ClusterNode | QuizNode

type CanvasTool = "cursor" | "hand" | "pen"
type ConnectedNodeType = "lesson" | "topic"

type GraphSnapshot = {
  nodes: GraphNode[]
  edges: Edge[]
  customNodeIds: string[]
}

type NodeActionContextValue = {
  activeNodeId: string | null
  addConnectedNode: (sourceNodeId: string, nodeType: ConnectedNodeType) => void
  closeNodeMenu: () => void
  deleteNode: (nodeId: string) => void
  openNodeMenu: (nodeId: string) => void
  openNodePage: (nodeId: string) => void
  renameNode: (nodeId: string, label: string) => void
}

const NodeActionContext = React.createContext<NodeActionContextValue | null>(
  null
)

const hiddenHandleClass = "!h-1 !w-1 !border-0 !bg-transparent !opacity-0"

const centerHandleStyle: React.CSSProperties = {
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
}

const minimumSpringDistance = 42
const collisionGap = 10
const clusterGap = 28
const clusterInnerPadding = 14
const edgeSpringStrength = 0.09
const graphRepulsionStrength = 0.42
const graphGravityStrength = 0.015
const maximumPhysicsStep = 24

const clusterGroups: ClusterGroup[] = []
const quizBadges: {
  quizId: string
  clusterId: string
  angle: number
}[] = []

const nodeTypes = {
  lesson: LessonNodeView,
  topic: TopicNodeView,
  cluster: ClusterNodeView,
  quiz: QuizNodeView,
} satisfies NodeTypes

export function LessonGraphCanvas({ graphId }: { graphId: string }) {
  return (
    <ReactFlowProvider>
      <ResponsiveLessonGraph graphId={graphId} />
    </ReactFlowProvider>
  )
}

function ResponsiveLessonGraph({ graphId }: { graphId: string }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const nextCustomNodeId = React.useRef(1)
  const { fitView, getNodes, screenToFlowPosition } = useReactFlow<
    GraphNode,
    Edge
  >()
  const [activeTool, setActiveTool] = React.useState<CanvasTool>("cursor")
  const [customNodeIds, setCustomNodeIds] = React.useState<string[]>([])
  const [historyPast, setHistoryPast] = React.useState<GraphSnapshot[]>([])
  const [historyFuture, setHistoryFuture] = React.useState<GraphSnapshot[]>([])
  const [selectedNodeIds, setSelectedNodeIds] = React.useState<string[]>([])
  const [containerSize, setContainerSize] = React.useState({
    width: 1180,
    height: 620,
  })
  const scale = React.useMemo(() => {
    const widthScale = containerSize.width / 1180
    const heightScale = containerSize.height / 620

    return Math.min(1.18, Math.max(0.68, Math.min(widthScale, heightScale)))
  }, [containerSize.height, containerSize.width])

  const graphNodesQuery = useQuery({
    queryKey: ["graph-nodes", graphId],
    queryFn: () => listGraphNodes(graphId),
    enabled: Boolean(graphId),
  })
  const graphEdgesQuery = useQuery({
    queryKey: ["graph-edges", graphId],
    queryFn: () => listGraphEdges(graphId),
    enabled: Boolean(graphId),
  })
  const apiNodes = React.useMemo(
    () => createApiGraphNodes(graphNodesQuery.data ?? []),
    [graphNodesQuery.data]
  )
  const apiEdges = React.useMemo(
    () => createApiGraphEdges(graphEdgesQuery.data ?? []),
    [graphEdgesQuery.data]
  )
  const [nodes, setNodes] = useNodesState<GraphNode>([])
  const [graphEdges, setGraphEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [activeNodeId, setActiveNodeId] = React.useState<string | null>(null)
  const isHandTool = activeTool === "hand"
  const isDrawingTool = activeTool === "pen"
  const nodesQueryKey = React.useMemo(() => ["graph-nodes", graphId], [graphId])
  const edgesQueryKey = React.useMemo(() => ["graph-edges", graphId], [graphId])
  const createNodeMutation = useMutation({
    mutationFn: (payload: CreateGraphNodePayload) =>
      createGraphNode(graphId, payload),
    onSuccess: (node) => {
      queryClient.setQueryData<ApiGraphNode[]>(nodesQueryKey, (currentNodes) =>
        upsertById(currentNodes ?? [], node)
      )
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
  const updateNodeMutation = useMutation({
    mutationFn: ({
      nodeId,
      payload,
    }: {
      nodeId: string
      payload: Partial<CreateGraphNodePayload>
    }) => updateGraphNode(graphId, nodeId, payload),
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => deleteGraphNode(graphId, nodeId),
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
  const createEdgeMutation = useMutation({
    mutationFn: (payload: { source_node_id: string; target_node_id: string }) =>
      createGraphEdge(graphId, payload),
    onSuccess: (edge) => {
      queryClient.setQueryData<ApiGraphEdge[]>(edgesQueryKey, (currentEdges) =>
        upsertById(currentEdges ?? [], edge)
      )
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
  const selectedGroupNodeIds = React.useMemo(
    () =>
      selectedNodeIds.filter((nodeId) => {
        const node = nodes.find((candidate) => candidate.id === nodeId)

        return node && node.type !== "cluster"
      }),
    [nodes, selectedNodeIds]
  )
  const createSnapshot = React.useCallback(
    (): GraphSnapshot => ({
      nodes,
      edges: graphEdges,
      customNodeIds,
    }),
    [customNodeIds, graphEdges, nodes]
  )
  const addLessonNode = React.useCallback(
    (position: { x: number; y: number }) => {
      nextCustomNodeId.current += 1

      createNodeMutation.mutate({
        title: getNextDefaultNodeLabel(nodes, "lesson"),
        node_type: "lesson",
        position_x: position.x,
        position_y: position.y,
        size: 56,
      })
    },
    [createNodeMutation, nodes]
  )
  const addClusterAroundSelection = React.useCallback(() => {
    const selectedNodes = nodes.filter(
      (node) =>
        selectedGroupNodeIds.includes(node.id) && node.type !== "cluster"
    )

    if (selectedNodes.length === 0) {
      return
    }

    const circle = getContainingCircle(selectedNodes, scale)
    nextCustomNodeId.current += 1

    createNodeMutation.mutate({
      title: "Cluster",
      node_type: "cluster",
      position_x: circle.center.x,
      position_y: circle.center.y,
      size: circle.size,
      accent: "right",
      node_ids: selectedGroupNodeIds,
    })
  }, [createNodeMutation, nodes, scale, selectedGroupNodeIds])
  const renameNode = React.useCallback(
    (nodeId: string, label: string) => {
      const targetNode = nodes.find((node) => node.id === nodeId)

      if (!targetNode || !isEditableTextNode(targetNode)) {
        return
      }

      const nextLabel = label.trim() || getFallbackNodeLabel(targetNode)

      if (getNodeLabel(targetNode) === nextLabel) {
        return
      }

      updateNodeMutation.mutate({
        nodeId,
        payload: {
          title: nextLabel,
        },
      })
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId || !isEditableTextNode(node)) {
            return node
          }

          return {
            ...node,
            data: {
              ...node.data,
              label: nextLabel,
            },
          } as GraphNode
        })
      )
    },
    [nodes, setNodes, updateNodeMutation]
  )
  const deleteNode = React.useCallback(
    async (nodeId: string) => {
      const targetNode = nodes.find((node) => node.id === nodeId)

      if (
        !targetNode ||
        (targetNode.type !== "lesson" && targetNode.type !== "topic")
      ) {
        return
      }

      const nodeLabel = getNodeLabel(targetNode)
      const deleteLabel = targetNode.type === "topic" ? "topic" : "node"
      const shouldDelete = window.confirm(
        `Delete ${deleteLabel}${nodeLabel ? ` "${nodeLabel}"` : ""}?`
      )

      if (!shouldDelete) {
        return
      }

      try {
        await deleteNodeMutation.mutateAsync(nodeId)
      } catch {
        return
      }

      const nextEdges = graphEdges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      )

      setActiveNodeId(null)
      setSelectedNodeIds((currentIds) =>
        currentIds.filter((currentId) => currentId !== nodeId)
      )
      setGraphEdges(nextEdges)
      setNodes((currentNodes) =>
        normalizeGraphNodes(
          removeDeletedNodeFromGraphNodes(currentNodes, nodeId),
          nextEdges,
          scale
        )
      )
      queryClient.setQueryData<ApiGraphNode[]>(nodesQueryKey, (currentNodes) =>
        removeDeletedNodeFromApiNodes(currentNodes ?? [], nodeId)
      )
      queryClient.setQueryData<ApiGraphEdge[]>(edgesQueryKey, (currentEdges) =>
        (currentEdges ?? []).filter(
          (edge) =>
            edge.source_node_id !== nodeId && edge.target_node_id !== nodeId
        )
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: nodesQueryKey }),
        queryClient.invalidateQueries({ queryKey: edgesQueryKey }),
      ])
      toast.success(
        `${targetNode.type === "topic" ? "Topic" : "Node"} deleted.`
      )
    },
    [
      deleteNodeMutation,
      edgesQueryKey,
      graphEdges,
      nodes,
      nodesQueryKey,
      queryClient,
      scale,
      setGraphEdges,
      setNodes,
    ]
  )
  const addConnectedNode = React.useCallback(
    async (sourceNodeId: string, nodeType: ConnectedNodeType) => {
      const sourceNode = nodes.find((node) => node.id === sourceNodeId)

      if (!sourceNode || sourceNode.type === "cluster") {
        return
      }

      if (nodeType === "topic" && sourceNode.type !== "lesson") {
        toast.error("Topics can only be attached to a lecture.")
        return
      }

      if (
        sourceNode.type === "topic" &&
        nodeType === "lesson" &&
        hasAttachedLesson(sourceNode.id, nodes, graphEdges)
      ) {
        toast.error("This topic is already attached to a lecture.")
        return
      }

      const connectedCount = graphEdges.filter(
        (edge) => edge.source === sourceNodeId || edge.target === sourceNodeId
      ).length
      const angle = ((connectedCount * 42 - 24) * Math.PI) / 180
      const distance = (nodeType === "topic" ? 88 : 118) * scale
      const position = {
        x: sourceNode.position.x + Math.cos(angle) * distance,
        y: sourceNode.position.y + Math.sin(angle) * distance,
      }

      nextCustomNodeId.current += 1

      try {
        const node = await createNodeMutation.mutateAsync({
          title: getNextDefaultNodeLabel(nodes, nodeType),
          node_type: nodeType,
          position_x: position.x,
          position_y: position.y,
          color: nodeType === "topic" ? "#61bd61" : null,
          size: nodeType === "topic" ? 22 : 56,
        })
        const edge = await createEdgeMutation.mutateAsync({
          source_node_id: sourceNodeId,
          target_node_id: node.id,
        })
        const flowEdge = createApiGraphEdge(edge)

        setGraphEdges((currentEdges) => [...currentEdges, flowEdge])
        setNodes((currentNodes) =>
          runGraphPhysics(currentNodes, [...graphEdges, flowEdge], scale)
        )
        setActiveNodeId(node.id)
      } catch {
        return
      }
    },
    [
      createEdgeMutation,
      createNodeMutation,
      graphEdges,
      nodes,
      scale,
      setGraphEdges,
      setNodes,
    ]
  )
  const undo = React.useCallback(() => {
    setHistoryPast((currentHistory) => {
      const previousSnapshot = currentHistory.at(-1)

      if (!previousSnapshot) {
        return currentHistory
      }

      setHistoryFuture((currentFuture) => [createSnapshot(), ...currentFuture])
      setNodes(previousSnapshot.nodes)
      setGraphEdges(previousSnapshot.edges)
      setCustomNodeIds(previousSnapshot.customNodeIds)

      return currentHistory.slice(0, -1)
    })
  }, [createSnapshot, setGraphEdges, setNodes])
  const redo = React.useCallback(() => {
    setHistoryFuture((currentFuture) => {
      const nextSnapshot = currentFuture[0]

      if (!nextSnapshot) {
        return currentFuture
      }

      setHistoryPast((currentHistory) => [...currentHistory, createSnapshot()])
      setNodes(nextSnapshot.nodes)
      setGraphEdges(nextSnapshot.edges)
      setCustomNodeIds(nextSnapshot.customNodeIds)

      return currentFuture.slice(1)
    })
  }, [createSnapshot, setGraphEdges, setNodes])
  const handleNodesChange = React.useCallback(
    (changes: NodeChange<GraphNode>[]) => {
      setNodes((currentNodes) =>
        normalizeGraphNodes(
          applyNodeChanges(changes, currentNodes) as GraphNode[],
          graphEdges,
          scale
        )
      )
    },
    [graphEdges, scale, setNodes]
  )
  const onConnect = React.useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return
      }

      const sourceNode = nodes.find((node) => node.id === connection.source)
      const targetNode = nodes.find((node) => node.id === connection.target)
      const connectionError = getConnectionError(
        sourceNode,
        targetNode,
        graphEdges,
        nodes
      )

      if (connectionError) {
        toast.error(connectionError)
        return
      }

      try {
        const edge = await createEdgeMutation.mutateAsync({
          source_node_id: connection.source,
          target_node_id: connection.target,
        })
        const flowEdge = createApiGraphEdge(edge)

        setGraphEdges((currentEdges) => addEdge(flowEdge, currentEdges))
        setNodes((currentNodes) =>
          runGraphPhysics(currentNodes, [...graphEdges, flowEdge], scale)
        )
      } catch {
        return
      }
    },
    [createEdgeMutation, graphEdges, nodes, scale, setGraphEdges, setNodes]
  )
  const handleSelectionChange = React.useCallback(
    ({ nodes: selectedNodes }: { nodes: GraphNode[] }) => {
      setSelectedNodeIds(selectedNodes.map((node) => node.id))
    },
    []
  )
  const handlePaneClick = React.useCallback(
    (event: React.MouseEvent) => {
      setActiveNodeId(null)

      if (!isDrawingTool) {
        return
      }

      addLessonNode(
        screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })
      )
    },
    [addLessonNode, isDrawingTool, screenToFlowPosition]
  )
  const applyNodeForces = React.useCallback(
    (_event: React.MouseEvent, draggedNode: GraphNode) => {
      if (!isForceNode(draggedNode)) {
        return
      }

      setNodes((currentNodes) => {
        const nodesWithDraggedPosition = currentNodes.map((node) => {
          if (node.id !== draggedNode.id) {
            return node
          }

          return {
            ...node,
            position: draggedNode.position,
          } as GraphNode
        })

        return runGraphPhysics(
          nodesWithDraggedPosition,
          graphEdges,
          scale,
          draggedNode.id,
          4
        )
      })
    },
    [graphEdges, scale, setNodes]
  )
  const handleNodeDragStop = React.useCallback(
    (_event: React.MouseEvent, draggedNode: GraphNode) => {
      const currentNodes = (getNodes() as GraphNode[]).map((node) => {
        if (node.id !== draggedNode.id) {
          return node
        }

        return {
          ...node,
          position: draggedNode.position,
        } as GraphNode
      })
      const normalizedNodes = normalizeGraphNodes(
        currentNodes,
        graphEdges,
        scale,
        draggedNode.id
      )

      setNodes(normalizedNodes)

      for (const node of normalizedNodes) {
        updateNodeMutation.mutate({
          nodeId: node.id,
          payload: getNodePersistencePayload(node),
        })
      }
    },
    [getNodes, graphEdges, scale, setNodes, updateNodeMutation]
  )

  React.useEffect(() => {
    setNodes((currentNodes) => {
      const customNodes = currentNodes.filter((node) =>
        customNodeIds.includes(node.id)
      )

      return normalizeGraphNodes([...apiNodes, ...customNodes], apiEdges, scale)
    })
  }, [apiEdges, apiNodes, customNodeIds, scale, setNodes])

  React.useEffect(() => {
    setGraphEdges(apiEdges)
  }, [apiEdges, setGraphEdges])

  React.useEffect(() => {
    const element = containerRef.current

    if (!element) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (nodes.length === 0) {
      return
    }

    requestAnimationFrame(() => {
      void fitView({
        padding: containerSize.width < 760 ? 0.2 : 0.12,
        includeHiddenNodes: false,
      })
    })
  }, [containerSize.height, containerSize.width, fitView, nodes.length])

  const nodeActionContextValue = React.useMemo(
    () => ({
      activeNodeId,
      addConnectedNode,
      closeNodeMenu: () => setActiveNodeId(null),
      deleteNode,
      openNodeMenu: setActiveNodeId,
      openNodePage: (nodeId: string) => {
        setActiveNodeId(null)
        router.push(`/dashboard/graphs/${graphId}/nodes/${nodeId}`)
      },
      renameNode,
    }),
    [activeNodeId, addConnectedNode, deleteNode, graphId, renameNode, router]
  )

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100svh-5rem)] min-h-[520px] w-full bg-neutral-950"
    >
      <GraphCanvasToolbar
        activeTool={activeTool}
        canCreateCircle={selectedGroupNodeIds.length > 0}
        canRedo={historyFuture.length > 0}
        canUndo={historyPast.length > 0}
        onCreateCircle={addClusterAroundSelection}
        onRedo={redo}
        onToolChange={setActiveTool}
        onUndo={undo}
      />
      <GraphCanvasStatus
        isEmpty={
          !graphNodesQuery.isLoading &&
          !graphEdgesQuery.isLoading &&
          nodes.length === 0
        }
        isError={graphNodesQuery.isError || graphEdgesQuery.isError}
        isLoading={graphNodesQuery.isLoading || graphEdgesQuery.isLoading}
      />
      <NodeActionContext.Provider value={nodeActionContextValue}>
        <ReactFlow
          nodes={nodes}
          edges={graphEdges}
          nodeTypes={nodeTypes}
          nodeOrigin={[0.5, 0.5]}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={handlePaneClick}
          onNodeDrag={applyNodeForces}
          onNodeDragStop={handleNodeDragStop}
          onSelectionChange={handleSelectionChange}
          nodesDraggable={activeTool === "cursor"}
          nodesConnectable={activeTool === "cursor"}
          elementsSelectable={activeTool === "cursor"}
          minZoom={0.45}
          maxZoom={1.7}
          panOnScroll
          panOnDrag={isHandTool}
          selectionOnDrag={activeTool === "cursor"}
          fitView
          fitViewOptions={{
            padding: containerSize.width < 760 ? 0.2 : 0.12,
            includeHiddenNodes: false,
          }}
          proOptions={{ hideAttribution: true }}
          className={cn(
            "learnable-flow",
            isHandTool && "cursor-grab active:cursor-grabbing",
            isDrawingTool && "cursor-crosshair"
          )}
        />
      </NodeActionContext.Provider>
    </div>
  )
}

function GraphCanvasToolbar({
  activeTool,
  canCreateCircle,
  canRedo,
  canUndo,
  onCreateCircle,
  onRedo,
  onToolChange,
  onUndo,
}: {
  activeTool: CanvasTool
  canCreateCircle: boolean
  canRedo: boolean
  canUndo: boolean
  onCreateCircle: () => void
  onRedo: () => void
  onToolChange: (tool: CanvasTool) => void
  onUndo: () => void
}) {
  return (
    <TooltipProvider>
      <div className="nodrag nopan nowheel absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-full border bg-neutral-900/90 px-2 py-1 text-neutral-100 backdrop-blur-xl">
        <ToggleGroup
          spacing={1}
          value={[activeTool]}
          onValueChange={(value) => {
            const nextTool = value[0]

            if (nextTool) {
              onToolChange(nextTool as CanvasTool)
            }
          }}
          className="gap-1"
        >
          <ToolbarToggleItem value="cursor" label="Cursor">
            <MousePointer2 className="size-6" strokeWidth={1.8} />
          </ToolbarToggleItem>
          <ToolbarToggleItem value="hand" label="Move canvas">
            <Hand className="size-6" strokeWidth={1.8} />
          </ToolbarToggleItem>
          <ToolbarToggleItem value="pen" label="Add node by click">
            <Plus className="size-6" strokeWidth={1.8} />
          </ToolbarToggleItem>
        </ToggleGroup>

        <div className="flex items-center gap-1">
          <ToolbarButton
            label="Create circle from selection"
            onClick={onCreateCircle}
            disabled={!canCreateCircle}
          >
            <Circle className="size-5" strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton label="Undo" onClick={onUndo} disabled={!canUndo}>
            <Undo2 className="size-5" strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton label="Redo" onClick={onRedo} disabled={!canRedo}>
            <Redo2 className="size-5" strokeWidth={1.8} />
          </ToolbarButton>
        </div>
      </div>
    </TooltipProvider>
  )
}

function GraphCanvasStatus({
  isEmpty,
  isError,
  isLoading,
}: {
  isEmpty: boolean
  isError: boolean
  isLoading: boolean
}) {
  if (!isLoading && !isError && !isEmpty) {
    return null
  }

  return (
    <div className="pointer-events-none absolute top-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-neutral-900/90 px-4 py-2 text-sm text-neutral-200 shadow-2xl backdrop-blur-xl">
      {isLoading
        ? "Loading graph..."
        : isError
          ? "Could not load graph nodes."
          : "No nodes yet."}
    </div>
  )
}

function ToolbarToggleItem({
  children,
  label,
  value,
}: {
  children: React.ReactNode
  label: string
  value: CanvasTool
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ToggleGroupItem
            value={value}
            aria-label={label}
            className="size-12 rounded-full p-0 text-neutral-300 hover:bg-white/10 hover:text-white data-[state=on]:bg-neutral-700 data-[state=on]:text-white data-[state=on]:shadow-[0_10px_26px_rgba(0,0,0,0.35)]"
          >
            {children}
          </ToggleGroupItem>
        }
      />
      <TooltipContent side="top" className="bg-neutral-100 text-neutral-950">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function ToolbarButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            size="icon-lg"
            variant="ghost"
            className="size-12 rounded-full text-neutral-300 hover:bg-white/10 hover:text-white disabled:opacity-35"
          >
            {children}
          </Button>
        }
      />
      <TooltipContent side="top" className="bg-neutral-100 text-neutral-950">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function LessonNodeView({ data, id }: NodeProps<LessonNode>) {
  return (
    <NodeActionPopover label={data.label} nodeId={id} nodeType="lesson">
      <div className="relative" style={{ width: data.size, height: data.size }}>
        <span
          className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 -translate-x-1/2 rounded bg-neutral-950/85 px-1.5 py-0.5 text-[11px] leading-none font-medium whitespace-nowrap text-neutral-200 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          aria-hidden
        >
          {data.label}
        </span>
        <div
          className="relative rounded-full bg-[#f2f2f2]"
          style={{
            width: data.size,
            height: data.size,
          }}
        />
        <FlowHandles />
      </div>
    </NodeActionPopover>
  )
}

function TopicNodeView({ data, id }: NodeProps<TopicNode>) {
  const size = data.size ?? 20

  return (
    <NodeActionPopover label={data.label ?? ""} nodeId={id} nodeType="topic">
      <div className="relative" style={{ width: size, height: size }}>
        {data.label ? (
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex items-center gap-1.5 rounded-full bg-neutral-950/90 pr-2 text-[10px] leading-none font-medium whitespace-nowrap text-neutral-200 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_18px_rgba(0,0,0,0.35)]"
            style={{
              minHeight: size,
              transform: `translate(${-size / 2}px, -50%)`,
            }}
            aria-hidden
          >
            <span
              className="shrink-0 rounded-full"
              style={{
                width: size,
                height: size,
                backgroundColor: data.color,
              }}
            />
            <span className="max-w-28 overflow-hidden text-ellipsis">
              {data.label}
            </span>
          </div>
        ) : (
          <div
            className="rounded-full"
            style={{ width: size, height: size, backgroundColor: data.color }}
          />
        )}
        <FlowHandles />
      </div>
    </NodeActionPopover>
  )
}

function ClusterNodeView({ data }: NodeProps<ClusterNode>) {
  return (
    <div
      className="relative rounded-full border border-dashed border-white/45"
      style={{ width: data.size, height: data.size }}
    >
      <span
        className={`absolute -inset-px rounded-full border border-dashed border-transparent ${
          data.accent === "left" ? "border-r-red-500/70" : "border-r-red-500/35"
        }`}
      />
    </div>
  )
}

function QuizNodeView({ data, id }: NodeProps<QuizNode>) {
  return (
    <NodeActionPopover label={data.label} nodeId={id} nodeType="quiz">
      <div className="rounded-full bg-[#4a252b]/85 px-4 py-1 text-sm font-semibold text-[#b9545c]">
        {data.label}
      </div>
    </NodeActionPopover>
  )
}

function NodeActionPopover({
  children,
  label,
  nodeId,
  nodeType,
}: {
  children: React.ReactNode
  label: string
  nodeId: string
  nodeType: "lesson" | "topic" | "quiz"
}) {
  const actions = useNodeActions()
  const [labelDraft, setLabelDraft] = React.useState(label)
  const pointerStartRef = React.useRef<{
    hasMoved: boolean
    x: number
    y: number
  } | null>(null)
  const isOpen = actions.activeNodeId === nodeId

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      actions.renameNode(nodeId, labelDraft)
    },
    [actions, labelDraft, nodeId]
  )
  const openContextMenu = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setLabelDraft(label)
      actions.openNodeMenu(nodeId)
    },
    [actions, label, nodeId]
  )
  const handleNodeClickCapture = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()

      if (event.button !== 0 || pointerStartRef.current?.hasMoved) {
        pointerStartRef.current = null
        return
      }

      pointerStartRef.current = null
      actions.openNodePage(nodeId)
    },
    [actions, nodeId]
  )
  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        pointerStartRef.current = null
        return
      }

      pointerStartRef.current = {
        hasMoved: false,
        x: event.clientX,
        y: event.clientY,
      }
    },
    []
  )
  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pointerStart = pointerStartRef.current

      if (!pointerStart) {
        return
      }

      const deltaX = event.clientX - pointerStart.x
      const deltaY = event.clientY - pointerStart.y

      if (Math.hypot(deltaX, deltaY) > 5) {
        pointerStart.hasMoved = true
      }
    },
    []
  )
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter") {
        event.preventDefault()
        actions.openNodePage(nodeId)
      }
    },
    [actions, nodeId]
  )

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          actions.closeNodeMenu()
        }
      }}
    >
      <PopoverTrigger
        nativeButton={false}
        render={
          <div
            aria-label="Open node page"
            className="cursor-pointer"
            onClickCapture={handleNodeClickCapture}
            onContextMenu={openContextMenu}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            role="button"
            tabIndex={0}
          >
            {children}
          </div>
        }
      />
      <PopoverContent
        align="center"
        className="nodrag nopan nowheel w-72 gap-3 rounded-lg border border-white/10 bg-neutral-900 p-3 text-neutral-100 shadow-2xl ring-white/10"
        side="top"
        sideOffset={12}
      >
        <PopoverHeader>
          <PopoverTitle className="text-sm text-neutral-50">
            Node menu
          </PopoverTitle>
          <PopoverDescription className="text-xs text-neutral-400">
            Edit text or create a linked item.
          </PopoverDescription>
        </PopoverHeader>

        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
          <Label
            className="text-xs text-neutral-300"
            htmlFor={`${nodeId}-text`}
          >
            Text
          </Label>
          <Input
            id={`${nodeId}-text`}
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            placeholder={nodeType === "topic" ? "Topic name" : "Node text"}
          />
          <Button
            className="w-full"
            size="sm"
            type="submit"
            variant="secondary"
          >
            <PencilLine className="size-4" />
            Save text
          </Button>
        </form>

        {nodeType !== "quiz" ? (
          <>
            <Separator className="bg-white/10" />

            <div className="grid">
              <Button
                className="justify-start"
                onClick={() => actions.addConnectedNode(nodeId, "lesson")}
                type="button"
                variant="ghost"
              >
                <Plus className="size-4" />
                {nodeType === "topic"
                  ? "Add linked lecture"
                  : "Add linked node"}
              </Button>
              {nodeType === "lesson" ? (
                <Button
                  className="justify-start"
                  onClick={() => actions.addConnectedNode(nodeId, "topic")}
                  type="button"
                  variant="ghost"
                >
                  <Circle className="size-4 fill-[#61bd61] text-[#61bd61]" />
                  Add linked topic
                </Button>
              ) : null}
              <Button
              className="justify-start"
              onClick={() => actions.deleteNode(nodeId)}
              type="button"
              variant={"ghost"}
            >
              <Trash2 className="size-4" />
              Delete {nodeType === "topic" ? "topic" : "node"}
            </Button>
            </div>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function FlowHandles() {
  return (
    <>
      <Handle
        type="source"
        id="center"
        position={Position.Top}
        className={hiddenHandleClass}
        style={centerHandleStyle}
      />
      <Handle
        type="target"
        id="center"
        position={Position.Top}
        className={hiddenHandleClass}
        style={centerHandleStyle}
      />
    </>
  )
}

function useNodeActions() {
  const context = React.useContext(NodeActionContext)

  if (!context) {
    throw new Error("Node actions must be used inside LessonGraphCanvas")
  }

  return context
}

function isEditableTextNode(
  node: GraphNode
): node is LessonNode | TopicNode | QuizNode {
  return node.type === "lesson" || node.type === "topic" || node.type === "quiz"
}

function getNodeLabel(node: LessonNode | TopicNode | QuizNode) {
  if ("label" in node.data && typeof node.data.label === "string") {
    return node.data.label
  }

  return ""
}

function getFallbackNodeLabel(node: LessonNode | TopicNode | QuizNode) {
  if (node.type === "topic") {
    return "Topic"
  }

  if (node.type === "quiz") {
    return "Quiz"
  }

  return "Lesson"
}

function getNextDefaultNodeLabel(
  nodes: GraphNode[],
  nodeType: ConnectedNodeType
) {
  const prefix = nodeType === "topic" ? "Topic " : "Lec"
  const matcher = nodeType === "topic" ? /^Topic\s+(\d+)$/ : /^Lec(\d+)$/
  const usedNumbers = new Set(
    nodes
      .filter(
        (node): node is LessonNode | TopicNode =>
          node.type === "lesson" || node.type === "topic"
      )
      .filter((node) => node.type === nodeType)
      .map((node) => getNodeLabel(node))
      .map((label) => label.match(matcher)?.[1])
      .filter((value): value is string => Boolean(value))
      .map(Number)
  )
  let nextNumber = 1

  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1
  }

  return `${prefix}${nextNumber}`
}

function getConnectionError(
  sourceNode: GraphNode | undefined,
  targetNode: GraphNode | undefined,
  edges: Edge[],
  nodes: GraphNode[]
) {
  if (!sourceNode || !targetNode) {
    return "Could not create this connection."
  }

  if (sourceNode.id === targetNode.id) {
    return "Node cannot be connected to itself."
  }

  if (sourceNode.type === "topic" && targetNode.type === "topic") {
    return "Topics can only be attached to lectures."
  }

  const topicNode =
    sourceNode.type === "topic"
      ? sourceNode
      : targetNode.type === "topic"
        ? targetNode
        : null
  const lessonNode =
    sourceNode.type === "lesson"
      ? sourceNode
      : targetNode.type === "lesson"
        ? targetNode
        : null

  if (topicNode && !lessonNode) {
    return "Topics can only be attached to lectures."
  }

  if (topicNode && hasAttachedLesson(topicNode.id, nodes, edges)) {
    return "This topic is already attached to a lecture."
  }

  return null
}

function hasAttachedLesson(topicId: string, nodes: GraphNode[], edges: Edge[]) {
  const nodeLookup = new Map(nodes.map((node) => [node.id, node]))

  return edges.some((edge) => {
    if (edge.source === topicId) {
      return nodeLookup.get(edge.target)?.type === "lesson"
    }

    if (edge.target === topicId) {
      return nodeLookup.get(edge.source)?.type === "lesson"
    }

    return false
  })
}

function createFlowEdge(id: string, source: string, target: string): Edge {
  return {
    id,
    source,
    target,
    sourceHandle: "center",
    targetHandle: "center",
    type: "straight",
    selectable: false,
    style: {
      stroke: "rgba(230, 230, 230, 0.55)",
      strokeWidth: 1,
    },
  }
}

function createApiGraphEdge(edge: ApiGraphEdge): Edge {
  return createFlowEdge(edge.id, edge.source_node_id, edge.target_node_id)
}

function createApiGraphEdges(edges: ApiGraphEdge[]): Edge[] {
  return edges.map(createApiGraphEdge)
}

function createApiGraphNodes(nodes: ApiGraphNode[]): GraphNode[] {
  return nodes.map((node) => {
    const nodeType = node.node_type ?? "lesson"
    const size = node.size ?? (nodeType === "topic" ? 22 : 56)
    const position = {
      x: node.position_x,
      y: node.position_y,
    }

    if (nodeType === "topic") {
      return {
        id: node.id,
        type: "topic",
        position,
        data: {
          color: node.color ?? "#61bd61",
          label: node.title,
          size,
        },
        style: {
          width: size,
          height: size,
        },
        zIndex: 2,
      } satisfies TopicNode
    }

    if (nodeType === "cluster") {
      return {
        id: node.id,
        type: "cluster",
        position,
        data: {
          size,
          accent: node.accent ?? "right",
          nodeIds: node.node_ids,
        },
        draggable: false,
        selectable: false,
        style: {
          width: size,
          height: size,
        },
        zIndex: 0,
      } satisfies ClusterNode
    }

    if (nodeType === "quiz") {
      return {
        id: node.id,
        type: "quiz",
        position,
        data: {
          label: node.title,
        },
        draggable: false,
        style: { width: "max-content" },
        zIndex: 3,
      } satisfies QuizNode
    }

    return {
      id: node.id,
      type: "lesson",
      position,
      data: {
        label: node.title,
        size,
      },
      style: {
        width: size,
        height: size,
      },
      zIndex: 2,
    } satisfies LessonNode
  })
}

function getNodePersistencePayload(
  node: GraphNode
): Partial<CreateGraphNodePayload> {
  if (node.type === "topic") {
    return {
      title: node.data.label ?? "Topic",
      node_type: "topic",
      position_x: node.position.x,
      position_y: node.position.y,
      color: node.data.color,
      size: node.data.size ?? 22,
    }
  }

  if (node.type === "cluster") {
    return {
      title: "Cluster",
      node_type: "cluster",
      position_x: node.position.x,
      position_y: node.position.y,
      size: node.data.size,
      accent: node.data.accent,
      node_ids: node.data.nodeIds ?? [],
    }
  }

  if (node.type === "quiz") {
    return {
      title: node.data.label,
      node_type: "quiz",
      position_x: node.position.x,
      position_y: node.position.y,
    }
  }

  return {
    title: node.data.label,
    node_type: "lesson",
    position_x: node.position.x,
    position_y: node.position.y,
    size: node.data.size,
  }
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  if (items.some((candidate) => candidate.id === item.id)) {
    return items.map((candidate) =>
      candidate.id === item.id ? item : candidate
    )
  }

  return [item, ...items]
}

function removeDeletedNodeFromGraphNodes(
  nodes: GraphNode[],
  nodeId: string
): GraphNode[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => {
      if (node.type !== "cluster") {
        return node
      }

      return {
        ...node,
        data: {
          ...node.data,
          nodeIds: node.data.nodeIds?.filter(
            (currentId) => currentId !== nodeId
          ),
        },
      } satisfies ClusterNode
    })
}

function removeDeletedNodeFromApiNodes(
  nodes: ApiGraphNode[],
  nodeId: string
): ApiGraphNode[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => {
      if (node.node_type !== "cluster") {
        return node
      }

      return {
        ...node,
        node_ids: node.node_ids.filter((currentId) => currentId !== nodeId),
      }
    })
}

function runGraphPhysics(
  nodes: GraphNode[],
  edges: Edge[],
  scale: number,
  lockedNodeId?: string,
  iterations = 12
) {
  if (nodes.length < 2) {
    return normalizeGraphNodes(nodes, edges, scale, lockedNodeId)
  }

  let simulatedNodes = normalizeGraphNodes(nodes, edges, scale, lockedNodeId)

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const nodeLookup = new Map(
      simulatedNodes.map((node) => [node.id, node] as const)
    )
    const positions = new Map(
      simulatedNodes.map((node) => [node.id, { ...node.position }] as const)
    )
    const physicsNodes = simulatedNodes.filter(isPhysicsNode)
    const center = getPhysicsCenter(physicsNodes)

    for (const edge of edges) {
      const sourceNode = nodeLookup.get(edge.source)
      const targetNode = nodeLookup.get(edge.target)
      const sourcePosition = positions.get(edge.source)
      const targetPosition = positions.get(edge.target)

      if (
        !sourceNode ||
        !targetNode ||
        !sourcePosition ||
        !targetPosition ||
        !isPhysicsNode(sourceNode) ||
        !isPhysicsNode(targetNode)
      ) {
        continue
      }

      const dx = targetPosition.x - sourcePosition.x
      const dy = targetPosition.y - sourcePosition.y
      const distance = Math.max(Math.hypot(dx, dy), 0.001)
      const restDistance = getEdgeRestDistance(sourceNode, targetNode, scale)
      const displacement = (distance - restDistance) * edgeSpringStrength
      const stepX = clampPhysicsStep((dx / distance) * displacement, scale)
      const stepY = clampPhysicsStep((dy / distance) * displacement, scale)
      const sourceLocked = sourceNode.id === lockedNodeId
      const targetLocked = targetNode.id === lockedNodeId

      if (sourceLocked && !targetLocked) {
        movePhysicsPosition(positions, targetNode.id, -stepX, -stepY, scale)
      } else if (targetLocked && !sourceLocked) {
        movePhysicsPosition(positions, sourceNode.id, stepX, stepY, scale)
      } else if (!sourceLocked && !targetLocked) {
        movePhysicsPosition(
          positions,
          sourceNode.id,
          stepX / 2,
          stepY / 2,
          scale
        )
        movePhysicsPosition(
          positions,
          targetNode.id,
          -stepX / 2,
          -stepY / 2,
          scale
        )
      }
    }

    for (let index = 0; index < physicsNodes.length; index += 1) {
      for (
        let nextIndex = index + 1;
        nextIndex < physicsNodes.length;
        nextIndex += 1
      ) {
        const first = physicsNodes[index]
        const second = physicsNodes[nextIndex]
        const firstPosition = positions.get(first.id)
        const secondPosition = positions.get(second.id)

        if (!firstPosition || !secondPosition) {
          continue
        }

        const dx = secondPosition.x - firstPosition.x
        const dy = secondPosition.y - firstPosition.y
        const distance = Math.max(Math.hypot(dx, dy), 0.001)
        const minimumDistance =
          getNodeSize(first) / 2 +
          getNodeSize(second) / 2 +
          getRepulsionDistance(first, second, scale)

        if (distance >= minimumDistance) {
          continue
        }

        const push =
          (minimumDistance - distance) * graphRepulsionStrength + 0.5 * scale
        const stepX = clampPhysicsStep((dx / distance) * push, scale)
        const stepY = clampPhysicsStep((dy / distance) * push, scale)
        const firstLocked = first.id === lockedNodeId
        const secondLocked = second.id === lockedNodeId

        if (firstLocked && !secondLocked) {
          movePhysicsPosition(positions, second.id, stepX, stepY, scale)
        } else if (secondLocked && !firstLocked) {
          movePhysicsPosition(positions, first.id, -stepX, -stepY, scale)
        } else if (!firstLocked && !secondLocked) {
          movePhysicsPosition(
            positions,
            first.id,
            -stepX / 2,
            -stepY / 2,
            scale
          )
          movePhysicsPosition(positions, second.id, stepX / 2, stepY / 2, scale)
        }
      }
    }

    for (const node of physicsNodes) {
      if (node.id === lockedNodeId) {
        continue
      }

      const position = positions.get(node.id)

      if (!position) {
        continue
      }

      movePhysicsPosition(
        positions,
        node.id,
        (center.x - position.x) * graphGravityStrength,
        (center.y - position.y) * graphGravityStrength,
        scale
      )
    }

    simulatedNodes = normalizeGraphNodes(
      simulatedNodes.map((node) => ({
        ...node,
        position: positions.get(node.id) ?? node.position,
      })),
      edges,
      scale,
      lockedNodeId
    )
  }

  return simulatedNodes
}

function getPhysicsCenter(nodes: GraphNode[]) {
  if (nodes.length === 0) {
    return { x: 0, y: 0 }
  }

  const total = nodes.reduce(
    (result, node) => ({
      x: result.x + node.position.x,
      y: result.y + node.position.y,
    }),
    { x: 0, y: 0 }
  )

  return {
    x: total.x / nodes.length,
    y: total.y / nodes.length,
  }
}

function movePhysicsPosition(
  positions: Map<string, { x: number; y: number }>,
  nodeId: string,
  dx: number,
  dy: number,
  scale: number
) {
  const position = positions.get(nodeId)

  if (!position) {
    return
  }

  position.x += clampPhysicsStep(dx, scale)
  position.y += clampPhysicsStep(dy, scale)
}

function clampPhysicsStep(value: number, scale: number) {
  const limit = maximumPhysicsStep * scale

  return Math.max(-limit, Math.min(limit, value))
}

function getEdgeRestDistance(
  sourceNode: GraphNode,
  targetNode: GraphNode,
  scale: number
) {
  const sourceSize = getNodeSize(sourceNode)
  const targetSize = getNodeSize(targetNode)
  const isLessonTopicLink =
    (sourceNode.type === "lesson" && targetNode.type === "topic") ||
    (sourceNode.type === "topic" && targetNode.type === "lesson")
  const baseDistance =
    sourceNode.type === "topic" || targetNode.type === "topic"
      ? isLessonTopicLink
        ? 48
        : 78
      : 128

  return Math.max(
    minimumSpringDistance,
    (sourceSize + targetSize) / 2 + baseDistance * scale
  )
}

function getRepulsionDistance(
  firstNode: GraphNode,
  secondNode: GraphNode,
  scale: number
) {
  if (firstNode.type === "topic" || secondNode.type === "topic") {
    return 46 * scale
  }

  return 72 * scale
}

function normalizeGraphNodes(
  nodes: GraphNode[],
  edges: Edge[],
  scale: number,
  lockedNodeId?: string
) {
  const collisionResolvedNodes = resolveNodeCollisions(
    nodes,
    scale,
    lockedNodeId
  )
  const containedNodes = containNodesInFixedClusters(
    applyClusterBounds(collisionResolvedNodes),
    edges,
    scale
  )
  const separatedNodes = separateOverlappingClusters(
    containedNodes,
    scale,
    lockedNodeId
  )
  const normalizedNodes = containNodesInFixedClusters(
    applyClusterBounds(separatedNodes),
    edges,
    scale
  )

  return positionQuizBadges(applyClusterBounds(normalizedNodes), scale)
}

function positionQuizBadges(nodes: GraphNode[], scale: number) {
  const nodeLookup = new Map(nodes.map((node) => [node.id, node]))

  return nodes.map((node) => {
    if (node.type !== "quiz") {
      return node
    }

    const badge = quizBadges.find((candidate) => candidate.quizId === node.id)

    if (!badge) {
      return node
    }

    const cluster = nodeLookup.get(badge.clusterId)

    if (cluster?.type !== "cluster") {
      return node
    }

    const radius = cluster.data.size / 2
    const angle = (badge.angle * Math.PI) / 180
    const badgeDistance = radius + 4 * scale

    return {
      ...node,
      position: {
        x: cluster.position.x + Math.cos(angle) * badgeDistance,
        y: cluster.position.y + Math.sin(angle) * badgeDistance,
      },
    }
  })
}

function getContainingCircle(nodes: GraphNode[], scale: number) {
  return getContainingCircleForItems(
    nodes.map((node) => ({
      position: node.position,
      size: getNodeSize(node),
    })),
    scale
  )
}

function getContainingCircleForItems(
  items: { position: { x: number; y: number }; size: number }[],
  scale: number
) {
  const points = items.map((item) => item.position)
  const centerCircle = getMinimumPointCircle(points)
  const padding = 24 * scale
  const radius = items.reduce((maxRadius, item) => {
    const distanceFromCenter = Math.hypot(
      item.position.x - centerCircle.center.x,
      item.position.y - centerCircle.center.y
    )

    return Math.max(maxRadius, distanceFromCenter + item.size / 2)
  }, centerCircle.radius)
  const size = Math.max(96 * scale, (radius + padding) * 2)

  return {
    center: centerCircle.center,
    size,
  }
}

function getMinimumPointCircle(points: { x: number; y: number }[]) {
  if (points.length === 0) {
    return { center: { x: 0, y: 0 }, radius: 0 }
  }

  let bestCircle = {
    center: points[0],
    radius: 0,
  }

  for (const point of points) {
    const circle = { center: point, radius: 0 }

    if (containsAllPoints(circle, points)) {
      return circle
    }
  }

  for (let firstIndex = 0; firstIndex < points.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < points.length;
      secondIndex += 1
    ) {
      const circle = getCircleFromTwoPoints(
        points[firstIndex],
        points[secondIndex]
      )

      if (
        containsAllPoints(circle, points) &&
        (!containsAllPoints(bestCircle, points) ||
          circle.radius < bestCircle.radius)
      ) {
        bestCircle = circle
      }
    }
  }

  for (let firstIndex = 0; firstIndex < points.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < points.length;
      secondIndex += 1
    ) {
      for (
        let thirdIndex = secondIndex + 1;
        thirdIndex < points.length;
        thirdIndex += 1
      ) {
        const circle = getCircleFromThreePoints(
          points[firstIndex],
          points[secondIndex],
          points[thirdIndex]
        )

        if (
          circle &&
          containsAllPoints(circle, points) &&
          (!containsAllPoints(bestCircle, points) ||
            circle.radius < bestCircle.radius)
        ) {
          bestCircle = circle
        }
      }
    }
  }

  return bestCircle
}

function getCircleFromTwoPoints(
  first: { x: number; y: number },
  second: { x: number; y: number }
) {
  const center = {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  }

  return {
    center,
    radius: Math.hypot(first.x - second.x, first.y - second.y) / 2,
  }
}

function getCircleFromThreePoints(
  first: { x: number; y: number },
  second: { x: number; y: number },
  third: { x: number; y: number }
) {
  const determinant =
    2 *
    (first.x * (second.y - third.y) +
      second.x * (third.y - first.y) +
      third.x * (first.y - second.y))

  if (Math.abs(determinant) < 0.001) {
    return null
  }

  const firstSquare = first.x ** 2 + first.y ** 2
  const secondSquare = second.x ** 2 + second.y ** 2
  const thirdSquare = third.x ** 2 + third.y ** 2
  const center = {
    x:
      (firstSquare * (second.y - third.y) +
        secondSquare * (third.y - first.y) +
        thirdSquare * (first.y - second.y)) /
      determinant,
    y:
      (firstSquare * (third.x - second.x) +
        secondSquare * (first.x - third.x) +
        thirdSquare * (second.x - first.x)) /
      determinant,
  }

  return {
    center,
    radius: Math.hypot(center.x - first.x, center.y - first.y),
  }
}

function containsAllPoints(
  circle: { center: { x: number; y: number }; radius: number },
  points: { x: number; y: number }[]
) {
  return points.every(
    (point) =>
      Math.hypot(point.x - circle.center.x, point.y - circle.center.y) <=
      circle.radius + 0.001
  )
}

function resolveNodeCollisions(
  nodes: GraphNode[],
  scale: number,
  lockedNodeId?: string
) {
  let resolvedNodes = nodes

  for (let iteration = 0; iteration < 6; iteration += 1) {
    const positions = new Map(
      resolvedNodes.map((node) => [node.id, { ...node.position }])
    )
    const collisionNodes = resolvedNodes.filter(isCollisionNode)

    for (let index = 0; index < collisionNodes.length; index += 1) {
      for (
        let nextIndex = index + 1;
        nextIndex < collisionNodes.length;
        nextIndex += 1
      ) {
        const first = collisionNodes[index]
        const second = collisionNodes[nextIndex]
        const firstPosition = positions.get(first.id)
        const secondPosition = positions.get(second.id)

        if (!firstPosition || !secondPosition) {
          continue
        }

        const dx = secondPosition.x - firstPosition.x
        const dy = secondPosition.y - firstPosition.y
        const distance = Math.max(Math.hypot(dx, dy), 0.001)
        const minimumDistance =
          getNodeSize(first) / 2 +
          getNodeSize(second) / 2 +
          collisionGap * scale

        if (distance >= minimumDistance) {
          continue
        }

        const push = minimumDistance - distance + 0.5
        const x = dx / distance
        const y = dy / distance
        const firstLocked = first.id === lockedNodeId
        const secondLocked = second.id === lockedNodeId

        if (firstLocked && !secondLocked) {
          secondPosition.x += x * push
          secondPosition.y += y * push
        } else if (secondLocked && !firstLocked) {
          firstPosition.x -= x * push
          firstPosition.y -= y * push
        } else {
          firstPosition.x -= (x * push) / 2
          firstPosition.y -= (y * push) / 2
          secondPosition.x += (x * push) / 2
          secondPosition.y += (y * push) / 2
        }
      }
    }

    resolvedNodes = resolvedNodes.map((node) => ({
      ...node,
      position: positions.get(node.id) ?? node.position,
    }))
  }

  return resolvedNodes
}

function separateOverlappingClusters(
  nodes: GraphNode[],
  scale: number,
  lockedNodeId?: string
) {
  const clusterBounds = getClusterGroups(nodes)
    .map((group) => getClusterGroupBounds(nodes, group))
    .filter((bounds): bounds is ClusterBounds => Boolean(bounds))

  if (clusterBounds.length < 2) {
    return nodes
  }

  const positions = new Map(
    nodes.map((node) => [node.id, { ...node.position }])
  )

  for (let iteration = 0; iteration < 4; iteration += 1) {
    for (let index = 0; index < clusterBounds.length; index += 1) {
      for (
        let nextIndex = index + 1;
        nextIndex < clusterBounds.length;
        nextIndex += 1
      ) {
        const first = getClusterGroupBoundsFromPositions(
          positions,
          clusterBounds[index],
          nodes
        )
        const second = getClusterGroupBoundsFromPositions(
          positions,
          clusterBounds[nextIndex],
          nodes
        )

        if (!first || !second) {
          continue
        }

        const dx = second.center.x - first.center.x
        const dy = second.center.y - first.center.y
        const distance = Math.max(Math.hypot(dx, dy), 0.001)
        const minimumDistance =
          first.size / 2 + second.size / 2 + clusterGap * scale

        if (distance >= minimumDistance) {
          continue
        }

        const push = minimumDistance - distance
        const x = dx / distance
        const y = dy / distance
        const firstHasLockedNode = first.nodeIds.includes(lockedNodeId ?? "")
        const secondHasLockedNode = second.nodeIds.includes(lockedNodeId ?? "")

        if (firstHasLockedNode && !secondHasLockedNode) {
          translateNodes(positions, second.nodeIds, x * push, y * push)
        } else if (secondHasLockedNode && !firstHasLockedNode) {
          translateNodes(positions, first.nodeIds, -x * push, -y * push)
        } else {
          translateNodes(
            positions,
            first.nodeIds,
            (-x * push) / 2,
            (-y * push) / 2
          )
          translateNodes(
            positions,
            second.nodeIds,
            (x * push) / 2,
            (y * push) / 2
          )
        }
      }
    }
  }

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }))
}

function applyClusterBounds(nodes: GraphNode[]) {
  const nodeLookup = new Map(nodes.map((node) => [node.id, node]))
  const groupLookup = new Map<string, readonly string[]>(
    getClusterGroups(nodes).map((group) => [group.clusterId, group.nodeIds])
  )

  return nodes.map((node) => {
    if (node.type !== "cluster") {
      return node
    }

    const groupNodeIds = groupLookup.get(node.id)

    if (!groupNodeIds) {
      return node
    }

    const groupNodes = groupNodeIds
      .map((nodeId) => nodeLookup.get(nodeId))
      .filter((groupNode): groupNode is GraphNode => Boolean(groupNode))

    if (groupNodes.length === 0) {
      return node
    }

    const circle =
      node.data.nodeIds && node.data.nodeIds.length > 0
        ? getContainingCircle(groupNodes, 1)
        : null
    const center = circle
      ? circle.center
      : (() => {
          const bounds = groupNodes.reduce(
            (result, groupNode) => {
              const radius = getNodeSize(groupNode) / 2

              return {
                minX: Math.min(result.minX, groupNode.position.x - radius),
                minY: Math.min(result.minY, groupNode.position.y - radius),
                maxX: Math.max(result.maxX, groupNode.position.x + radius),
                maxY: Math.max(result.maxY, groupNode.position.y + radius),
              }
            },
            {
              minX: Number.POSITIVE_INFINITY,
              minY: Number.POSITIVE_INFINITY,
              maxX: Number.NEGATIVE_INFINITY,
              maxY: Number.NEGATIVE_INFINITY,
            }
          )

          return {
            x: (bounds.minX + bounds.maxX) / 2,
            y: (bounds.minY + bounds.maxY) / 2,
          }
        })()
    const size = node.data.size

    return {
      ...node,
      position: center,
      data: {
        ...node.data,
        size,
      },
      style: {
        width: size,
        height: size,
      },
    }
  })
}

function containNodesInFixedClusters(
  nodes: GraphNode[],
  edges: Edge[],
  scale: number
) {
  const nodeLookup = new Map(nodes.map((node) => [node.id, node]))
  const positions = new Map(
    nodes.map((node) => [node.id, { ...node.position }])
  )

  for (const group of getClusterGroups(nodes)) {
    const cluster = nodeLookup.get(group.clusterId)

    if (cluster?.type !== "cluster") {
      continue
    }

    const maxRadius = cluster.data.size / 2 - clusterInnerPadding * scale
    const constrainedNodeIds = getClusterConstrainedNodeIds(
      group,
      nodeLookup,
      edges
    )

    for (const nodeId of constrainedNodeIds) {
      const node = nodeLookup.get(nodeId)
      const position = positions.get(nodeId)

      if (!node || !position) {
        continue
      }

      const allowedRadius = Math.max(0, maxRadius - getNodeSize(node) / 2)
      const dx = position.x - cluster.position.x
      const dy = position.y - cluster.position.y
      const distance = Math.hypot(dx, dy)

      if (distance <= allowedRadius) {
        continue
      }

      if (distance === 0) {
        position.x = cluster.position.x + allowedRadius
        position.y = cluster.position.y
      } else {
        position.x = cluster.position.x + (dx / distance) * allowedRadius
        position.y = cluster.position.y + (dy / distance) * allowedRadius
      }
    }
  }

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }))
}

type ClusterGroup = {
  clusterId: string
  nodeIds: readonly string[]
}

type ClusterBounds = {
  clusterId: string
  nodeIds: readonly string[]
  center: {
    x: number
    y: number
  }
  size: number
}

function getClusterGroupBounds(
  nodes: GraphNode[],
  group: ClusterGroup
): ClusterBounds | null {
  const positions = new Map(nodes.map((node) => [node.id, node.position]))

  return getClusterGroupBoundsFromPositions(positions, group, nodes)
}

function getClusterGroups(nodes: GraphNode[]): ClusterGroup[] {
  const customClusterGroups = nodes
    .filter(
      (node): node is ClusterNode =>
        node.type === "cluster" &&
        Array.isArray(node.data.nodeIds) &&
        node.data.nodeIds.length > 0
    )
    .map((node) => ({
      clusterId: node.id,
      nodeIds: node.data.nodeIds ?? [],
    }))

  return [...clusterGroups, ...customClusterGroups]
}

function getClusterConstrainedNodeIds(
  group: ClusterGroup,
  nodeLookup: Map<string, GraphNode>,
  edges: Edge[]
) {
  const constrainedNodeIds = new Set(group.nodeIds)
  const groupLessonIds = new Set(
    group.nodeIds.filter((nodeId) => nodeLookup.get(nodeId)?.type === "lesson")
  )

  if (groupLessonIds.size === 0) {
    return [...constrainedNodeIds]
  }

  for (const edge of edges) {
    const sourceNode = nodeLookup.get(edge.source)
    const targetNode = nodeLookup.get(edge.target)

    if (
      sourceNode?.type === "lesson" &&
      groupLessonIds.has(sourceNode.id) &&
      targetNode?.type === "topic"
    ) {
      constrainedNodeIds.add(targetNode.id)
    }

    if (
      targetNode?.type === "lesson" &&
      groupLessonIds.has(targetNode.id) &&
      sourceNode?.type === "topic"
    ) {
      constrainedNodeIds.add(sourceNode.id)
    }
  }

  return [...constrainedNodeIds]
}

function getClusterGroupBoundsFromPositions(
  positions: Map<string, { x: number; y: number }>,
  group: ClusterGroup | ClusterBounds,
  nodes: GraphNode[]
): ClusterBounds | null {
  const nodeLookup = new Map(nodes.map((node) => [node.id, node]))
  const groupNodes = group.nodeIds
    .map((nodeId) => {
      const node = nodeLookup.get(nodeId)
      const position = positions.get(nodeId)

      return node && position ? { node, position } : null
    })
    .filter(
      (
        groupNode
      ): groupNode is { node: GraphNode; position: { x: number; y: number } } =>
        Boolean(groupNode)
    )

  if (groupNodes.length === 0) {
    return null
  }

  const bounds = groupNodes.reduce(
    (result, groupNode) => {
      const radius = getNodeSize(groupNode.node) / 2

      return {
        minX: Math.min(result.minX, groupNode.position.x - radius),
        minY: Math.min(result.minY, groupNode.position.y - radius),
        maxX: Math.max(result.maxX, groupNode.position.x + radius),
        maxY: Math.max(result.maxY, groupNode.position.y + radius),
      }
    },
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  )
  const clusterNode = nodeLookup.get(group.clusterId)
  const currentClusterSize =
    clusterNode?.type === "cluster" ? clusterNode.data.size : 0
  const minimumSize = Math.max(
    getBaseClusterSize(group.clusterId),
    currentClusterSize
  )
  const circle =
    clusterNode?.type === "cluster" &&
    clusterNode.data.nodeIds &&
    clusterNode.data.nodeIds.length > 0
      ? getContainingCircleForItems(
          groupNodes.map((groupNode) => ({
            position: groupNode.position,
            size: getNodeSize(groupNode.node),
          })),
          1
        )
      : null

  return {
    clusterId: group.clusterId,
    nodeIds: group.nodeIds,
    center: {
      x: circle ? circle.center.x : (bounds.minX + bounds.maxX) / 2,
      y: circle ? circle.center.y : (bounds.minY + bounds.maxY) / 2,
    },
    size: minimumSize,
  }
}

function translateNodes(
  positions: Map<string, { x: number; y: number }>,
  nodeIds: readonly string[],
  dx: number,
  dy: number
) {
  for (const nodeId of nodeIds) {
    const position = positions.get(nodeId)

    if (!position) {
      continue
    }

    position.x += dx
    position.y += dy
  }
}

function isForceNode(node: GraphNode) {
  return isPhysicsNode(node)
}

function isPhysicsNode(node: GraphNode): node is LessonNode | TopicNode {
  return node.type === "lesson" || node.type === "topic"
}

function isCollisionNode(node: GraphNode) {
  return isPhysicsNode(node)
}

function getNodeSize(node: GraphNode) {
  if ("size" in node.data && typeof node.data.size === "number") {
    return node.data.size
  }

  return 20
}

function getBaseClusterSize(clusterId: string) {
  void clusterId
  return 0
}
