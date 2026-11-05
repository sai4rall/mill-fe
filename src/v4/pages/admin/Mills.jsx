import { useState } from 'react'
import { Button } from '@heroui/react'
import { ArrowUpRight, Building2, KeyRound, Loader2, Mail, MapPin, Phone, Plus, Power } from 'lucide-react'
import { motion } from 'motion/react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createMill, getMillStock, getMills, resetMillPassword, toggleMillStatus } from '../../../shared/api/mills'
import { EmptyState, ErrorAlert, Loading, NumberTicker, PageHeader, StatusChip } from '../../kit/display'
import { TextInput } from '../../kit/fields'
import { Dialog, SubmitButton } from '../../kit/overlays'
import PasswordReveal from '../../kit/PasswordReveal'
import { errorMessage } from '../../lib/format'
import { hoverLift, rise } from '../../lib/motion'
import { notify } from '../../lib/toast'
import { v4 } from '../../lib/paths'

const EMPTY = { name: '', location: '', contactPhone: '', contactEmail: '', adminUsername: '', adminFullName: '' }
const FIELDS = [
  ['name', 'Mill name', true], ['location', 'Location'], ['contactPhone', 'Contact phone'], ['contactEmail', 'Contact email'],
  ['adminUsername', 'Admin username', true], ['adminFullName', 'Admin full name'],
]
const QTY = { amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700' }

function Qty({ label, value, tone }) {
  return <div className={`flex-1 rounded-2xl px-2 py-2.5 text-center ${QTY[tone]}`}><p className="text-[11px] font-semibold">{label}</p><p className="font-bold text-foreground"><NumberTicker value={value} decimals={1} /></p><p className="text-[10px] text-muted">Qtl</p></div>
}

export default function Mills() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [reveal, setReveal] = useState(null)
  const { data: mills = [], isLoading } = useQuery({ queryKey: ['mills'], queryFn: getMills })
  const stocks = useQueries({ queries: mills.map(m => ({ queryKey: ['mill-stock', m.id], queryFn: () => getMillStock(m.id), staleTime: 30000 })) })

  const create = useMutation({ mutationFn: (d) => createMill(d), onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['mills'] }); setForm(null); setReveal({ title: 'Mill created', username: r.adminUsername, password: r.generatedPassword, message: r.message }) } })
  const toggle = useMutation({ mutationFn: (id) => toggleMillStatus(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['mills'] }); notify('Mill status updated') }, onError: (e) => notify(errorMessage(e), 'error') })
  const reset = useMutation({
    mutationFn: ({ id }) => resetMillPassword(id),
    onSuccess: (r, { username }) => setReveal({ title: 'Password reset', username, password: r.generatedPassword, message: r.message }),
    onError: (e) => notify(errorMessage(e), 'error'),
  })

  return (
    <>
      <PageHeader title="Mills" description={`${mills.length} rice mills on the platform`}
        actions={<Button onPress={() => { create.reset(); setForm({ ...EMPTY }) }}><Plus className="size-4" />Add mill</Button>} />
      {isLoading ? <Loading /> : mills.length === 0 ? (
        <EmptyState icon={Building2} title="No mills yet">Add the first mill; its admin login is created for you.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mills.map((m, i) => {
            const stock = stocks[i]?.data
            return (
              <motion.article key={m.id} variants={rise} {...hoverLift} className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <button type="button" className="grid gap-4 p-5 text-left" aria-label={`Open stock for ${m.name}`} onClick={() => navigate(v4(`/admin/mills/${m.id}/stock`), { state: { millName: m.name } })}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground"><Building2 className="size-5" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate font-bold">{m.name}</p><StatusChip status={m.status} /></div>
                    <ArrowUpRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <div className="grid gap-1 text-xs text-muted">
                    {m.location && <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{m.location}</span>}
                    {m.contactPhone && <span className="flex items-center gap-1.5"><Phone className="size-3.5" />{m.contactPhone}</span>}
                    {m.contactEmail && <span className="flex items-center gap-1.5"><Mail className="size-3.5" />{m.contactEmail}</span>}
                    {m.adminUsername && <span>Admin: <code className="rounded bg-surface-secondary px-1 font-mono">{m.adminUsername}</code></span>}
                  </div>
                  <div className="flex gap-2">
                    {stocks[i]?.isLoading ? <Loader2 className="mx-auto size-4 animate-spin text-muted" /> : stock
                      ? <><Qty label="Paddy" value={stock.paddyOnHand} tone="amber" /><Qty label="In mill" value={stock.paddyInMill} tone="blue" /><Qty label="Rice" value={stock.riceOnHand} tone="emerald" /></>
                      : <span className="mx-auto text-xs text-muted">No stock data</span>}
                  </div>
                </button>
                <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border bg-surface-secondary/40 p-3">
                  <Button size="sm" variant={m.status === 'ACTIVE' ? 'danger-soft' : 'secondary'} onPress={() => toggle.mutate(m.id)}><Power className="size-3.5" />{m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button>
                  <Button size="sm" variant="secondary" onPress={() => reset.mutate({ id: m.id, username: m.adminUsername })}><KeyRound className="size-3.5" />Reset password</Button>
                </div>
              </motion.article>
            )
          })}
        </div>
      )}

      <Dialog open={!!form} onClose={() => setForm(null)} title="Add mill" description="The mill admin's password is generated and shown once." icon={<Building2 className="size-5" />} size="sm:max-w-xl"
        onSubmit={(e) => { e.preventDefault(); create.mutate(form) }}
        footer={<><Button variant="tertiary" onPress={() => setForm(null)}>Cancel</Button><SubmitButton pending={create.isPending}>Create mill</SubmitButton></>}>
        {form && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(([key, label, req]) => <TextInput key={key} label={label} required={!!req} value={form[key]} onChange={v => setForm(f => ({ ...f, [key]: v }))} />)}
            </div>
            <ErrorAlert error={create.error} />
          </>
        )}
      </Dialog>
      <PasswordReveal open={!!reveal} onClose={() => setReveal(null)} {...(reveal || {})} />
    </>
  )
}
