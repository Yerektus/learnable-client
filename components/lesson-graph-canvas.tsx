"use client"

import * as React from "react"
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

type LessonData = {
  label: string
  size: number
}

type TopicData = {
  color: string
  size?: number
}

type ClusterData = {
  size: number
  accent: "left" | "right"
}

type QuizData = {
  label: string
}

type LessonNode = Node<LessonData, "lesson">
type TopicNode = Node<TopicData, "topic">
type ClusterNode = Node<ClusterData, "cluster">
type QuizNode = Node<QuizData, "quiz">
type GraphNode = LessonNode | TopicNode | ClusterNode | QuizNode

type BaseGraphNode = Omit<GraphNode, "data" | "style"> & {
  data: GraphNode["data"] & {
    size?: number
  }
}

const hiddenHandleClass =
  "!h-1 !w-1 !border-0 !bg-transparent !opacity-0"

const centerHandleStyle: React.CSSProperties = {
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
}

const springStrength = 0.16
const minimumSpringDistance = 42
const collisionGap = 10
const clusterGap = 28
const clusterInnerPadding = 14

const clusterGroups = [
  {
    clusterId: "cluster-1",
    nodeIds: [
      "topic-1",
      "topic-2",
      "topic-3",
      "topic-4",
      "lec-1",
      "lec-2",
      "lec-3",
    ],
  },
  {
    clusterId: "cluster-2",
    nodeIds: ["lec-4", "lec-5", "lec-6", "lec-7", "lec-8"],
  },
] as const

const quizBadges = [
  {
    quizId: "quiz-1",
    clusterId: "cluster-1",
    angle: 38,
  },
  {
    quizId: "quiz-2",
    clusterId: "cluster-2",
    angle: 34,
  },
] as const

const nodeTypes = {
  lesson: LessonNodeView,
  topic: TopicNodeView,
  cluster: ClusterNodeView,
  quiz: QuizNodeView,
} satisfies NodeTypes

const baseNodes: BaseGraphNode[] = [
  {
    id: "cluster-1",
    type: "cluster",
    position: { x: 280, y: 268 },
    data: { size: 380, accent: "left" },
    draggable: false,
    selectable: false,
    zIndex: 0,
  },
  {
    id: "cluster-2",
    type: "cluster",
    position: { x: 775, y: 268 },
    data: { size: 380, accent: "right" },
    draggable: false,
    selectable: false,
    zIndex: 0,
  },
  {
    id: "topic-1",
    type: "topic",
    position: { x: 142, y: 200 },
    data: { color: "#61bd61" },
  },
  {
    id: "topic-2",
    type: "topic",
    position: { x: 132, y: 292 },
    data: { color: "#61bd61" },
  },
  {
    id: "topic-3",
    type: "topic",
    position: { x: 212, y: 355 },
    data: { color: "#61bd61" },
  },
  {
    id: "topic-4",
    type: "topic",
    position: { x: 362, y: 157 },
    data: { color: "#d8d24b" },
  },
  {
    id: "lec-1",
    type: "lesson",
    position: { x: 225, y: 263 },
    data: { label: "Lec1", size: 70 },
    zIndex: 2,
  },
  {
    id: "lec-2",
    type: "lesson",
    position: { x: 330, y: 222 },
    data: { label: "Lec2", size: 52 },
    zIndex: 2,
  },
  {
    id: "lec-3",
    type: "lesson",
    position: { x: 398, y: 292 },
    data: { label: "Lec3", size: 58 },
    zIndex: 2,
  },
  {
    id: "quiz-1",
    type: "quiz",
    position: { x: 505, y: 333 },
    data: { label: "quiz 1-3 topics" },
    draggable: false,
    zIndex: 3,
  },
  {
    id: "lec-4",
    type: "lesson",
    position: { x: 645, y: 228 },
    data: { label: "Lec4", size: 50 },
    zIndex: 2,
  },
  {
    id: "lec-5",
    type: "lesson",
    position: { x: 720, y: 380 },
    data: { label: "Lec5", size: 50 },
    zIndex: 2,
  },
  {
    id: "lec-6",
    type: "lesson",
    position: { x: 790, y: 188 },
    data: { label: "Lec6", size: 50 },
    zIndex: 2,
  },
  {
    id: "lec-7",
    type: "lesson",
    position: { x: 882, y: 304 },
    data: { label: "Lec7", size: 50 },
    zIndex: 2,
  },
  {
    id: "lec-8",
    type: "lesson",
    position: { x: 1012, y: 300 },
    data: { label: "Lec8", size: 50 },
    zIndex: 2,
  },
  {
    id: "quiz-2",
    type: "quiz",
    position: { x: 982, y: 328 },
    data: { label: "quiz 4-7 topics" },
    draggable: false,
    zIndex: 3,
  },
]

const edges: Edge[] = [
  connect("topic-1", "lec-1"),
  connect("topic-2", "lec-1"),
  connect("topic-3", "lec-1"),
  connect("lec-1", "lec-2"),
  connect("lec-2", "topic-4"),
  connect("lec-2", "lec-3"),
  connect("lec-3", "lec-4"),
  connect("lec-4", "lec-5"),
  connect("lec-5", "lec-6"),
  connect("lec-6", "lec-7"),
  connect("lec-7", "lec-8"),
]

export function LessonGraphCanvas() {
  return (
    <ReactFlowProvider>
      <ResponsiveLessonGraph />
    </ReactFlowProvider>
  )
}

function ResponsiveLessonGraph() {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow<GraphNode, Edge>()
  const [containerSize, setContainerSize] = React.useState({
    width: 1180,
    height: 620,
  })
  const scale = React.useMemo(() => {
    const widthScale = containerSize.width / 1180
    const heightScale = containerSize.height / 620

    return Math.min(1.18, Math.max(0.68, Math.min(widthScale, heightScale)))
  }, [containerSize.height, containerSize.width])
  const responsiveNodes = React.useMemo(
    () => createResponsiveNodes(scale),
    [scale]
  )
  const [nodes, setNodes] = useNodesState<GraphNode>(
    normalizeGraphNodes(responsiveNodes, scale)
  )
  const [graphEdges, setGraphEdges, onEdgesChange] = useEdgesState(edges)
  const handleNodesChange = React.useCallback(
    (changes: NodeChange<GraphNode>[]) => {
      setNodes((currentNodes) =>
        normalizeGraphNodes(
          applyNodeChanges(changes, currentNodes) as GraphNode[],
          scale
        )
      )
    },
    [scale, setNodes]
  )
  const onConnect = React.useCallback(
    (connection: Connection) => {
      setGraphEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            sourceHandle: "center",
            targetHandle: "center",
            type: "straight",
            selectable: false,
            style: {
              stroke: "rgba(230, 230, 230, 0.55)",
              strokeWidth: 1,
            },
          },
          currentEdges
        )
      )
    },
    [setGraphEdges]
  )
  const applyNodeForces = React.useCallback(
    (_event: React.MouseEvent, draggedNode: GraphNode) => {
      if (!isForceNode(draggedNode)) {
        return
      }

      setNodes((currentNodes) => {
        const dragged = {
          ...(currentNodes.find((node) => node.id === draggedNode.id) ??
            draggedNode),
          position: draggedNode.position,
        }
        const connectedNodeIds = new Set<string>()

        for (const edge of graphEdges) {
          if (edge.source === dragged.id) {
            connectedNodeIds.add(edge.target)
          }

          if (edge.target === dragged.id) {
            connectedNodeIds.add(edge.source)
          }
        }

        if (connectedNodeIds.size === 0) {
          return currentNodes
        }

        const nextNodes = currentNodes.map((node) => {
          if (node.id === dragged.id) {
            return dragged
          }

          if (!connectedNodeIds.has(node.id) || !isForceNode(node)) {
            return node
          }

          const dx = dragged.position.x - node.position.x
          const dy = dragged.position.y - node.position.y
          const distance = Math.max(Math.hypot(dx, dy), 1)
          const restDistance = Math.max(
            minimumSpringDistance,
            (getNodeSize(dragged) + getNodeSize(node)) * 0.9
          )
          const force = (distance - restDistance) * springStrength
          const nextX = node.position.x + (dx / distance) * force
          const nextY = node.position.y + (dy / distance) * force

          return {
            ...node,
            position: {
              x: nextX,
              y: nextY,
            },
          }
        })

        return normalizeGraphNodes(nextNodes, scale, dragged.id)
      })
    },
    [graphEdges, scale, setNodes]
  )

  React.useEffect(() => {
    setNodes(normalizeGraphNodes(responsiveNodes, scale))
  }, [responsiveNodes, scale, setNodes])

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
    requestAnimationFrame(() => {
      void fitView({
        padding: containerSize.width < 760 ? 0.2 : 0.12,
        includeHiddenNodes: false,
      })
    })
  }, [containerSize.height, containerSize.width, fitView])

  return (
    <div
      ref={containerRef}
      className="h-[calc(100svh-5rem)] min-h-[520px] w-full bg-[#111415]"
    >
      <ReactFlow
        nodes={nodes}
        edges={graphEdges}
        nodeTypes={nodeTypes}
        nodeOrigin={[0.5, 0.5]}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={applyNodeForces}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        minZoom={0.45}
        maxZoom={1.7}
        panOnScroll
        fitView
        fitViewOptions={{
          padding: containerSize.width < 760 ? 0.2 : 0.12,
          includeHiddenNodes: false,
        }}
        proOptions={{ hideAttribution: true }}
        className="learnable-flow"
      />
    </div>
  )
}

function LessonNodeView({ data }: NodeProps<LessonNode>) {
  return (
    <div
      className="relative"
      style={{ width: data.size, height: data.size }}
    >
      <span
        className="absolute -left-9 top-[38%] z-10 whitespace-nowrap text-[11px] font-medium text-neutral-300"
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
  )
}

function TopicNodeView({ data }: NodeProps<TopicNode>) {
  const size = data.size ?? 20

  return (
    <div
      className="rounded-full"
      style={{ width: size, height: size, backgroundColor: data.color }}
    >
      <FlowHandles />
    </div>
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

function QuizNodeView({ data }: NodeProps<QuizNode>) {
  return (
    <div className="rounded-full bg-[#4a252b]/85 px-4 py-1 text-sm font-semibold text-[#b9545c]">
      {data.label}
    </div>
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

function connect(source: string, target: string): Edge {
  return {
    id: `${source}-${target}`,
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

function createResponsiveNodes(scale: number): GraphNode[] {
  return baseNodes.map((node) => {
    const size = node.data.size ?? 20
    const nextNode = {
      ...node,
      position: {
        x: Math.round(node.position.x * scale),
        y: Math.round(node.position.y * scale),
      },
      data: {
        ...node.data,
        size,
      },
    } as GraphNode

    if (node.type === "quiz") {
      return {
        ...nextNode,
        style: { width: "max-content" },
      }
    }

    return {
      ...nextNode,
      style: {
        width: size,
        height: size,
      },
    }
  })
}

function normalizeGraphNodes(
  nodes: GraphNode[],
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
    scale
  )
  const separatedNodes = separateOverlappingClusters(
    containedNodes,
    scale,
    lockedNodeId
  )
  const normalizedNodes = containNodesInFixedClusters(
    applyClusterBounds(separatedNodes),
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

        const push = (minimumDistance - distance) + 0.5
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
  const clusterBounds = clusterGroups
    .map((group) => getClusterGroupBounds(nodes, group))
    .filter((bounds): bounds is ClusterBounds => Boolean(bounds))

  if (clusterBounds.length < 2) {
    return nodes
  }

  const positions = new Map(nodes.map((node) => [node.id, { ...node.position }]))

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
          translateNodes(positions, first.nodeIds, (-x * push) / 2, (-y * push) / 2)
          translateNodes(positions, second.nodeIds, (x * push) / 2, (y * push) / 2)
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
    clusterGroups.map((group) => [group.clusterId, group.nodeIds])
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
    const size = node.data.size

    return {
      ...node,
      position: {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      },
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

function containNodesInFixedClusters(nodes: GraphNode[], scale: number) {
  const nodeLookup = new Map(nodes.map((node) => [node.id, node]))
  const positions = new Map(nodes.map((node) => [node.id, { ...node.position }]))

  for (const group of clusterGroups) {
    const cluster = nodeLookup.get(group.clusterId)

    if (cluster?.type !== "cluster") {
      continue
    }

    const maxRadius = cluster.data.size / 2 - clusterInnerPadding * scale

    for (const nodeId of group.nodeIds) {
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

type ClusterGroup = (typeof clusterGroups)[number]

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

  return {
    clusterId: group.clusterId,
    nodeIds: group.nodeIds,
    center: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
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
  return node.type === "lesson" || node.type === "topic"
}

function isCollisionNode(node: GraphNode) {
  return node.type === "lesson" || node.type === "topic"
}

function getNodeSize(node: GraphNode) {
  if ("size" in node.data && typeof node.data.size === "number") {
    return node.data.size
  }

  return 20
}

function getBaseClusterSize(clusterId: string) {
  const cluster = baseNodes.find((node) => node.id === clusterId)

  if (cluster && "size" in cluster.data && typeof cluster.data.size === "number") {
    return cluster.data.size
  }

  return 380
}
