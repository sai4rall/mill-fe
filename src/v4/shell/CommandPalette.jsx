import { useEffect } from 'react'
import { Command } from 'cmdk'
import { CornerDownLeft, KeyRound, LogOut, Plus, Search } from 'lucide-react'
import { useT } from '../i18n'
import { Modal } from '@heroui/react'

/** ⌘K / Ctrl+K palette: jump to any page or run an account action. */
export default function CommandPalette({ open, setOpen, groups, onNavigate, onChangePassword, onLogout, onRecord }) {
  const { t } = useT()
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  const run = (fn) => () => { setOpen(false); fn() }
  const item = 'flex cursor-pointer items-center gap-3 rounded-field px-3 py-2.5 text-sm data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-soft-foreground'
  return (
      <Modal.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Modal.Container placement="top" className="pt-[12vh]">
          <Modal.Dialog className="overflow-hidden p-0 sm:max-w-xl" aria-label="Command palette">
            <Command label="Command palette" loop className="flex flex-col">
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search className="size-4 text-muted" />
                <Command.Input autoFocus placeholder="Search pages and actions…" className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted" />
                <kbd className="rounded-[4px] border border-border px-1.5 py-0.5 text-xs text-muted">Esc</kbd>
              </div>
              <Command.List className="max-h-[50vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-muted">No matches.</Command.Empty>
                {onRecord && (
                  <Command.Group heading="Actions" className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase">
                    <Command.Item value="Record purchase new entry" onSelect={run(onRecord)} className={item}><Plus className="size-4" />{t('record.title')}<kbd className="ml-auto text-xs text-muted">N</kbd></Command.Item>
                  </Command.Group>
                )}
                {groups.map(g => (
                  <Command.Group key={g.group} heading={t(g.label)} className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase">
                    {g.items.map(({ to, label, icon: Icon }) => (
                      <Command.Item key={to} value={`${t(g.label)} ${t(label)} ${label}`} onSelect={run(() => onNavigate(to))} className={item}>
                        <Icon className="size-4" />{t(label)}<CornerDownLeft className="ml-auto size-3.5 opacity-40" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
                <Command.Group heading="Account" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase">
                  <Command.Item value="Change password" onSelect={run(onChangePassword)} className={item}><KeyRound className="size-4" />Change password</Command.Item>
                  <Command.Item value="Logout sign out" onSelect={run(onLogout)} className={`${item} text-danger`}><LogOut className="size-4" />Logout</Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
  )
}
