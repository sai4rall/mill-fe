import { useMemo, useRef, useState } from 'react'
import { Button, SearchField, Switch, Tabs, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { Building2, KeyRound, Plus, Power, ShieldCheck, ToggleRight, Trash2, Upload, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignMillOwner, createSuperAdmin, deleteMill, deleteMillLogo, deleteSuperAdmin, getAllUsers, getDevMillLogo, getDevMills, getGlobalFlags, getMillFlags,
  getSuperAdmins, resetSuperAdminPassword, resetUserPassword, setMillFlag, setMillStatus, toggleSuperAdmin, updateGlobalFlag, uploadMillLogo,
} from '../../../shared/api/dev'
import { LOGO_TYPES, logoFileError, validateSuperAdmin } from '../../../shared/utils/devValidation'
import { useObjectUrl } from '../../../shared/utils/useObjectUrl'
import DataTable from '../../kit/DataTable'
import { ErrorAlert, Loading, PageHeader, StatusChip } from '../../kit/display'
import { SelectInput, TextInput } from '../../kit/fields'
import { ConfirmDialog, Panel, SubmitButton } from '../../kit/overlays'
import PasswordReveal from '../../kit/PasswordReveal'
import { useAuth } from '../../../shared/context/AuthContext'
import { errorMessage } from '../../lib/format'
import { plural, statusLabel } from '../../lib/numbers'
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

function MillCard({ mill, companies, onDelete }) {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const { data: blob } = useQuery({ queryKey: ['dev-mill-logo', mill.millId, mill.logoUpdatedAt], queryFn: () => getDevMillLogo(mill.millId, mill.logoUpdatedAt), enabled: !!mill.logoUpdatedAt, staleTime: Infinity })
  const url = useObjectUrl(blob)
  const refresh = () => { qc.invalidateQueries({ queryKey: ['dev-mills'] }); qc.invalidateQueries({ queryKey: ['dev-users'] }) }
  const upload = useMutation({ mutationFn: (f) => uploadMillLogo(mill.millId, f), onSuccess: () => { setError(''); refresh(); notify(`Logo updated for ${mill.millName}`) }, onError: e => setError(errorMessage(e)) })
  const remove = useMutation({ mutationFn: () => deleteMillLogo(mill.millId), onSuccess: () => { setError(''); refresh() }, onError: e => setError(errorMessage(e)) })
  const active = mill.status === 'ACTIVE'
  const status = useMutation({
    mutationFn: () => setMillStatus(mill.millId, active ? 'INACTIVE' : 'ACTIVE'),
    onSuccess: () => { refresh(); notify(active ? `${mill.millName} deactivated. Its users are signed out.` : `${mill.millName} activated`) },
    onError: e => setError(errorMessage(e)),
  })
  const owner = useMutation({
    mutationFn: (ownerId) => assignMillOwner(mill.millId, Number(ownerId)),
    onSuccess: (r) => { setError(''); refresh(); notify(`${mill.millName} now belongs to ${r.ownerUsername}`) },
    onError: e => setError(errorMessage(e)),
  })
  const pick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const p = logoFileError(file)
    if (p) { setError(p); return }
    upload.mutate(file)
  }
  return (
    <article className="flex gap-4 rounded-card border border-border bg-surface p-4 shadow-e1" data-testid={`mill-logo-${mill.millId}`}>
      <div className="flex size-20 shrink-0 items-center justify-center rounded-card border border-border bg-surface-secondary">
        {url ? <img src={url} alt={`${mill.millName} logo`} className="max-h-16 max-w-16 object-contain" /> : <Building2 className="size-7 text-muted" aria-label="No logo" />}
      </div>
      <div className="grid min-w-0 flex-1 content-start gap-2">
        <div>
          <p className="truncate font-semibold">{mill.millName}</p>
          <div className="flex items-center gap-2"><span className="text-xs text-muted">{mill.location || '—'}</span><StatusChip status={mill.status} /></div>
        </div>
        <SelectInput label="Company (super admin)" isDisabled={owner.isPending} placeholder="Not assigned" value={mill.ownerId ? String(mill.ownerId) : ''}
          options={companies.map(c => ({ value: String(c.id), label: c.username }))} onChange={(v) => { if (v && v !== String(mill.ownerId)) owner.mutate(v) }} />
        {!mill.ownerId && <p className="text-xs text-warn">No company owns this mill, so no super admin can see it. Assign one.</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="secondary" isPending={upload.isPending} onPress={() => fileRef.current?.click()}><Upload className="size-3.5" />{mill.logoUpdatedAt ? 'Replace logo' : 'Upload logo'}</Button>
          <input ref={fileRef} hidden type="file" accept={LOGO_TYPES.join(',')} onChange={pick} aria-label={`${mill.millName} logo file`} />
          {mill.logoUpdatedAt && <Button isIconOnly size="sm" variant="ghost" onPress={() => remove.mutate()} aria-label={`Remove ${mill.millName} logo`}><Trash2 className="size-4" /></Button>}
          <Button size="sm" variant={active ? 'danger-soft' : 'secondary'} isPending={status.isPending} onPress={() => status.mutate()} aria-label={`${active ? 'Deactivate' : 'Activate'} ${mill.millName}`}>
            <Power className="size-3.5" />{active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" variant="danger" onPress={() => onDelete(mill)} aria-label={`Delete ${mill.millName}`}><Trash2 className="size-3.5" />Delete</Button>
        </div>
        {error && <p className="text-xs text-danger" role="alert">{error}</p>}
      </div>
    </article>
  )
}

/** Deleting a mill wipes all of its data, so the name must be typed to confirm (the server checks it too). */
function DeleteMillDialog({ mill, onClose }) {
  const qc = useQueryClient()
  const [typed, setTyped] = useState('')
  const del = useMutation({
    mutationFn: () => deleteMill(mill.millId, typed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev-mills'] }); qc.invalidateQueries({ queryKey: ['dev-users'] }); qc.invalidateQueries({ queryKey: ['dev-flags'] })
      notify(`${mill.millName} and all its data were deleted`); onClose()
    },
  })
  return (
    <ConfirmDialog open={!!mill} danger title={`Delete ${mill?.millName}?`} confirmLabel="Delete mill permanently"
      message="This permanently deletes the mill, its admin and operators, farmers, purchases, payments, batches, orders, shipments, GPS history and settings. It cannot be undone."
      loading={del.isPending} confirmDisabled={typed.trim() !== mill?.millName?.trim()} onConfirm={() => del.mutate()} onClose={onClose}>
      <TextInput label={`Type “${mill?.millName}” to confirm`} autoComplete="off" value={typed} onChange={setTyped} />
      <ErrorAlert error={del.error} />
    </ConfirmDialog>
  )
}

function MillsPanel() {
  const [deleting, setDeleting] = useState(null)
  const { data: mills = [], isLoading } = useQuery({ queryKey: ['dev-mills'], queryFn: getDevMills })
  const { data: companies = [] } = useQuery({ queryKey: ['dev-super-admins'], queryFn: getSuperAdmins })
  if (isLoading) return <Loading className="py-10" />
  if (!mills.length) return <p className="py-10 text-center text-muted">No mills yet. Super admins create mills.</p>
  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted">Each super admin is a separate company and sees only the mills it owns. Logos: PNG, JPEG or WebP, up to 1 MB, shown at the top left for the mill's users. A deactivated mill's users are signed out and cannot sign in until it is activated again.</p>
      <div className="grid gap-4 md:grid-cols-2">{mills.map(m => <MillCard key={m.millId} mill={m} companies={companies} onDelete={setDeleting} />)}</div>
      {deleting && <DeleteMillDialog key={deleting.millId} mill={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}

/** Every account in the system: reset anyone's password (except your own: use Change password). */
function AccountsPanel() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [reveal, setReveal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const { data: accounts = [], isLoading, error } = useQuery({ queryKey: ['dev-users'], queryFn: getAllUsers })
  const reset = useMutation({
    mutationFn: (a) => resetUserPassword(a.id),
    onSuccess: ({ generatedPassword }, a) => { setConfirm(null); setReveal({ title: 'Password reset', username: a.username, password: generatedPassword, message: `${a.username} is signed out everywhere. Save this password now; it will not be shown again.` }) },
    onError: (e) => { setConfirm(null); notify(errorMessage(e), 'error') },
  })
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? accounts.filter(a => [a.username, a.fullName, a.millName, a.role].some(v => v?.toLowerCase().includes(q))) : accounts
  }, [accounts, query])
  const self = (a) => a.username === user?.username
  const columns = [
    { key: 'username', header: 'Username', sortValue: (a) => a.username, cell: (a) => <div><p className="font-mono font-semibold">{a.username}</p>{a.fullName && a.fullName !== a.username && <p className="text-xs text-muted">{a.fullName}</p>}</div> },
    { key: 'role', header: 'Role', sortValue: (a) => a.role, cell: (a) => statusLabel(a.role) },
    { key: 'mill', header: 'Mill', sortValue: (a) => a.millName || '', cell: (a) => (a.millName ? <span>{a.millName}{a.millStatus === 'INACTIVE' && <span className="ml-1.5 text-xs text-warn">(mill inactive)</span>}</span> : <span className="text-muted">—</span>) },
    { key: 'active', header: 'Status', cell: (a) => <StatusChip status={a.active ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'act', header: '', align: 'right',
      cell: (a) => (self(a)
        ? <span className="text-xs text-muted">You · use Change password</span>
        : <Button size="sm" variant="secondary" aria-label={`Reset password for ${a.username}`} onPress={() => setConfirm(a)}><KeyRound className="size-3.5" />Reset password</Button>),
    },
  ]
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchField aria-label="Search accounts" value={query} onChange={setQuery} className="w-full sm:w-80">
          <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="Username, name, mill or role" /><SearchField.ClearButton /></SearchField.Group>
        </SearchField>
        <p className="text-xs text-muted">{plural(accounts.length, 'account')}</p>
      </div>
      <ErrorAlert error={error} />
      <DataTable label="Accounts" rows={shown} columns={columns} loading={isLoading} minWidth={760} pageSize={25} empty="No accounts match."
        phoneRow={(a) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="truncate font-mono font-semibold">{a.username}</p><p className="text-xs text-muted">{statusLabel(a.role)}{a.millName ? ` · ${a.millName}` : ''}</p></div>
            {!self(a) && <Button size="sm" variant="secondary" aria-label={`Reset password for ${a.username}`} onPress={() => setConfirm(a)}><KeyRound className="size-3.5" />Reset</Button>}
          </div>
        )} />
      <ConfirmDialog open={!!confirm} title={`Reset password for ${confirm?.username}?`} confirmLabel="Reset password" loading={reset.isPending}
        message="A new password is generated and shown once. They are signed out of every device and must use the new password."
        onConfirm={() => reset.mutate(confirm)} onClose={() => setConfirm(null)} />
      <PasswordReveal open={!!reveal} onClose={() => setReveal(null)} {...(reveal || {})} />
    </div>
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
  const [deleting, setDeleting] = useState(null)
  const toggle = useMutation({ mutationFn: (id) => toggleSuperAdmin(id), onSuccess: refresh, onError: (e) => notify(errorMessage(e), 'error') })
  const del = useMutation({
    mutationFn: (a) => deleteSuperAdmin(a.id),
    onSuccess: (_r, a) => { setDeleting(null); refresh(); qc.invalidateQueries({ queryKey: ['dev-users'] }); notify(`Super admin ${a.username} deleted`) },
    onError: (e) => { setDeleting(null); notify(errorMessage(e), 'error') },
  })
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
          <Button size="sm" variant="danger" aria-label={`Delete ${a.username}`} onPress={() => setDeleting(a)}><Trash2 className="size-3.5" />Delete</Button>
        </div>
      ),
    },
  ]
  return (
    <div className="grid gap-4">
      <div className="flex justify-end"><Button onPress={() => { setErrors({}); create.reset(); setForm({ username: '', fullName: '' }) }}><Plus className="size-4" />Add super admin</Button></div>
      {isLoading ? <Loading className="py-10" /> : <DataTable label="Super admins" rows={admins} columns={columns} minWidth={720} />}
      <ConfirmDialog open={!!deleting} danger title={`Delete ${deleting?.username}?`} confirmLabel="Delete" loading={del.isPending}
        message="The account (company) is removed permanently and its sessions stop working. A super admin who still owns mills cannot be deleted: delete or reassign those mills first. To block access temporarily, use Disable instead."
        onConfirm={() => del.mutate(deleting)} onClose={() => setDeleting(null)} />
      <Panel open={!!form} onClose={() => setForm(null)} title="Add super admin" description="A password is generated and shown once after creating." width="sm:w-[28rem]"
        onSubmit={submit} footer={<><Button variant="tertiary" onPress={() => setForm(null)}>Cancel</Button><SubmitButton pending={create.isPending}>Create</SubmitButton></>}>
        {form && (
          <>
            <TextInput label="Username" required maxLength={50} autoComplete="off" value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} error={errors.username} />
            <TextInput label="Full name" maxLength={100} value={form.fullName} onChange={v => setForm(f => ({ ...f, fullName: v }))} error={errors.fullName} />
            <ErrorAlert error={create.error} />
          </>
        )}
      </Panel>
      <PasswordReveal open={!!reveal} onClose={() => setReveal(null)} {...(reveal || {})} />
    </div>
  )
}

export default function DevConsole() {
  return (
    <>
      <PageHeader title="Dev Console" description="Feature flags, mills, super admins and every account's password"
        icon={<div className="flex size-12 items-center justify-center rounded-card bg-warning-soft text-warning-soft-foreground"><ShieldCheck className="size-6" /></div>} />
      <Tabs defaultSelectedKey="flags">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Dev console sections">
            <Tabs.Tab id="flags"><ToggleRight className="size-4" />Feature Flags<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="mills"><Building2 className="size-4" />Mills<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="supers"><ShieldCheck className="size-4" />Super Admins<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="accounts"><Users className="size-4" />Accounts<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="flags" className="pt-5"><FlagsPanel /></Tabs.Panel>
        <Tabs.Panel id="mills" className="pt-5"><MillsPanel /></Tabs.Panel>
        <Tabs.Panel id="supers" className="pt-5"><SuperAdminsPanel /></Tabs.Panel>
        <Tabs.Panel id="accounts" className="pt-5"><AccountsPanel /></Tabs.Panel>
      </Tabs>
    </>
  )
}
