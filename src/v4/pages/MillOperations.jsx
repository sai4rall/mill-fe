import { useState } from 'react'
import { Button } from '@heroui/react'
import { CheckCircle2, Factory, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { completeBatch, createBatch, getBatches } from '../../shared/api/mill'
import { todayISO } from '../../shared/utils/dates'
import { EmptyState, ErrorAlert, Loading, PageHeader, StatusChip } from '../kit/display'
import { DateInput, TextAreaInput, TextInput } from '../kit/fields'
import { Dialog, SubmitButton } from '../kit/overlays'
import { cx } from '../lib/format'
import { rise } from '../lib/motion'
import { notify } from '../lib/toast'

const EMPTY = { batchDate: '', paddyInputQuintals: '', expectedRiceQuintals: '', notes: '' }

function BatchCard({ b, onComplete }) {
  const rate = Number(b.conversionRate || 0)
  return (
    <motion.article layoutId={`batch-${b.id}`} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between"><span className="text-sm font-semibold">{b.batchDate}</span><StatusChip status={b.status} /></div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-amber-50 p-2"><p className="text-[11px] text-amber-700">Paddy in</p><p className="v4-num font-bold">{b.paddyInputQuintals}</p></div>
        <div className="rounded-xl bg-surface-secondary p-2"><p className="text-[11px] text-muted">Expected</p><p className="v4-num font-bold">{b.expectedRiceQuintals || '—'}</p></div>
        <div className="rounded-xl bg-emerald-50 p-2"><p className="text-[11px] text-emerald-700">Rice out</p><p className="v4-num font-bold">{b.actualRiceQuintals || '—'}</p></div>
      </div>
      {b.status === 'COMPLETED' ? (
        <div className="grid gap-1">
          <div className="flex justify-between text-xs"><span className="text-muted">Conversion</span><span className="v4-num font-semibold">{rate}%</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" initial={{ width: 0 }} animate={{ width: `${Math.min(100, rate)}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        </div>
      ) : <Button size="sm" variant="secondary" onPress={onComplete}><CheckCircle2 className="size-4" />Complete batch</Button>}
    </motion.article>
  )
}

function Column({ title, count, tone, children }) {
  return (
    <motion.section variants={rise} className="grid content-start gap-3 rounded-3xl border border-border bg-surface-secondary/40 p-3">
      <div className="flex items-center gap-2 px-1 pt-1"><span className={cx('size-2 rounded-full', tone)} /><h2 className="text-sm font-bold">{title}</h2><span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">{count}</span></div>
      {children}
    </motion.section>
  )
}

export default function MillOperations() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [dateError, setDateError] = useState('')
  const [completing, setCompleting] = useState(null)
  const [done, setDone] = useState({ actualRiceQuintals: '', notes: '' })
  const { data: batches = [], isLoading } = useQuery({ queryKey: ['batches'], queryFn: getBatches })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['batches'] }); qc.invalidateQueries({ queryKey: ['stock'] }) }

  const create = useMutation({ mutationFn: (d) => createBatch(d), onSuccess: () => { refresh(); setForm(null); notify('Batch started') } })
  const complete = useMutation({ mutationFn: ({ id, data }) => completeBatch(id, data), onSuccess: () => { refresh(); setCompleting(null); notify('Batch completed') } })
  const running = batches.filter(b => b.status === 'IN_PROGRESS')
  const finished = batches.filter(b => b.status !== 'IN_PROGRESS')

  return (
    <>
      <PageHeader title="Mill Operations" description="Paddy-to-rice batches, from the mill floor to finished rice"
        actions={<Button onPress={() => { create.reset(); setDateError(''); setForm({ ...EMPTY, batchDate: todayISO() }) }}><Plus className="size-4" />Start batch</Button>} />
      {isLoading ? <Loading /> : batches.length === 0
        ? <EmptyState icon={Factory} title="No batches yet">Start a batch when paddy goes into the mill.</EmptyState>
        : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Column title="In progress" count={running.length} tone="bg-blue-500">
              <AnimatePresence mode="popLayout">{running.map(b => <BatchCard key={b.id} b={b} onComplete={() => { complete.reset(); setCompleting(b); setDone({ actualRiceQuintals: '', notes: '' }) }} />)}</AnimatePresence>
              {running.length === 0 && <p className="py-6 text-center text-sm text-muted">Nothing in the mill right now.</p>}
            </Column>
            <Column title="Completed" count={finished.length} tone="bg-emerald-500">
              <AnimatePresence mode="popLayout">{finished.map(b => <BatchCard key={b.id} b={b} />)}</AnimatePresence>
              {finished.length === 0 && <p className="py-6 text-center text-sm text-muted">Completed batches appear here.</p>}
            </Column>
          </div>
        )}

      <Dialog open={!!form} onClose={() => setForm(null)} title="Start mill batch" icon={<Factory className="size-5" />}
        onSubmit={(e) => {
          e.preventDefault()
          if (!form.batchDate) { setDateError('Batch date is required'); return }
          create.mutate({ ...form, purchaseEntries: [], paddyInputQuintals: parseFloat(form.paddyInputQuintals), expectedRiceQuintals: form.expectedRiceQuintals ? parseFloat(form.expectedRiceQuintals) : null })
        }}
        footer={<><Button variant="tertiary" onPress={() => setForm(null)}>Cancel</Button><SubmitButton pending={create.isPending}>Start batch</SubmitButton></>}>
        {form && (
          <>
            <DateInput label="Batch date" required value={form.batchDate} error={dateError} onChange={v => { setDateError(''); setForm(f => ({ ...f, batchDate: v })) }} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Paddy input (Qtl)" required type="number" step="0.01" min="0.01" value={form.paddyInputQuintals} onChange={v => setForm(f => ({ ...f, paddyInputQuintals: v }))} />
              <TextInput label="Expected rice (Qtl)" type="number" step="0.01" min="0" value={form.expectedRiceQuintals} onChange={v => setForm(f => ({ ...f, expectedRiceQuintals: v }))} />
            </div>
            <TextAreaInput label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
            <ErrorAlert error={create.error} />
          </>
        )}
      </Dialog>

      <Dialog open={!!completing} onClose={() => setCompleting(null)} title="Complete batch" icon={<CheckCircle2 className="size-5" />} size="sm:max-w-md"
        onSubmit={(e) => { e.preventDefault(); complete.mutate({ id: completing.id, data: { actualRiceQuintals: parseFloat(done.actualRiceQuintals), notes: done.notes } }) }}
        footer={<><Button variant="tertiary" onPress={() => setCompleting(null)}>Cancel</Button><SubmitButton pending={complete.isPending}>Mark complete</SubmitButton></>}>
        {completing && (
          <>
            <p className="text-sm text-muted">Paddy input: <b className="text-foreground">{completing.paddyInputQuintals} Qtl</b></p>
            <TextInput label="Actual rice output (Qtl)" required type="number" step="0.01" min="0" value={done.actualRiceQuintals} onChange={v => setDone(d => ({ ...d, actualRiceQuintals: v }))} />
            <TextAreaInput label="Notes" value={done.notes} onChange={v => setDone(d => ({ ...d, notes: v }))} />
            <ErrorAlert error={complete.error} />
          </>
        )}
      </Dialog>
    </>
  )
}
