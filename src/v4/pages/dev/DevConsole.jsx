import { useRef, useState } from 'react'
import { Button, Switch, Tabs, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { Building2, Image as ImageIcon, KeyRound, Plus, Power, ShieldCheck, ToggleRight, Trash2, Upload } from 'lucide-react'
import { motion } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSuperAdmin, deleteMillLogo, getDevMillLogo, getDevMills, getGlobalFlags, getMillFlags, getSuperAdmins, resetSuperAdminPassword,
  setMillFlag, toggleSuperAdmin, updateGlobalFlag, uploadMillLogo,
} from '../../../shared/api/dev'
import { LOGO_TYPES, logoFileError, validateSuperAdmin } from '../../../shared/utils/devValidation'
import { useObjectUrl } from '../../../shared/utils/useObjectUrl'
import DataTable from '../../kit/DataTable'
import { ErrorAlert, Loading, PageHeader, StatusChip } from '../../kit/display'
import { SelectInput, TextInput } from '../../kit/fields'
import { Dialog, SubmitButton } from '../../kit/overlays'
import PasswordReveal from '../../kit/PasswordReveal'
import { errorMessage } from '../../lib/format'
import { hoverLift, rise } from '../../lib/motion'
import { notify } from '../../lib/toast'

const toChoice = (v) => (v == null ? 'inherit' : v ? 'on' : 'off')
const fromChoice = (c) => (c === 'inherit' ? null : c === 'on')

function Toggle({ label, checked, isDisabled, onChange }) {
  return (
    <Switch aria-label={label} isSelected={checked} isDisabled={isDisabled} onChange={onChange}>
      <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Content>
    </Switch>
  )
}

function FlagsPanel() {
  const qc = useQueryClient()
  const [scope, setScope] = useState('global')
  const millId = scope === 'global' ? '' : scope
  const { data: mills = [] } = useQuery({ queryKey: ['dev-mills'], queryFn: getDevMills })
  const { data: flags = [], isLoading } = useQuery({ queryKey: ['dev-flags', millId || 'global'], queryFn: () => (millId ? getMillFlags(millId) : getGlobalFlags()) })
  const m = useMutation({
    mutationFn: ({ key, data }) => (millId ? setMillFlag(millId, key, data) : updateGlobalFlag(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['dev-flags'] }),
    onError: (e) => notify(errorMessage(e), 'error'),
  })
  const choice = (label, value, global, onChange) => (
    <ToggleButtonGroup aria-label={label} selectionMode="single" disallowEmptySelection size="sm" isDisabled={m.isPending}
      selectedKeys={new Set([toChoice(value)])} onSelectionChange={(keys) => { const c = [...keys][0]; if (c) onChange(fromChoice(c)) }}>
      <ToggleButton id="inherit">Inherit ({global ? 'On' : 'Off'})</ToggleButton>
      <ToggleButton id="on">On</ToggleButton>
      <ToggleButton id="off">Off</ToggleButton>
    </ToggleButtonGroup>
  )
  const columns = millId ? [
    { key: 'name', header: 'Module', cell: (f) => <div><p className="font-semibold">{f.name}</p><p className="font-mono text-xs text-muted">{f.key}</p></div> },
    { key: 'menu', header: 'Show in menu', cell: (f) => choice(`${f.name} show in menu`, f.overrideShowInMenu, f.globalShowInMenu, v => m.mutate({ key: f.key, data: { showInMenu: v, enabled: f.overrideEnabled } })) },
    { key: 'enabled', header: 'Enabled', cell: (f) => choice(`${f.name} enabled`, f.overrideEnabled, f.globalEnabled, v => m.mutate({ key: f.key, data: { showInMenu: f.overrideShowInMenu, enabled: v } })) },
    { key: 'effective', header: 'Effective', cell: (f) => <div className="flex gap-1"><StatusChip color={f.showInMenu ? 'success' : 'default'}>{f.showInMenu ? 'In menu' : 'Hidden'}</StatusChip><StatusChip color={f.enabled ? 'success' : 'default'}>{f.enabled ? 'Enabled' : 'Not enabled'}</StatusChip></div> },
  ] : [
    { key: 'name', header: 'Module', cell: (f) => <div><p className="font-semibold">{f.name}</p><p className="font-mono text-xs text-muted">{f.key}</p></div> },
    { key: 'menu', header: 'Show in menu', cell: (f) => <Toggle label={`${f.name} show in menu`} checked={f.showInMenu} isDisabled={m.isPending} onChange={(v) => m.mutate({ key: f.key, data: { showInMenu: v } })} /> },
    { key: 'enabled', header: 'Enabled', cell: (f) => <Toggle label={`${f.name} enabled`} checked={f.enabled} isDisabled={m.isPending} onChange={(v) => m.mutate({ key: f.key, data: { enabled: v } })} /> },
  ]

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SelectInput label="Apply to" className="sm:w-72" value={scope} onChange={(v) => setScope(v || 'global')}
          options={[{ value: 'global', label: 'All mills (global defaults)' }, ...mills.map(x => ({ value: String(x.millId), label: x.millName }))]} />
        <p className="max-w-md pb-2 text-xs text-muted">{millId ? '“Inherit” uses the global default. Overrides apply to this mill only.' : 'Applies to every mill without its own override.'}</p>
      </div>
      {isLoading ? <Loading className="py-10" /> : <DataTable label="Feature flags" rows={flags} rowKey="key" columns={columns} minWidth={millId ? 900 : 480} pageSize={50} />}
    </div>
  )
}

function LogoCard({ mill }) {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const { data: blob } = useQuery({ queryKey: ['dev-mill-logo', mill.millId, mill.logoUpdatedAt], queryFn: () => getDevMillLogo(mill.millId, mill.logoUpdatedAt), enabled: !!mill.logoUpdatedAt, staleTime: Infinity })
  const url = useObjectUrl(blob)
  const refresh = () => qc.invalidateQueries({ queryKey: ['dev-mills'] })
  const upload = useMutation({ mutationFn: (f) => uploadMillLogo(mill.millId, f), onSuccess: () => { setError(''); refresh(); notify(`Logo updated for ${mill.millName}`) }, onError: e => setError(errorMessage(e)) })
  const remove = useMutation({ mutationFn: () => deleteMillLogo(mill.millId), onSuccess: () => { setError(''); refresh() }, onError: e => setError(errorMessage(e)) })
  const pick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const p = logoFileError(file)
    if (p) { setError(p); return }
    upload.mutate(file)
  }
  return (
    <motion.article variants={rise} {...hoverLift} className="flex gap-4 rounded-3xl border border-border bg-surface p-4" data-testid={`mill-logo-${mill.millId}`}>
      <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-secondary/50">
        {url ? <img src={url} alt={`${mill.millName} logo`} className="max-h-16 max-w-16 object-contain" /> : <Building2 className="size-7 text-muted/50" aria-label="No logo" />}
      </div>
      <div className="grid min-w-0 flex-1 content-start gap-1.5">
        <p className="truncate font-bold">{mill.millName}</p>
        <div className="flex items-center gap-2"><span className="text-xs text-muted">{mill.location || '—'}</span><StatusChip status={mill.status} /></div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" isPending={upload.isPending} onPress={() => fileRef.current?.click()}><Upload className="size-3.5" />{mill.logoUpdatedAt ? 'Replace logo' : 'Upload logo'}</Button>
          <input ref={fileRef} hidden type="file" accept={LOGO_TYPES.join(',')} onChange={pick} aria-label={`${mill.millName} logo file`} />
          {mill.logoUpdatedAt && <Button isIconOnly size="sm" variant="ghost" className="text-danger" onPress={() => remove.mutate()} aria-label={`Remove ${mill.millName} logo`}><Trash2 className="size-4" /></Button>}
        </div>
        {error && <p className="text-xs text-danger" role="alert">{error}</p>}
      </div>
    </motion.article>
  )
}

function LogosPanel() {
  const { data: mills = [], isLoading } = useQuery({ queryKey: ['dev-mills'], queryFn: getDevMills })
  if (isLoading) return <Loading className="py-10" />
  if (!mills.length) return <p className="py-10 text-center text-muted">No mills yet. Super admins create mills.</p>
  return (
    <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.05 } } }} className="grid gap-3">
      <p className="text-xs text-muted">PNG, JPEG or WebP, up to 1 MB. Shown at the top left for the mill's users after login.</p>
      <div className="grid gap-4 md:grid-cols-2">{mills.map(m => <LogoCard key={m.millId} mill={m} />)}</div>
    </motion.div>
  )
}

function SuperAdminsPanel() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [reveal, setReveal] = useState(null)
  const { data: admins = [], isLoading } = useQuery({ queryKey: ['dev-super-admins'], queryFn: getSuperAdmins })
  const refresh = () => qc.invalidateQueries({ queryKey: ['dev-super-admins'] })
  const create = useMutation({ mutationFn: (d) => createSuperAdmin(d), onSuccess: (c) => { setForm(null); refresh(); setReveal({ title: 'Super admin created', username: c.username, password: c.generatedPassword }) } })
  const toggle = useMutation({ mutationFn: (id) => toggleSuperAdmin(id), onSuccess: refresh, onError: (e) => notify(errorMessage(e), 'error') })
  const reset = useMutation({
    mutationFn: ({ id }) => resetSuperAdminPassword(id),
    onSuccess: ({ generatedPassword }, { username }) => setReveal({ title: 'Password reset', username, password: generatedPassword }),
    onError: (e) => notify(errorMessage(e), 'error'),
  })
  const submit = (e) => {
    e.preventDefault()
    const found = validateSuperAdmin(form); setErrors(found)
    if (!Object.keys(found).length) create.mutate({ username: form.username.trim(), fullName: form.fullName.trim() || null })
  }
  const columns = [
    { key: 'username', header: 'Username', cell: (a) => <span className="font-mono font-semibold">{a.username}</span> },
    { key: 'fullName', header: 'Full name', cell: (a) => a.fullName || '—' },
    { key: 'active', header: 'Status', cell: (a) => <StatusChip status={a.active ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'act', header: '', align: 'right',
      cell: (a) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant={a.active ? 'danger-soft' : 'secondary'} aria-label={`${a.active ? 'Disable' : 'Enable'} ${a.username}`} onPress={() => toggle.mutate(a.id)}><Power className="size-3.5" />{a.active ? 'Disable' : 'Enable'}</Button>
          <Button size="sm" variant="secondary" aria-label={`Reset password for ${a.username}`} onPress={() => reset.mutate({ id: a.id, username: a.username })}><KeyRound className="size-3.5" />Reset</Button>
        </div>
      ),
    },
  ]
  return (
    <div className="grid gap-4">
      <div className="flex justify-end"><Button onPress={() => { setErrors({}); create.reset(); setForm({ username: '', fullName: '' }) }}><Plus className="size-4" />Add super admin</Button></div>
      {isLoading ? <Loading className="py-10" /> : <DataTable label="Super admins" rows={admins} columns={columns} minWidth={600} />}
      <Dialog open={!!form} onClose={() => setForm(null)} title="Add super admin" description="A password is generated and shown once after creating." icon={<ShieldCheck className="size-5" />} size="sm:max-w-md"
        onSubmit={submit} footer={<><Button variant="tertiary" onPress={() => setForm(null)}>Cancel</Button><SubmitButton pending={create.isPending}>Create</SubmitButton></>}>
        {form && (
          <>
            <TextInput label="Username" required maxLength={50} autoComplete="off" value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} error={errors.username} />
            <TextInput label="Full name" maxLength={100} value={form.fullName} onChange={v => setForm(f => ({ ...f, fullName: v }))} error={errors.fullName} />
            <ErrorAlert error={create.error} />
          </>
        )}
      </Dialog>
      <PasswordReveal open={!!reveal} onClose={() => setReveal(null)} {...(reveal || {})} />
    </div>
  )
}

export default function DevConsole() {
  return (
    <>
      <PageHeader title="Dev Console" description="Feature flags, mill branding and super admin accounts"
        icon={<div className="flex size-12 items-center justify-center rounded-2xl bg-warning-soft text-warning-soft-foreground"><ShieldCheck className="size-6" /></div>} />
      <Tabs defaultSelectedKey="flags">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Dev console sections">
            <Tabs.Tab id="flags"><ToggleRight className="size-4" />Feature Flags<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="logos"><ImageIcon className="size-4" />Mill Logos<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="supers"><ShieldCheck className="size-4" />Super Admins<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="flags" className="pt-5"><FlagsPanel /></Tabs.Panel>
        <Tabs.Panel id="logos" className="pt-5"><LogosPanel /></Tabs.Panel>
        <Tabs.Panel id="supers" className="pt-5"><SuperAdminsPanel /></Tabs.Panel>
      </Tabs>
    </>
  )
}
