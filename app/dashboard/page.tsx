"use client"

import {
  Code2,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuthStore } from "@/lib/stores/auth-store"

const graphItems = ["Math", "Discrete", "graph a", "graph a"]

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="w-full bg-neutral-800">
          <div className="flex w-full bg-background">
            <AppSidebar
              userName={user?.username ?? user?.email ?? "Learner"}
              onLogout={clearAuth}
            />

            <SidebarInset className="min-h-svh bg-neutral-950">
              <Tabs
                defaultValue="graphs"
              >
                <header className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-8 lg:px-16">
                  <div className="flex items-center gap-3">
                    <div>
                      <SidebarTrigger />
                    </div>
                    <TabsList>
                      <TabsTrigger
                        value="graphs"
                      >
                        Graphs
                      </TabsTrigger>
                      <TabsTrigger
                        value="kanban"
                      >
                        Kanban
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <Button
                    variant="outline"
                  >
                    <Sparkles className="size-4" />
                    planning panel
                  </Button>
                </header>

                <TabsContent value="graphs">
                </TabsContent>

                <TabsContent
                  value="kanban"
                  className="px-4 pb-6 sm:px-8 lg:px-16"
                >
                  <div className="grid h-full gap-4 md:grid-cols-3">
                    {["Backlog", "In progress", "Review"].map((column) => (
                      <section
                        key={column}
                        className="min-h-48 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                      >
                        <h2 className="text-sm font-medium text-neutral-200">
                          {column}
                        </h2>
                      </section>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  )
}

function AppSidebar({
  userName,
  onLogout,
}: {
  userName: string
  onLogout: () => void
}) {
  return (
    <Sidebar className="border-sidebar-border bg-neutral-950">
      <SidebarHeader className="justify-between border-r border-sidebar-border">
        <div className="min-w-0">
          <div className="truncate text-2xl font-medium text-neutral-50">
            Learnable
          </div>
          <div className="mt-1 truncate text-xs text-neutral-500">
            {userName}
          </div>
        </div>
        <SidebarTrigger className="text-neutral-200 hover:bg-white/10" />
      </SidebarHeader>

      <SidebarContent className="border-r border-sidebar-border">
        <SidebarGroup className="gap-7 px-6 pt-10">
          <SidebarGroupContent className="gap-2">
            <Button
              variant="ghost"
              className="h-7 justify-start rounded-md px-0 text-sm text-neutral-100 hover:bg-transparent hover:text-white"
            >
              <Plus className="size-4 rounded-sm border border-white/70 p-0.5" />
              new graph
            </Button>

            <label className="flex h-7 items-center gap-2 text-sm text-neutral-100">
              <Search className="size-5 text-neutral-300" />
              <Input
                placeholder="search graphs"
                className="h-7 rounded-none border-0 bg-transparent px-0 text-sm text-neutral-100 shadow-none ring-0 placeholder:text-neutral-300 focus-visible:ring-0"
              />
            </label>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-6 pt-8">
          <SidebarGroupLabel className="px-0 text-base text-neutral-100">
            Graphs
          </SidebarGroupLabel>
          <SidebarGroupContent className="-mx-6 mt-4">
            <SidebarMenu>
              {graphItems.map((item, index) => (
                <SidebarMenuItem key={`${item}-${index}`}>
                  <SidebarMenuButton
                    isActive={index === 0}
                    className="h-10 rounded-none px-8 text-neutral-200 data-[active=true]:bg-white/10"
                  >
                    <span className="truncate">{item}</span>
                  </SidebarMenuButton>
                  {index === 0 ? (
                    <SidebarMenuAction className="right-5 text-neutral-100 hover:bg-white/10">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Graph actions</span>
                    </SidebarMenuAction>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="grid gap-2 border-r border-sidebar-border px-6">
        <Button
          variant="ghost"
          className="h-8 justify-start rounded-md px-0 text-sm text-neutral-100 hover:bg-transparent hover:text-white"
        >
          <Settings2 className="size-4" />
          Settings
        </Button>
        <Button
          variant="ghost"
          className="h-8 justify-start rounded-md px-0 text-sm text-neutral-400 hover:bg-transparent hover:text-white"
          type="button"
          onClick={onLogout}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
        <div className="mt-2 inline-flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Code2 className="size-5" />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
