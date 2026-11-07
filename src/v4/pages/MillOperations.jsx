import { useState } from 'react'
import { Button } from '@heroui/react'
import { CheckCircle2, Factory, Plus } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { completeBatch, createBatch, getBatches } from '../../shared/api/mill'
import { todayISO } from '../../shared/utils/dates'
import { EmptyState, ErrorAlert, Loading, PageHeader, StatusChip } from '../kit/display'
import { DateInput, TextAreaInput, TextInput, enterToNext } from '../kit/fields'
import { Panel, SubmitButton } from '../kit/overlays'
import { cx } from '../lib/format'
import { date, daysAgo, num, qty } from '../lib/numbers'
import { notify } from '../lib/toast'
import { useT } from '../i18n'

const EMPTY = { batchDate: '', paddyInputQuintals: '', expectedRiceQuintals: '', notes: '' }
const opt = (v) => (v == null || v === '' ? '—' : num(v))

function BatchCard({ b, onComplete }) {
  const { t } = useT()
  const rate = Number(b.conversionRate || 0)
  const age = daysAgo(b.batchDate)
  return (
    <article className="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-e1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">#{b.id} · {date(b.batchDate)}</span>
        <StatusChip status={b.status} />
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-field bg-paddy-soft p-2"><dt className="text-xs text-paddy">{t('batches.paddyIn')}</dt><dd className="v4-num font-semibold">{num(b.paddyInputQuintals)}</dd></div>
        <div className="rounded-field bg-surface-secondary p-2"><dt className="text-xs text-muted">{t('batches.expected')}</dt><dd className="v4-num font-semibold">{opt(b.expectedRiceQuintals)}</dd></div>
        <div className="rounded-field bg-rice-soft p-2"><dt className="text-xs text-rice">{t('batches.riceOut')}</dt><dd className="v4-num font-semibold">{opt(b.actualRiceQuintals)}</dd></div>
      </dl>
      <p className="text-xs text-muted">Quintals</p>
      {b.status === 'COMPLETED' ? (
        <div className="grid gap-1">
          <div className="flex justify-between text-xs"><span className="text-muted">{t('batches.conversion')}</span><span className="v4-num font-semibold">{num(rate)}%</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary"><div className="h-full rounded-full bg-rice" style={{ width: `${Math.min(100, rate)}%` }} /></div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className={cx('text-xs', age > 2 ? 'font-semibold text-warn' : 'text-muted')}>{age === 0 ? 'Started today' : `Running ${num(age, 0)} days`}</span>
          <Button size="sm" variant="secondary" onPress={onComplete}><CheckCircle2 className="size-4" />{t('batches.complete')}</Button>
        </div>
      )}
    </article>
  )
}

function Column({ title, count, tone, children }) {
  return (
    <section className="grid content-start gap-3 rounded-card border border-border bg-surface-secondary p-3">
      <div className="flex items-center gap-2 px-1 pt-1"><span className={cx('size-2 rounded-full', tone)} /><h2 className="text-sm font-semibold">{title}</h2><span className="v4-num ml-auto rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">{count}</span></div>
      {children}
    </section>
  )
}

/** Batches: running and completed. Starting and completing a batch open a side sheet (one container rule). */
export default function MillOperations() {
  const { t } = useT()
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [errs, setErrs] = useState({})
  const [completing, setCompleting] = useState(null)
  const [done, setDone] = useState({ actualRiceQuintals: '', notes: '' })
  const [doneErr, setDoneErr] = useState('')
  const { data: batches = [], isLoading } = useQuery({ queryKey: ['batches'], queryFn: getBatches })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['batches'] }); qc.invalidateQueries({ queryKey: ['stock'] }) }

  const create = useMutation({ mutationFn: (d) => createBatch(d), onSuccess: () => { refresh(); setForm(null); notify('Batch started') } })
  const complete = useMutation({ mutationFn: ({ id, data }) => completeBatch(id, data), onSuccess: () => { refresh(); setCompleting(null); notify('Batch completed') } })
  const running = batches.filter(b => b.status === 'IN_PROGRESS')
  const finished = batches.filter(b => b.status !== 'IN_PROGRESS')
  const openStart = () => { create.reset(); setErrs({}); setForm({ ...EMPTY, batchDate: todayISO() }) }

  const start = (e) => {
    e.preventDefault()
    const found = {}
    if (!form.batchDate) found.batchDate = 'Batch date is required'
    if (!(Number(form.paddyInputQuintals) > 0)) found.paddyInputQuintals = 'Enter the paddy going into the mill'
    setErrs(found)
    if (Object.keys(found).length) return
    create.mutate({ ...form, purchaseEntries: [], paddyInputQuintals: parseFloat(form.paddyInputQuintals), expectedRiceQuintals: form.expectedRiceQuintals ? parseFloat(form.expectedRiceQuintals) : null })
  }
  const finish = (e) => {
    e.preventDefault()
    if (!(Number(done.actualRiceQuintals) >= 0) || done.actualRiceQuintals === '') { setDoneErr('Enter the rice output'); return }
    complete.mutate({ id: completing.id, data: { actualRiceQuintals: parseFloat(done.actualRiceQuintals), notes: done.notes } })
  }

  return (
    <>
      <PageHeader title={t('batches.title')} description={t('batches.subtitle')}
        actions={<Button onPress={openStart}><Plus className="size-4" />{t('batches.start')}</Button>} />
      {isLoading ? <Loading /> : batches.length === 0
        ? <EmptyState icon={Factory} title="No batches yet" action={<Button onPress={openStart}><Plus className="size-4" />{t('batches.start')}</Button>}>Start a batch when paddy goes into the mill.</EmptyState>
        : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Column title={t('batches.inProgress')} count={running.length} tone="bg-paddy">
              {running.map(b => <BatchCard key={b.id} b={b} onComplete={() => { complete.reset(); setDoneErr(''); setCompleting(b); setDone({ actualRiceQuintals: '', notes: '' }) }} />)}
              {running.length === 0 && <p className="py-6 text-center text-sm text-muted">Nothing in the mill right now.</p>}
            </Column>
            <Column title={t('batches.completed')} count={finished.length} tone="bg-rice">
              {finished.map(b => <BatchCard key={b.id} b={b} />)}
              {finished.length === 0 && <p className="py-6 text-center text-sm text-muted">Completed batches appear here.</p>}
            </Column>
          </div>
        )}

      <Panel open={!!form} onClose={() => setForm(null)} title={t('batches.start')} description="Paddy going into the mill today." width="sm:w-[28rem]" onSubmit={start}
        footer={<><Button variant="tertiary" onPress={() => setForm(null)}>Cancel</Button><SubmitButton pending={create.isPending}>{t('batches.start')}</SubmitButton></>}>
        {form && (
          <div className="grid gap-4" onKeyDown={enterToNext}>
            <DateInput label="Batch date" required value={form.batchDate} error={errs.batchDate} onChange={v => setForm(f => ({ ...f, batchDate: v }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label={t('batches.paddyIn')} unit="Qtl" required inputMode="decimal" value={form.paddyInputQuintals} error={errs.paddyInputQuintals} onChange={v => setForm(f => ({ ...f, paddyInputQuintals: v }))} />
              <TextInput label={t('batches.expected')} unit="Qtl" inputMode="decimal" value={form.expectedRiceQuintals} onChange={v => setForm(f => ({ ...f, expectedRiceQuintals: v }))} />
            </div>
            <TextAreaInput label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
            <ErrorAlert error={create.error} />
          </div>
        )}
      </Panel>

      <Panel open={!!completing} onClose={() => setCompleting(null)} title={t('batches.complete')} width="sm:w-[28rem]" onSubmit={finish}
        description={completing ? `#${completing.id} · ${date(completing.batchDate)} · ${t('batches.paddyIn')} ${qty(completing.paddyInputQuintals)}` : ''}
        footer={<><Button variant="tertiary" onPress={() => setCompleting(null)}>Cancel</Button><SubmitButton pending={complete.isPending}>Mark complete</SubmitButton></>}>
        {completing && (
          <div className="grid gap-4">
            <TextInput label={t('batches.riceOut')} unit="Qtl" required inputMode="decimal" value={done.actualRiceQuintals} error={doneErr} onChange={v => { setDoneErr(''); setDone(d => ({ ...d, actualRiceQuintals: v })) }}
              hint={Number(done.actualRiceQuintals) > 0 ? `${t('batches.conversion')}: ${num((Number(done.actualRiceQuintals) / Number(completing.paddyInputQuintals)) * 100)}%` : undefined} />
            <TextAreaInput label="Notes" value={done.notes} onChange={v => setDone(d => ({ ...d, notes: v }))} />
            <ErrorAlert error={complete.error} />
          </div>
        )}
      </Panel>
    </>
  )
}
