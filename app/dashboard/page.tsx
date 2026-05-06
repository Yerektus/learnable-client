"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ComponentProps } from "react"
import * as React from "react"
import { FolderCode, Loader2, SquareTerminal } from "lucide-react"
import { toast } from "sonner"

import { AuthGuard } from "@/components/auth/auth-guard"
import { NavGraphs, NavGraphsLoading } from "@/components/nav-graphs"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { SettingsDialog } from "@/components/settings-dialog"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getApiErrorMessage } from "@/lib/api/auth"
import { createGraph, listGraphs } from "@/lib/api/graphs"
import { useAuthStore } from "@/lib/stores/auth-store"

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isSearchDialogOpen, setIsSearchDialogOpen] = React.useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = React.useState(false)
  const [selectedGraphId, setSelectedGraphId] = React.useState<string | null>(
    null
  )
  const [graphName, setGraphName] = React.useState("")
  const [formError, setFormError] = React.useState<string | null>(null)
  const graphsQuery = useQuery({
    queryKey: ["graphs"],
    queryFn: listGraphs,
    enabled: Boolean(accessToken),
  })
  const graphs =
    graphsQuery.data?.map((graph) => ({
      id: graph.id,
      name: graph.name,
      url: "#",
      isActive: graph.id === selectedGraphId,
    })) ?? []
  const selectedGraph = graphs.find((graph) => graph.id === selectedGraphId)
  const hasSelectedGraph = Boolean(selectedGraph)
  const trimmedGraphName = graphName.trim()

  const createGraphMutation = useMutation({
    mutationFn: createGraph,
    onSuccess: async (graph) => {
      await queryClient.invalidateQueries({ queryKey: ["graphs"] })
      setGraphName("")
      setFormError(null)
      setIsCreateDialogOpen(false)
      setSelectedGraphId(graph.id)
      toast.success(`Graph "${graph.name}" created.`)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })

  function handleCreateGraphSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!trimmedGraphName) {
      setFormError("Graph name is required.")
      return
    }

    setFormError(null)
    createGraphMutation.mutate({ name: trimmedGraphName })
  }

  function closeCreateGraphDialog() {
    if (createGraphMutation.isPending) {
      return
    }

    setIsCreateDialogOpen(false)
    setGraphName("")
    setFormError(null)
  }

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="w-full bg-neutral-800">
          <div className="flex w-full bg-background">
            <AppSidebar
              userName={user?.username ?? user?.email ?? "Learner"}
              onLogout={clearAuth}
              graphs={graphs}
              isLoadingGraphs={graphsQuery.isLoading}
              onCreateGraph={() => setIsCreateDialogOpen(true)}
              onSearchGraphs={() => setIsSearchDialogOpen(true)}
              onOpenSettings={() => setIsSettingsDialogOpen(true)}
              onSelectGraph={setSelectedGraphId}
            />

            <SidebarInset className="min-h-svh bg-neutral-950">
              {hasSelectedGraph ? (
                <Tabs
                  defaultValue="graphs"
                  className="grid grid-rows-[auto_1fr] gap-0"
                >
                  <header className="sticky top-0 z-10 flex min-h-20 w-full shrink-0 items-center justify-center bg-neutral-950 px-6">
                    <TabsList>
                      <TabsTrigger value="graphs">Graphs</TabsTrigger>
                      <TabsTrigger value="kanban">Kanban</TabsTrigger>
                    </TabsList>
                  </header>

                  <TabsContent value="graphs" className="min-h-0"></TabsContent>

                  <TabsContent value="kanban" className="min-h-0 px-4 pt-6">
                    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {["Backlog", "Not started", "In progress", "Done"].map(
                        (column) => (
                          <section
                            key={column}
                            className="min-h-80 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                          >
                            <h2 className="text-sm font-medium text-neutral-200">
                              {column}
                            </h2>
                          </section>
                        )
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : graphsQuery.isLoading ? null : graphs.length > 0 ? (
                <SelectGraphEmptyState
                  onSearchGraphs={() => setIsSearchDialogOpen(true)}
                />
              ) : (
                <GraphsEmptyState
                  onCreateGraph={() => setIsCreateDialogOpen(true)}
                />
              )}
            </SidebarInset>
          </div>
        </div>

        <CreateGraphDialog
          open={isCreateDialogOpen}
          graphName={graphName}
          formError={formError}
          isPending={createGraphMutation.isPending}
          canSubmit={Boolean(trimmedGraphName)}
          onOpenChange={(open) => {
            if (!open) {
              closeCreateGraphDialog()
            } else if (!createGraphMutation.isPending) {
              setIsCreateDialogOpen(open)
            }
          }}
          onGraphNameChange={(value) => {
            setGraphName(value)
            setFormError(null)
          }}
          onCancel={closeCreateGraphDialog}
          onSubmit={handleCreateGraphSubmit}
        />
        <GraphSearchDialog
          open={isSearchDialogOpen}
          graphs={graphs}
          onOpenChange={setIsSearchDialogOpen}
          onSelectGraph={(graphId) => {
            setSelectedGraphId(graphId)
            setIsSearchDialogOpen(false)
          }}
        />
        <SettingsDialog
          open={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
        />
      </SidebarProvider>
    </AuthGuard>
  )
}

function SelectGraphEmptyState({
  onSearchGraphs,
}: {
  onSearchGraphs: () => void
}) {
  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderCode />
          </EmptyMedia>
          <EmptyTitle>No Graph Selected</EmptyTitle>
          <EmptyDescription>
            Select an existing graph to open its workspace.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button onClick={onSearchGraphs} variant="outline">
            Search Graphs
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}

function GraphsEmptyState({ onCreateGraph }: { onCreateGraph: () => void }) {
  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderCode />
          </EmptyMedia>
          <EmptyTitle>No Graphs Yet</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t created any graphs yet. Get started by creating
            your first graph.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button onClick={onCreateGraph}>Create Graph</Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}

function CreateGraphDialog({
  open,
  graphName,
  formError,
  isPending,
  canSubmit,
  onOpenChange,
  onGraphNameChange,
  onCancel,
  onSubmit,
}: {
  open: boolean
  graphName: string
  formError: string | null
  isPending: boolean
  canSubmit: boolean
  onOpenChange: (open: boolean) => void
  onGraphNameChange: (value: string) => void
  onCancel: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg bg-neutral-950 text-neutral-100 sm:max-w-sm">
        <form onSubmit={onSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>New graph</DialogTitle>
            <DialogDescription className="sr-only">
              Enter a graph name.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="graph-name">Name</FieldLabel>
            <Input
              id="graph-name"
              value={graphName}
              onChange={(event) => onGraphNameChange(event.target.value)}
              placeholder="Math"
              disabled={isPending}
              aria-invalid={Boolean(formError)}
              autoFocus
            />
            {formError ? <FieldError>{formError}</FieldError> : null}
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GraphSearchDialog({
  open,
  graphs,
  onOpenChange,
  onSelectGraph,
}: {
  open: boolean
  graphs: {
    id: string
    name: string
    url: string
    isActive?: boolean
  }[]
  onOpenChange: (open: boolean) => void
  onSelectGraph: (graphId: string) => void
}) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search graphs"
      description="Search and select a graph."
    >
      <Command>
        <CommandInput placeholder="Search graphs..." />
        <CommandList>
          <CommandEmpty>No graphs found.</CommandEmpty>
          <CommandGroup heading="Graphs">
            {graphs.map((graph) => (
              <CommandItem
                key={graph.id}
                value={`${graph.name} ${graph.id}`}
                className="rounded-md bg-transparent data-[selected=true]:bg-white/10"
                onSelect={() => onSelectGraph(graph.id)}
              >
                {graph.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

export function AppSidebar({
  userName,
  onLogout,
  graphs,
  isLoadingGraphs,
  onCreateGraph,
  onSearchGraphs,
  onOpenSettings,
  onSelectGraph,
  ...props
}: {
  userName: string
  onLogout: () => void
  graphs: {
    id: string
    name: string
    url: string
    isActive?: boolean
  }[]
  isLoadingGraphs: boolean
  onCreateGraph: () => void
  onSearchGraphs: () => void
  onOpenSettings: () => void
  onSelectGraph: (graphId: string) => void
} & ComponentProps<typeof Sidebar>) {
  const data = {
    user: {
      name: userName,
      email: "Profile",
      avatar: "",
    },
    navMain: [
      {
        title: "new graph",
        url: "#",
        icon: SquareTerminal,
        onSelect: onCreateGraph,
      },
      {
        title: "search graphs",
        url: "#",
        search: true,
        onSelect: onSearchGraphs,
      },
    ],
    graphs,
  }

  return (
    <Sidebar collapsible="icon" className="bg-neutral-950" {...props}>
      <SidebarHeader className="border-r border-sidebar-border">
        <div className="flex items-center justify-between gap-3 px-3 text-neutral-100 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <span className="text-2xl font-medium group-data-[collapsible=icon]:hidden">
            Learnable
          </span>
          <SidebarTrigger className="size-8 text-neutral-400 group-data-[state=collapsed]:cursor-e-resize group-data-[state=expanded]:cursor-w-resize hover:bg-white/10 hover:text-neutral-100" />
        </div>
      </SidebarHeader>
      <SidebarContent className="border-r border-sidebar-border">
        <NavMain items={data.navMain} />
        {isLoadingGraphs ? (
          <NavGraphsLoading />
        ) : (
          <NavGraphs graphs={data.graphs} onSelectGraph={onSelectGraph} />
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
