import { useRef, useState } from 'react'
import { Building2, Image as ImageIcon, KeyRound, Loader2, Plus, Power, ShieldCheck, ToggleRight, Trash2, Upload } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/v3/ui/button'
import { Card } from '@/v3/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/v3/ui/dialog'
import { Input } from '@/v3/ui/input'
import { Switch } from '@/v3/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v3/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/v3/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/v3/ui/toggle-group'
import {
  createSuperAdmin, deleteMillLogo, getDevMillLogo, getDevMills, getGlobalFlags, getMillFlags, getSuperAdmins, resetSuperAdminPassword,
  setMillFlag, toggleSuperAdmin, updateGlobalFlag, uploadMillLogo,
} from '../../../shared/api/dev'
import { LOGO_TYPES, logoFileError, validateSuperAdmin } from '../../../shared/utils/devValidation'
import { useObjectUrl } from '../../../shared/utils/useObjectUrl'
import PageHeader from '../../components/PageHeader'
import ErrorAlert from '../../components/ErrorAlert'
import Field from '../../components/Field'
import PasswordDialog from '../../components/PasswordDialog'
import SelectField from '../../components/SelectField'
import StatusBadge, { Tone } from '../../components/StatusBadge'
import Loading from '../../components/Loading'
import { errorMessage } from '../../lib/format'
import { notify } from '../../lib/toast'

const toChoice = (v) => (v == null ? 'inherit' : v ? 'on' : 'off')
const fromChoice = (c) => (c === 'inherit' ? null : c === 'on')

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
    <ToggleGroup type="single" variant="outline" size="sm" value={toChoice(value)} disabled={m.isPending} aria-label={label} onValueChange={(c) => c && onChange(fromChoice(c))}>
      <ToggleGroupItem value="inherit" className="px-2.5 text-xs">Inherit ({global ? 'On' : 'Off'})</ToggleGroupItem>
      <ToggleGroupItem value="on" className="px-3 text-xs">On</ToggleGroupItem>
      <ToggleGroupItem value="off" className="px-3 text-xs">Off</ToggleGroupItem>
    </ToggleGroup>
  )

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field id="flag-scope" label="Apply to" className="w-full sm:w-72">
          <SelectField id="flag-scope" value={scope} onChange={setScope}
            options={[{ value: 'global', label: 'All mills (global defaults)' }, ...mills.map(x => ({ value: String(x.millId), label: x.millName }))]} />
        </Field>
        <p className="max-w-md pb-2 text-xs text-muted-foreground">{millId ? '“Inherit” uses the global default. Overrides apply to this mill only.' : 'Applies to every mill without its own override.'}</p>
      </div>
      {isLoading ? <Loading className="py-10" /> : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table style={{ minWidth: millId ? 880 : 480 }}>
            <TableHeader className="bg-muted/50"><TableRow><TableHead className="px-5">Module</TableHead><TableHead>Show in menu</TableHead><TableHead>Enabled</TableHead>{millId && <TableHead>Effective</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {flags.map(f => (
                <TableRow key={f.key}>
                  <TableCell className="px-5"><p className="font-medium">{f.name}</p><p className="font-mono text-xs text-muted-foreground">{f.key}</p></TableCell>
                  {millId ? (
                    <>
                      <TableCell>{choice(`${f.name} show in menu`, f.overrideShowInMenu, f.globalShowInMenu, v => m.mutate({ key: f.key, data: { showInMenu: v, enabled: f.overrideEnabled } }))}</TableCell>
                      <TableCell>{choice(`${f.name} enabled`, f.overrideEnabled, f.globalEnabled, v => m.mutate({ key: f.key, data: { showInMenu: f.overrideShowInMenu, enabled: v } }))}</TableCell>
                      <TableCell><div className="flex gap-1"><Tone tone={f.showInMenu ? 'green' : 'gray'}>{f.showInMenu ? 'In menu' : 'Hidden'}</Tone><Tone tone={f.enabled ? 'green' : 'gray'}>{f.enabled ? 'Enabled' : 'Not enabled'}</Tone></div></TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell><Switch checked={f.showInMenu} disabled={m.isPending} aria-label={`${f.name} show in menu`} onCheckedChange={(v) => m.mutate({ key: f.key, data: { showInMenu: v } })} /></TableCell>
                      <TableCell><Switch checked={f.enabled} disabled={m.isPending} aria-label={`${f.name} enabled`} onCheckedChange={(v) => m.mutate({ key: f.key, data: { enabled: v } })} /></TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function LogoCard({ mill }) {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const { data: blob } = useQuery({
    queryKey: ['dev-mill-logo', mill.millId, mill.logoUpdatedAt], queryFn: () => getDevMillLogo(mill.millId, mill.logoUpdatedAt),
    enabled: !!mill.logoUpdatedAt, staleTime: Infinity,
  })
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
    <Card className="flex-row gap-4 p-4" data-testid={`mill-logo-${mill.millId}`}>
      <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
        {url ? <img src={url} alt={`${mill.millName} logo`} className="max-h-16 max-w-16 object-contain" /> : <Building2 className="size-7 text-muted-foreground/50" aria-label="No logo" />}
      </div>
      <div className="grid min-w-0 flex-1 content-start gap-1.5">
        <p className="truncate font-semibold">{mill.millName}</p>
        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{mill.location || '—'}</span><StatusBadge status={mill.status} /></div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
            {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}{mill.logoUpdatedAt ? 'Replace logo' : 'Upload logo'}
          </Button>
          <input ref={fileRef} hidden type="file" accept={LOGO_TYPES.join(',')} onChange={pick} aria-label={`${mill.millName} logo file`} />
          {mill.logoUpdatedAt && <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" onClick={() => remove.mutate()} aria-label={`Remove ${mill.millName} logo`}><Trash2 /></Button>}
        </div>
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      </div>
    </Card>
  )
}

function LogosPanel() {
  const { data: mills = [], isLoading } = useQuery({ queryKey: ['dev-mills'], queryFn: getDevMills })
  if (isLoading) return <Loading className="py-10" />
  if (!mills.length) return <p className="py-10 text-center text-muted-foreground">No mills yet. Super admins create mills.</p>
  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">PNG, JPEG or WebP, up to 1 MB. Shown at the top left for the mill's users after login.</p>
      <div className="grid gap-4 md:grid-cols-2">{mills.map(m => <LogoCard key={m.millId} mill={m} />)}</div>
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
  const create = useMutation({
    mutationFn: (d) => createSuperAdmin(d),
    onSuccess: (c) => { setForm(null); refresh(); setReveal({ title: 'Super admin created', username: c.username, password: c.generatedPassword }) },
  })
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

  return (
    <div className="grid gap-4">
      <div className="flex justify-end"><Button onClick={() => { setErrors({}); create.reset(); setForm({ username: '', fullName: '' }) }}><Plus />Add super admin</Button></div>
      {isLoading ? <Loading className="py-10" /> : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table className="min-w-[560px]">
            <TableHeader className="bg-muted/50"><TableRow><TableHead className="px-5">Username</TableHead><TableHead>Full name</TableHead><TableHead>Status</TableHead><TableHead className="px-5 text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {admins.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="px-5 font-mono font-medium">{a.username}</TableCell>
                  <TableCell>{a.fullName || '—'}</TableCell>
                  <TableCell><StatusBadge status={a.active ? 'ACTIVE' : 'INACTIVE'} /></TableCell>
                  <TableCell className="px-5">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className={a.active ? 'text-destructive hover:text-destructive' : 'text-emerald-700'}
                        aria-label={`${a.active ? 'Disable' : 'Enable'} ${a.username}`} onClick={() => toggle.mutate(a.id)}><Power />{a.active ? 'Disable' : 'Enable'}</Button>
                      <Button size="sm" variant="outline" aria-label={`Reset password for ${a.username}`} onClick={() => reset.mutate({ id: a.id, username: a.username })}><KeyRound />Reset</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-md">
          {form && (
            <form className="grid gap-4" onSubmit={submit} noValidate>
              <DialogHeader><DialogTitle>Add super admin</DialogTitle><DialogDescription>A password is generated and shown once after creating.</DialogDescription></DialogHeader>
              <Field id="sa-user" label="Username" required error={errors.username}>
                <Input id="sa-user" maxLength={50} autoComplete="off" value={form.username} aria-invalid={!!errors.username || undefined} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </Field>
              <Field id="sa-name" label="Full name" error={errors.fullName}>
                <Input id="sa-name" maxLength={100} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </Field>
              <ErrorAlert error={create.error} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="animate-spin" />}Create</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <PasswordDialog open={!!reveal} onClose={() => setReveal(null)} {...(reveal || {})} />
    </div>
  )
}

export default function DevConsole() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Dev Console" description="Feature flags, mill branding and super admin accounts"
        icon={<div className="flex size-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><ShieldCheck className="size-5" /></div>} />
      <Tabs defaultValue="flags" className="gap-5">
        <TabsList>
          <TabsTrigger value="flags"><ToggleRight />Feature Flags</TabsTrigger>
          <TabsTrigger value="logos"><ImageIcon />Mill Logos</TabsTrigger>
          <TabsTrigger value="supers"><ShieldCheck />Super Admins</TabsTrigger>
        </TabsList>
        <TabsContent value="flags"><FlagsPanel /></TabsContent>
        <TabsContent value="logos"><LogosPanel /></TabsContent>
        <TabsContent value="supers"><SuperAdminsPanel /></TabsContent>
      </Tabs>
    </div>
  )
}
