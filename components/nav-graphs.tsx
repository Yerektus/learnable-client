"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorMessage } from "@/lib/api/auth"
import { updateGraph } from "@/lib/api/graphs"

type Graph = {
  id: string
  name: string
  url: string
  isActive?: boolean
  custom_prompt: string | null
}

export function NavGraphs({
  graphs,
  onSelectGraph,
}: {
  graphs: Graph[]
  onSelectGraph?: (graphId: string) => void
}) {
  const queryClient = useQueryClient()
  const [editingGraph, setEditingGraph] = React.useState<Graph | null>(null)
  const [promptValue, setPromptValue] = React.useState("")

  const updateMutation = useMutation({
    mutationFn: ({
      graphId,
      custom_prompt,
    }: {
      graphId: string
      custom_prompt: string
    }) => updateGraph(graphId, { custom_prompt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graphs"] })
      toast.success("Prompt saved.")
      setEditingGraph(null)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  function openEditPrompt(graph: Graph) {
    setEditingGraph(graph)
    setPromptValue(graph.custom_prompt ?? "")
  }

  function handleClose() {
    if (updateMutation.isPending) return
    setEditingGraph(null)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGraph) return
    updateMutation.mutate({
      graphId: editingGraph.id,
      custom_prompt: promptValue,
    })
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="text-base text-neutral-100">
          Graphs
        </SidebarGroupLabel>
        <SidebarGroupContent>
          {graphs.length > 0 ? (
            <SidebarMenu>
              {graphs.map((graph) => (
                <SidebarMenuItem key={graph.id}>
                  <SidebarMenuButton
                    isActive={graph.isActive}
                    className="rounded-none rounded-full text-neutral-200 hover:bg-white/10 hover:text-white data-active:bg-white/10 group-data-[collapsible=icon]:data-active:!bg-transparent group-data-[collapsible=icon]:hover:!bg-transparent"
                    tooltip={graph.name}
                    onClick={() => onSelectGraph?.(graph.id)}
                  >
                    <span className="group-data-[collapsible=icon]:hidden">
                      {graph.name}
                    </span>
                  </SidebarMenuButton>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label="Graph options"
                      className="absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground opacity-0 outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden group-hover/menu-item:opacity-100 data-popup-open:opacity-100 [&>svg]:size-4 [&>svg]:shrink-0"
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem onClick={() => openEditPrompt(graph)}>
                        Edit prompt
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          ) : (
            <div className="px-3 py-2 text-sm text-neutral-500 group-data-[collapsible=icon]:hidden">
              Empty
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <Dialog
        open={editingGraph !== null}
        onOpenChange={(open) => {
          if (!open) handleClose()
        }}
      >
        <DialogContent className="rounded-lg bg-neutral-950 text-neutral-100 sm:max-w-md">
          <form onSubmit={handleSave} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Edit prompt</DialogTitle>
              <DialogDescription className="text-neutral-400">
                Used when auto-generating materials from files
                {editingGraph ? (
                  <>
                    {" "}
                    for{" "}
                    <span className="font-medium text-neutral-200">
                      {editingGraph.name}
                    </span>
                  </>
                ) : null}
                .
              </DialogDescription>
            </DialogHeader>

            <Textarea
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder="e.g. Focus on key concepts, generate concise flashcards..."
              rows={5}
              disabled={updateMutation.isPending}
              className="resize-none"
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function NavGraphsLoading() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-base text-neutral-100">
        Graphs
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuSkeleton />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuSkeleton />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuSkeleton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
