"use client"

import { ChevronsUpDown, LogOut, Settings2, User } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type UserData = {
  name: string
  email: string
  avatar: string
}

export function NavUser({
  user,
  onLogout,
}: {
  user: UserData
  onLogout: () => void
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="cursor-pointer justify-start rounded-md text-neutral-100 hover:bg-white/10 hover:text-white data-popup-open:bg-white/10 data-popup-open:text-white"
                tooltip={user.name}
              />
            }
          >
            <Avatar className="h-8 w-8 bg-white/10 text-neutral-100 after:border-white/10">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-white/10 text-neutral-100">
                <User />
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-neutral-500">
                {user.email}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-neutral-500 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="min-w-44 rounded-lg border border-white/10 bg-neutral-950 p-1 text-neutral-200 shadow-xl"
          >
            <DropdownMenuItem className="cursor-pointer rounded-md hover:bg-white/10 focus:bg-white/10 focus:text-white">
              <Settings2 className="size-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-md hover:bg-white/10 focus:bg-white/10 focus:text-white"
              onClick={onLogout}
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
