import { useState } from 'react'
import { Drawer } from '@heroui/react'
import { LayoutGrid, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { cx } from '../lib/format'
import { move } from '../lib/motion'
import { useT } from '../i18n'
import { isActive, phoneTabs } from './nav'

const tabClass = (active) => cx('relative flex flex-1 flex-col items-center gap-1 rounded-card py-2 text-xs font-semibold transition-colors', active ? 'text-accent' : 'text-muted')

/**
 * Phone navigation by role (design review): operators get Record, Purchases, Batches, Farmers; admins get Today,
 * Purchases, Batches, Money plus a floating Record button. Everything else is in the "More" sheet.
 */
export default function MobileNav({ groups, pathname, flag, user, onRecord }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const { record, tabs } = phoneTabs(user, groups)
  const inTabs = tabs.some(i => isActive(i, pathname))

  return (
    <>
      {onRecord && !record && (
        <button type="button" onClick={onRecord} aria-label={t('record.title')}
          className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-e2">
          <Plus className="size-6" />
        </button>
      )}
      <nav aria-label="Main navigation" className="v4-glass fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t border-border px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {record && onRecord && (
          <button type="button" onClick={onRecord} className={tabClass(false)} aria-label={t('record.title')}>
            <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground"><Plus className="size-4" /></span>{t('nav.record')}
          </button>
        )}
        {tabs.map(item => {
          const active = isActive(item, pathname)
          const Icon = item.icon
          return (
            <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
              {active && <motion.span layoutId="v4-mobile-pill" className="absolute inset-x-1 inset-y-0.5 rounded-card bg-accent-soft" transition={move} />}
              <Icon className="relative size-5" /><span className="relative max-w-full truncate px-1">{t(item.label)}</span>
            </Link>
          )
        })}
        <button type="button" onClick={() => setOpen(true)} aria-label="More pages" className={tabClass(!inTabs)}>
          {!inTabs && <motion.span layoutId="v4-mobile-pill" className="absolute inset-x-1 inset-y-0.5 rounded-card bg-accent-soft" transition={move} />}
          <LayoutGrid className="relative size-5" /><span className="relative">{t('nav.more')}</span>
        </button>
      </nav>

      <Drawer.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="max-h-[80dvh] rounded-t-sheet pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Drawer.Handle />
            <Drawer.Header><Drawer.Heading>{t('nav.allPages')}</Drawer.Heading></Drawer.Header>
            <Drawer.Body className="grid gap-5 overflow-y-auto">
              {groups.map(g => (
                <div key={g.group} className="grid gap-2">
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t(g.label)}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {g.items.map(item => {
                      const { to, label, icon: Icon, feature } = item
                      const active = isActive(item, pathname)
                      return (
                        <Link key={to} to={to} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
                          className={cx('relative flex flex-col items-center gap-2 rounded-card border p-3 text-center text-xs font-semibold',
                            active ? 'border-accent bg-accent-soft text-accent-soft-foreground' : 'border-border bg-surface')}>
                          <Icon className="size-5" />{t(label)}
                          {feature && !flag(feature).enabled && <span className="absolute top-2 right-2 size-1.5 rounded-full bg-warn" aria-label="Coming soon" />}
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
