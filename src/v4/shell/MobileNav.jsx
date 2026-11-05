import { useState } from 'react'
import { Drawer } from '@heroui/react'
import { LayoutGrid } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { cx } from '../lib/format'
import { isActive } from './nav'

const MAX_TABS = 4

/**
 * Phone navigation: a bottom tab bar with the first pages and a "More" button that opens a sheet with every page,
 * grouped. The active tab gets a sliding pill, like the desktop tabs.
 */
export default function MobileNav({ groups, items, pathname, flag }) {
  const [open, setOpen] = useState(false)
  const tabs = items.length > MAX_TABS + 1 ? items.slice(0, MAX_TABS) : items
  const overflow = items.length > tabs.length
  const moreActive = overflow && !tabs.some(i => isActive(i, pathname))

  const tab = (key, active, icon, label, props) => (
    <Link key={key} {...props} aria-current={active ? 'page' : undefined}
      className={cx('relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition-colors', active ? 'text-accent' : 'text-muted')}>
      {active && <motion.span layoutId="v4-mobile-pill" className="absolute inset-x-1 inset-y-0.5 rounded-2xl bg-accent-soft" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
      <span className="relative">{icon}</span>
      <span className="relative max-w-full truncate px-1">{label}</span>
    </Link>
  )

  return (
    <>
      <nav aria-label="Main navigation" className="v4-glass fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t border-border/70 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden">
        {tabs.map(({ to, label, icon: Icon }) => tab(to, isActive({ to, end: items.find(i => i.to === to)?.end }, pathname), <Icon className="size-5" />, label, { to }))}
        {overflow && (
          <button type="button" onClick={() => setOpen(true)} aria-label="More pages"
            className={cx('relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold', moreActive ? 'text-accent' : 'text-muted')}>
            {moreActive && <motion.span layoutId="v4-mobile-pill" className="absolute inset-x-1 inset-y-0.5 rounded-2xl bg-accent-soft" />}
            <LayoutGrid className="relative size-5" /><span className="relative">More</span>
          </button>
        )}
      </nav>

      <Drawer.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="max-h-[80dvh] rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Drawer.Handle />
            <Drawer.Header><Drawer.Heading>All pages</Drawer.Heading></Drawer.Header>
            <Drawer.Body className="grid gap-5 overflow-y-auto">
              {groups.map(g => (
                <div key={g.group} className="grid gap-2">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">{g.group}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {g.items.map(item => {
                      const { to, label, icon: Icon, feature } = item
                      const active = isActive(item, pathname)
                      return (
                        <Link key={to} to={to} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
                          className={cx('relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-xs font-semibold transition-colors',
                            active ? 'border-accent/40 bg-accent-soft text-accent-soft-foreground' : 'border-border bg-surface')}>
                          <Icon className="size-5" />{label}
                          {feature && !flag(feature).enabled && <span className="absolute top-2 right-2 size-1.5 rounded-full bg-warning" aria-label="Coming soon" />}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  )
}
