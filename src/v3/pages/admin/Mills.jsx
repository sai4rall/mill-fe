import { useState } from 'react'
import { Building2, ChevronRight, KeyRound, Loader2, Mail, MapPin, Phone, Plus, Power } from 'lucide-react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/v3/ui/button'
import { Card } from '@/v3/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/v3/ui/dialog'
import { Input } from '@/v3/ui/input'
import { createMill, getMillStock, getMills, resetMillPassword, toggleMillStatus } from '../../../shared/api/mills'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import ErrorAlert from '../../components/ErrorAlert'
import Field from '../../components/Field'
import PasswordDialog from '../../components/PasswordDialog'
import StatusBadge from '../../components/StatusBadge'
import Loading from '../../components/Loading'
import { errorMessage } from '../../lib/format'
import { notify } from '../../lib/toast'
import { v3 } from '../../lib/paths'

const EMPTY = { name: '', location: '', contactPhone: '', contactEmail: '', adminUsername: '', adminFullName: '' }
const FIELDS = [
  ['name', 'Mill name', true], ['location', 'Location'], ['contactPhone', 'Contact phone'], ['contactEmail', 'Contact email'],
  ['adminUsername', 'Admin username', true], ['adminFullName', 'Admin full name'],
]
const QTY = { amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700' }

function Qty({ label, value, tone }) {
  return (
    <div className={`flex-1 rounded-lg px-2 py-2 text-center ${QTY[tone]}`}>
      <p className="text-[11px] font-medium">{label}</p>
      <p className="v3-num font-semibold text-foreground">{Number(value || 0).toFixed(1)}</p>
      <p className="text-[10px] text-muted-foreground">Qtl</p>
    </div>
  )
}

export default function Mills() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [reveal, setReveal] = useState(null)
  const { data: mills = [], isLoading } = useQuery({ queryKey: ['mills'], queryFn: getMills })
  const stocks = useQueries({ queries: mills.map(m => ({ queryKey: ['mill-stock', m.id], queryFn: () => getMillStock(m.id), staleTime: 30000 })) })

  const create = useMutation({
    mutationFn: (d) => createMill(d),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['mills'] }); setForm(null); setReveal({ title: 'Mill created', username: r.adminUsername, password: r.generatedPassword, message: r.message }) },
  })
  const toggle = useMutation({ mutationFn: (id) => toggleMillStatus(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['mills'] }); notify('Mill status updated') }, onError: (e) => notify(errorMessage(e), 'error') })
  const reset = useMutation({
    mutationFn: ({ id }) => resetMillPassword(id),
    onSuccess: (r, { username }) => setReveal({ title: 'Password reset', username, password: r.generatedPassword, message: r.message }),
    onError: (e) => notify(errorMessage(e), 'error'),
  })

  return (
    <div className="grid gap-6">
      <PageHeader title="Mills" description="All rice mills on the platform"
        actions={<Button onClick={() => { create.reset(); setForm({ ...EMPTY }) }}><Plus />Add mill</Button>} />
      {isLoading ? <Loading /> : mills.length === 0 ? (
        <EmptyState icon={Building2} title="No mills yet">Add the first mill; its admin login is created for you.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mills.map((m, i) => {
            const stock = stocks[i]?.data
            return (
              <Card key={m.id} className="gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
                <button type="button" className="grid gap-3 p-5 text-left" aria-label={`Open stock for ${m.name}`}
                  onClick={() => navigate(v3(`/admin/mills/${m.id}/stock`), { state: { millName: m.name } })}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Building2 className="size-5" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold">{m.name}</p><StatusBadge status={m.status} /></div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    {m.location && <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{m.location}</span>}
                    {m.contactPhone && <span className="flex items-center gap-1.5"><Phone className="size-3.5" />{m.contactPhone}</span>}
                    {m.contactEmail && <span className="flex items-center gap-1.5"><Mail className="size-3.5" />{m.contactEmail}</span>}
                    {m.adminUsername && <span>Admin: <code className="rounded bg-muted px-1 font-mono">{m.adminUsername}</code></span>}
                  </div>
                  <div className="flex gap-2">
                    {stocks[i]?.isLoading ? <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" /> : stock ? (
                      <><Qty label="Paddy" value={stock.paddyOnHand} tone="amber" /><Qty label="In mill" value={stock.paddyInMill} tone="blue" /><Qty label="Rice" value={stock.riceOnHand} tone="emerald" /></>
                    ) : <span className="mx-auto text-xs text-muted-foreground">No stock data</span>}
                  </div>
                </button>
                <div className="mt-auto grid grid-cols-2 gap-2 border-t bg-muted/30 p-3">
                  <Button size="sm" variant="outline" className={m.status === 'ACTIVE' ? 'text-destructive hover:text-destructive' : 'text-emerald-700'} onClick={() => toggle.mutate(m.id)}>
                    <Power />{m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reset.mutate({ id: m.id, username: m.adminUsername })}><KeyRound />Reset password</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-xl">
          {form && (
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate(form) }}>
              <DialogHeader><DialogTitle>Add mill</DialogTitle><DialogDescription>The mill admin's password is generated and shown once.</DialogDescription></DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map(([key, label, req]) => (
                  <Field key={key} id={`m-${key}`} label={label} required={!!req}>
                    <Input id={`m-${key}`} required={!!req} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </Field>
                ))}
              </div>
              <ErrorAlert error={create.error} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="animate-spin" />}Create mill</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <PasswordDialog open={!!reveal} onClose={() => setReveal(null)} {...(reveal || {})} />
    </div>
  )
}
