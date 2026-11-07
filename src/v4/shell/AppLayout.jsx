import { useState } from 'react'
import { Avatar, Button, Chip, Dropdown, Label } from '@heroui/react'
import { CloudOff, KeyRound, LogOut, MonitorSmartphone, Plus, Search } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/context/AuthContext'
import { useFeatures } from '../../shared/features/useFeatures'
import ChangePasswordDialog from '../kit/ChangePasswordDialog'
import { cx } from '../lib/format'
import { move, page } from '../lib/motion'
import { goClassic, v4 } from '../lib/paths'
import { statusLabel } from '../lib/numbers'
import { useOutbox } from '../lib/outbox'
import { useThemePreference } from '../lib/theme'
import { useIsPhone } from '../lib/useMediaQuery'
import { LANGUAGES, setLanguage, useT } from '../i18n'
import Brand from './Brand'
import CommandPalette from './CommandPalette'
import MobileNav from './MobileNav'
import { RecordPurchaseProvider, useRecordPurchase } from './RecordPurchase'
import { activeGroup, isActive, visibleNav } from './nav'
import { prefetchRoute } from './routes'

const initialsOf = (name) => (name || '?').split(/[\s_]+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent)

/** First row: the groups of the mill's day, with a pill that slides to the active one. */
function GroupTabs({ groups, current }) {
  const { t } = useT()
  return (
    <nav aria-label="Main navigation" className="mx-auto flex max-w-[1320px] gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6">
      {groups.map(g => {
        const active = g.group === current?.group
        const Icon = g.icon
        return (
          <Link key={g.group} to={g.items[0].to} onPointerEnter={() => prefetchRoute(g.items[0].to)} onFocus={() => prefetchRoute(g.items[0].to)} aria-current={active ? 'page' : undefined}
            className={cx('relative flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
              active ? 'text-accent-foreground' : 'text-muted hover:text-foreground')}>
            {active && <motion.span layoutId="v4-nav-pill" className="absolute inset-0 rounded-full bg-accent" transition={move} />}
            <Icon className="relative size-4" /><span className="relative">{t(g.label)}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/** Second row: the pages inside the active group (hidden when the group has a single page). */
function PageTabs({ group, pathname, flag }) {
  const { t } = useT()
  if (!group || group.items.length < 2) return null
  return (
    <nav aria-label="Section" className="mx-auto flex max-w-[1320px] gap-5 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6">
      {group.items.map(item => {
        const active = isActive(item, pathname)
        return (
          <Link key={item.to} to={item.to} onPointerEnter={() => prefetchRoute(item.to)} onFocus={() => prefetchRoute(item.to)} aria-current={active ? 'page' : undefined}
            className={cx('relative shrink-0 border-b-2 py-2.5 text-sm font-medium transition-colors',
              active ? 'border-accent text-foreground' : 'border-transparent text-muted hover:text-foreground')}>
            {t(item.label)}
            {item.feature && !flag(item.feature).enabled && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-warn align-middle" aria-label="Coming soon" />}
          </Link>
        )
      })}
    </nav>
  )
}

function Choice({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-field bg-surface-secondary p-0.5">
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cx('flex-1 rounded-[5px] px-2 py-1 text-xs font-medium', value === o.value ? 'bg-surface text-foreground shadow-e1' : 'text-muted')}>{o.label}</button>
      ))}
    </div>
  )
}

function OutboxBanner() {
  const { t } = useT()
  const { items, flush, discard } = useOutbox()
  if (!items.length) return null
  const waiting = items.filter(i => !i.error)
  const failed = items.filter(i => i.error)
  return (
    <div className="border-b border-border bg-warn-soft px-4 py-2 text-sm sm:px-6" role="status">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-1">
        {waiting.length > 0 && <span className="flex items-center gap-2 font-medium"><CloudOff className="size-4" />{t('outbox.waiting', { count: waiting.length })}</span>}
        {waiting.length > 0 && <button type="button" onClick={flush} className="font-semibold text-accent underline-offset-2 hover:underline">{t('outbox.retry')}</button>}
        {failed.map(i => (
          <span key={i.id} className="flex items-center gap-2 text-risk">{i.error}
            <button type="button" onClick={() => discard(i.id)} className="font-semibold underline-offset-2 hover:underline">Discard</button>
          </span>
        ))}
      </div>
    </div>
  )
}

function Shell({ children }) {
  const { t, i18n } = useT()
  const { user, logout } = useAuth()
  const { flag } = useFeatures()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const phone = useIsPhone()
  const record = useRecordPurchase()
  const [theme, setTheme] = useThemePreference()
  const [pwOpen, setPwOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const groups = visibleNav(user, flag)
  const current = activeGroup(groups, pathname)
  const isMillUser = !!user && user.role !== 'SUPER_ADMIN' && user.role !== 'DEV_ADMIN'
  const name = user?.fullName || user?.username
  const roleLabel = statusLabel(user?.role)
  const handleLogout = () => { logout(); navigate(v4('/login')) }

  return (
    <div className="v4-root">
      <header className="v4-glass sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
          <Link to={groups[0]?.items[0]?.to || v4()} className="min-w-0"><Brand isMillUser={isMillUser} /></Link>
          <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Search and jump"
            className="ml-auto flex size-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-surface text-sm text-muted transition-colors hover:text-foreground sm:ml-6 sm:h-10 sm:w-64 sm:justify-start sm:px-3">
            <Search className="size-4" /><span className="hidden sm:inline">{t('search.placeholder')}</span>
            <kbd className="ml-auto hidden rounded-[4px] border border-border bg-surface-secondary px-1.5 text-xs sm:inline">{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          {record.enabled && !phone && (
            <Button className="sm:ml-auto" onPress={record.open}><Plus className="size-4" />{t('record.title')}<kbd className="ml-1 rounded-[4px] bg-accent-foreground/20 px-1 text-xs">N</kbd></Button>
          )}
          {!record.enabled && <Chip size="sm" variant="soft" color="accent" className="hidden sm:ml-auto md:inline-flex">{roleLabel}</Chip>}
          <Dropdown>
            <Button variant="ghost" className="h-10 gap-2 rounded-full px-1.5 pr-3" aria-label="Account menu">
              <Avatar size="sm"><Avatar.Fallback className="bg-accent text-xs font-bold text-accent-foreground">{initialsOf(name)}</Avatar.Fallback></Avatar>
              <span className="hidden max-w-40 truncate text-sm font-semibold lg:inline">{name}</span>
            </Button>
            <Dropdown.Popover placement="bottom end" className="min-w-64 text-foreground">
              <div className="grid gap-3 border-b border-border px-3 py-3">
                <div><p className="text-sm font-semibold text-foreground">{name}</p><p className="text-xs text-muted">{roleLabel}</p></div>
                <Choice label={t('account.theme')} value={theme} onChange={setTheme}
                  options={[{ value: 'system', label: t('theme.system') }, { value: 'light', label: t('theme.light') }, { value: 'dark', label: t('theme.dark') }]} />
                <Choice label={t('account.language')} value={i18n.language} onChange={setLanguage}
                  options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))} />
              </div>
              <Dropdown.Menu onAction={(key) => (key === 'password' ? setPwOpen(true) : key === 'classic' ? goClassic() : handleLogout())}>
                <Dropdown.Item id="password" textValue={t('account.changePassword')}><KeyRound className="size-4 text-muted" /><Label>{t('account.changePassword')}</Label></Dropdown.Item>
                <Dropdown.Item id="classic" textValue={t('account.classic')}><MonitorSmartphone className="size-4 text-muted" /><Label>{t('account.classic')}</Label></Dropdown.Item>
                <Dropdown.Item id="logout" textValue={t('account.logout')} variant="danger"><LogOut className="size-4" /><Label>{t('account.logout')}</Label></Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
        {!phone && <GroupTabs key={i18n.language} groups={groups} current={current} />}
        <PageTabs group={current} pathname={pathname} flag={flag} />
      </header>
      <OutboxBanner />
      {phone && <MobileNav key={i18n.language} groups={groups} pathname={pathname} flag={flag} user={user} onRecord={record.enabled ? record.open : null} />}

      <AnimatePresence mode="wait">
        <motion.main key={pathname} variants={page} initial="initial" animate="animate" exit="exit"
          className="mx-auto w-full max-w-[1320px] px-4 pt-5 pb-28 sm:px-6 md:py-8">
          <div className="grid gap-6">{children}</div>
        </motion.main>
      </AnimatePresence>

      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} groups={groups} onNavigate={navigate}
        onChangePassword={() => setPwOpen(true)} onLogout={handleLogout} onRecord={record.enabled ? record.open : null} />
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}

export default function AppLayout({ children }) {
  return <RecordPurchaseProvider><Shell>{children}</Shell></RecordPurchaseProvider>
}
