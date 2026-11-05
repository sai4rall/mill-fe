import { useState } from 'react'
import { CheckCircle2, Factory, Loader2, Plus } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/v3/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v3/ui/dialog'
import { Input } from '@/v3/ui/input'
import { Textarea } from '@/v3/ui/textarea'
import { completeBatch, createBatch, getBatches } from '../../shared/api/mill'
import { todayISO } from '../../shared/utils/dates'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import DateField from '../components/DateField'
import EmptyState from '../components/EmptyState'
import ErrorAlert from '../components/ErrorAlert'
import Field from '../components/Field'
import StatusBadge from '../components/StatusBadge'
import Loading from '../components/Loading'
import { notify } from '../lib/toast'

const EMPTY = { batchDate: '', paddyInputQuintals: '', expectedRiceQuintals: '', notes: '' }

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

  const columns = [
    { key: 'batchDate', header: 'Date', className: 'whitespace-nowrap' },
    { key: 'paddyInputQuintals', header: 'Paddy input', align: 'right', cell: (b) => <span className="v3-num">{b.paddyInputQuintals} Qtl</span> },
    { key: 'expectedRiceQuintals', header: 'Expected rice', align: 'right', cell: (b) => <span className="v3-num text-muted-foreground">{b.expectedRiceQuintals ? `${b.expectedRiceQuintals} Qtl` : '—'}</span> },
    { key: 'actualRiceQuintals', header: 'Actual rice', align: 'right', cell: (b) => <span className="v3-num font-semibold text-emerald-700">{b.actualRiceQuintals ? `${b.actualRiceQuintals} Qtl` : '—'}</span> },
    { key: 'conversionRate', header: 'Conversion', align: 'right', cell: (b) => <span className="v3-num">{b.conversionRate ? `${b.conversionRate}%` : '—'}</span> },
    { key: 'status', header: 'Status', cell: (b) => <StatusBadge status={b.status} /> },
    {
      key: 'act', header: '', align: 'right',
      cell: (b) => b.status === 'IN_PROGRESS' && <Button size="sm" variant="outline" onClick={() => { complete.reset(); setCompleting(b); setDone({ actualRiceQuintals: '', notes: '' }) }}><CheckCircle2 />Complete</Button>,
    },
  ]

  return (
    <div className="grid gap-6">
      <PageHeader title="Mill Operations" description="Paddy-to-rice processing batches"
        actions={<Button onClick={() => { create.reset(); setDateError(''); setForm({ ...EMPTY, batchDate: todayISO() }) }}><Plus />Start batch</Button>} />
      {isLoading ? <Loading /> : batches.length === 0
        ? <EmptyState icon={Factory} title="No batches yet">Start a batch when paddy goes into the mill.</EmptyState>
        : <DataTable rows={batches} columns={columns} minWidth={820} />}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          {form && (
            <form className="grid gap-4" onSubmit={(e) => {
              e.preventDefault()
              if (!form.batchDate) { setDateError('Batch date is required'); return }
              create.mutate({ ...form, purchaseEntries: [], paddyInputQuintals: parseFloat(form.paddyInputQuintals),
                expectedRiceQuintals: form.expectedRiceQuintals ? parseFloat(form.expectedRiceQuintals) : null })
            }}>
              <DialogHeader><DialogTitle>Start mill batch</DialogTitle></DialogHeader>
              <Field id="b-date" label="Batch date" required error={dateError}>
                <DateField id="b-date" value={form.batchDate} invalid={!!dateError} onChange={v => { setDateError(''); setForm(f => ({ ...f, batchDate: v })) }} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="b-paddy" label="Paddy input (Qtl)" required>
                  <Input id="b-paddy" required type="number" step="0.01" min="0.01" value={form.paddyInputQuintals} onChange={e => setForm(f => ({ ...f, paddyInputQuintals: e.target.value }))} />
                </Field>
                <Field id="b-expected" label="Expected rice (Qtl)">
                  <Input id="b-expected" type="number" step="0.01" min="0" value={form.expectedRiceQuintals} onChange={e => setForm(f => ({ ...f, expectedRiceQuintals: e.target.value }))} />
                </Field>
              </div>
              <Field id="b-notes" label="Notes"><Textarea id="b-notes" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field>
              <ErrorAlert error={create.error} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="animate-spin" />}Start batch</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!completing} onOpenChange={(o) => !o && setCompleting(null)}>
        <DialogContent className="sm:max-w-md">
          {completing && (
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); complete.mutate({ id: completing.id, data: { actualRiceQuintals: parseFloat(done.actualRiceQuintals), notes: done.notes } }) }}>
              <DialogHeader><DialogTitle>Complete batch</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">Paddy input: <b className="text-foreground">{completing.paddyInputQuintals} Qtl</b></p>
              <Field id="c-rice" label="Actual rice output (Qtl)" required>
                <Input id="c-rice" required type="number" step="0.01" min="0" value={done.actualRiceQuintals} onChange={e => setDone(d => ({ ...d, actualRiceQuintals: e.target.value }))} />
              </Field>
              <Field id="c-notes" label="Notes"><Textarea id="c-notes" rows={2} value={done.notes} onChange={e => setDone(d => ({ ...d, notes: e.target.value }))} /></Field>
              <ErrorAlert error={complete.error} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setCompleting(null)}>Cancel</Button><Button type="submit" disabled={complete.isPending}>{complete.isPending && <Loader2 className="animate-spin" />}Mark complete</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
