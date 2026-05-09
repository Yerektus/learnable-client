"use client"

import { useParams } from "next/navigation"

import { DashboardWorkspace } from "../../dashboard-workspace"

export default function GraphDashboardPage() {
  const params = useParams<{ graphId: string }>()

  return (
    <DashboardWorkspace key={params.graphId} initialGraphId={params.graphId} />
  )
}
