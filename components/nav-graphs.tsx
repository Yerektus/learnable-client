import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar"

type Graph = {
  id: string
  name: string
  url: string
  isActive?: boolean
}

export function NavGraphs({ graphs }: { graphs: Graph[] }) {
  return (
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
                >
                  <span className="group-data-[collapsible=icon]:hidden">
                    {graph.name}
                  </span>
                </SidebarMenuButton>
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
