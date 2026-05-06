"use client"

import { Plus, Search, type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavMainItem = {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  search?: boolean
  onSelect?: () => void
  items?: {
    title: string
    url: string
  }[]
}

export function NavMain({ items }: { items: NavMainItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            if (item.search) {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    className="rounded-md text-neutral-300 hover:bg-white/10 hover:text-white"
                    tooltip={item.title}
                    onClick={item.onSelect}
                  >
                    <Search className="size-5 shrink-0 text-neutral-300" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            }

            const Icon = item.icon

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  size={"default"}
                  isActive={item.isActive}
                  className="rounded-md text-neutral-100 hover:bg-white/10 hover:text-white data-[active=true]:bg-white/10"
                  tooltip={item.title}
                  onClick={item.onSelect}
                >
                  {item.title === "new graph" ? (
                    <Plus className="size-4 rounded-sm border border-white/70" />
                  ) : Icon ? (
                    <Icon className="size-4" />
                  ) : null}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
