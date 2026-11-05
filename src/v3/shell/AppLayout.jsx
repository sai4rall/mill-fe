import { useState } from 'react'
import { ChevronsUpDown, KeyRound, LogOut } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/v3/ui/avatar'
import { Badge } from '@/v3/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/v3/ui/dropdown-menu'
import { Separator } from '@/v3/ui/separator'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar,
} from '@/v3/ui/sidebar'
import { useAuth } from '../../shared/context/AuthContext'
import { useFeatures } from '../../shared/features/useFeatures'
import ChangePasswordDialog from '../components/ChangePasswordDialog'
import Brand from './Brand'
import { navItemFor, visibleNav } from './nav'
import { v3 } from '../lib/paths'

const initialsOf = (name) => (name || '?').split(/[\s_]+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

function NavGroups({ groups, flag, pathname }) {
  const { isMobile, setOpenMobile } = useSidebar()
  return groups.map(g => (
    <SidebarGroup key={g.group}>
      <SidebarGroupLabel>{g.group}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {g.items.map(({ to, label, icon: Icon, feature, end }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton asChild tooltip={label} isActive={end ? pathname === to : pathname.startsWith(to)}
                className="data-[active=true]:font-semibold data-[active=true]:text-emerald-700">
                <Link to={to} onClick={() => isMobile && setOpenMobile(false)}><Icon /><span>{label}</span></Link>
              </SidebarMenuButton>
              {feature && !flag(feature).enabled && <SidebarMenuBadge className="text-[10px] text-amber-600">Soon</SidebarMenuBadge>}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ))
}

function AccountMenu({ user, onChangePassword, onLogout }) {
  const { isMobile } = useSidebar()
  const name = user?.fullName || user?.username
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" aria-label="Account menu" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg bg-emerald-600 text-xs font-semibold text-white">{initialsOf(name)}</AvatarFallback></Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.role?.replaceAll('_', ' ')}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={6}>
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{user?.username}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onChangePassword}><KeyRound />Change password</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onLogout}><LogOut />Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const { flag } = useFeatures()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [pwOpen, setPwOpen] = useState(false)
  const groups = visibleNav(user, flag)
  const current = navItemFor(groups, pathname)
  const isMillUser = !!user && user.role !== 'SUPER_ADMIN' && user.role !== 'DEV_ADMIN'

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-3"><Brand isMillUser={isMillUser} /></SidebarHeader>
        <SidebarContent><nav aria-label="Main navigation"><NavGroups groups={groups} flag={flag} pathname={pathname} /></nav></SidebarContent>
        <SidebarFooter>
          <AccountMenu user={user} onChangePassword={() => setPwOpen(true)} onLogout={() => { logout(); navigate(v3('/login')) }} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" aria-label="Toggle menu" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <span className="truncate text-sm font-medium">{current?.label}</span>
          <Badge variant="outline" className="ml-auto hidden border-emerald-200 bg-emerald-50 text-emerald-700 sm:inline-flex">{user?.role?.replaceAll('_', ' ')}</Badge>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </SidebarProvider>
  )
}
