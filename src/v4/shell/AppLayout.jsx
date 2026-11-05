import { useState } from 'react'
import { Avatar, Button, Chip, Dropdown, Label } from '@heroui/react'
import { KeyRound, LogOut, Search } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/context/AuthContext'
import { useFeatures } from '../../shared/features/useFeatures'
import ChangePasswordDialog from '../kit/ChangePasswordDialog'
import { cx } from '../lib/format'
import { page, stagger } from '../lib/motion'
import { v4 } from '../lib/paths'
import Brand from './Brand'
import CommandPalette from './CommandPalette'
import MobileNav from './MobileNav'
import { useIsPhone } from '../lib/useMediaQuery'
import { isActive, visibleNav } from './nav'

const initialsOf = (name) => (name || '?').split(/[\s_]+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent)

/** Horizontal tabs with a pill that slides to the active page. */
function NavTabs({ items, pathname, flag }) {
  return (
    <nav aria-label="Main navigation" className="-mb-px flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:px-6">
      {items.map((item) => {
        const active = isActive(item, pathname)
        const { to, label, icon: Icon, feature } = item
        return (
          <Link key={to} to={to} aria-current={active ? 'page' : undefined}
            className={cx('relative flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
              active ? 'text-accent-foreground' : 'text-muted hover:text-foreground')}>
            {active && <motion.span layoutId="v4-nav-pill" className="absolute inset-0 rounded-full bg-accent shadow-md shadow-emerald-600/25" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            <Icon className="relative size-4" />
            <span className="relative">{label}</span>
            {feature && !flag(feature).enabled && <span className="relative size-1.5 rounded-full bg-warning" aria-label="Coming soon" />}
          </Link>
        )
      })}
    </nav>
  )
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const { flag } = useFeatures()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [pwOpen, setPwOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const groups = visibleNav(user, flag)
  const items = groups.flatMap(g => g.items)
  const isMillUser = !!user && user.role !== 'SUPER_ADMIN' && user.role !== 'DEV_ADMIN'
  const name = user?.fullName || user?.username
  const handleLogout = () => { logout(); navigate(v4('/login')) }
  const phone = useIsPhone()

  return (
    <div className="v4-root">
      <header className="v4-glass sticky top-0 z-30 border-b border-border/70">
        <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
          <Link to={items[0]?.to || v4()} className="min-w-0"><Brand isMillUser={isMillUser} /></Link>
          <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Search and jump"
            className="ml-auto flex size-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-surface/80 sm:h-10 sm:w-72 sm:justify-start sm:px-3 text-sm text-muted shadow-sm transition hover:border-accent/40 hover:text-foreground sm:ml-6">
            <Search className="size-4" /><span className="hidden sm:inline">Search or jump to…</span>
            <kbd className="ml-auto hidden rounded-md border border-border bg-surface-secondary px-1.5 text-[11px] sm:inline">{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <Chip size="sm" variant="soft" color="accent" className="hidden md:inline-flex sm:ml-auto">{user?.role?.replaceAll('_', ' ')}</Chip>
          <Dropdown>
            <Button variant="ghost" className="h-10 gap-2 rounded-full px-1.5 pr-3" aria-label="Account menu">
              <Avatar size="sm"><Avatar.Fallback className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white">{initialsOf(name)}</Avatar.Fallback></Avatar>
              <span className="hidden max-w-40 truncate text-sm font-semibold lg:inline">{name}</span>
            </Button>
            <Dropdown.Popover placement="bottom end" className="min-w-56">
              <div className="border-b border-border px-3 py-2.5"><p className="text-sm font-semibold">{name}</p><p className="text-xs text-muted">{user?.role?.replaceAll('_', ' ')}</p></div>
              <Dropdown.Menu onAction={(key) => (key === 'password' ? setPwOpen(true) : handleLogout())}>
                <Dropdown.Item id="password" textValue="Change password"><KeyRound className="size-4" /><Label>Change password</Label></Dropdown.Item>
                <Dropdown.Item id="logout" textValue="Logout" variant="danger"><LogOut className="size-4" /><Label>Logout</Label></Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
        {!phone && <NavTabs items={items} pathname={pathname} flag={flag} />}
      </header>
      {phone && <MobileNav groups={groups} items={items} pathname={pathname} flag={flag} />}

      <AnimatePresence mode="wait">
        <motion.main key={pathname} variants={page} initial="initial" animate="animate" exit="exit"
          className="mx-auto w-full max-w-[1320px] px-4 pt-5 pb-28 sm:px-6 md:py-8">
          <motion.div variants={stagger()} initial="initial" animate="animate" className="grid gap-6">{children}</motion.div>
        </motion.main>
      </AnimatePresence>

      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} groups={groups} onNavigate={navigate}
        onChangePassword={() => setPwOpen(true)} onLogout={handleLogout} />
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}
