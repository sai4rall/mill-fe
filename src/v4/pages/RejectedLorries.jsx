import { useMemo, useState } from 'react'
import { Button } from '@heroui/react'
import { Ban, Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRejectedLorry, deleteRejectedLorry, getFarmers, getRejectedLorries, updateRejectedLorry } from '../../shared/api/mill'
import { isFutureDate, todayISO } from '../../shared/utils/dates'
import { partyTypeLabel } from '../../shared/utils/partyTypes'
import { REJECTION_REASONS, reasonLabel, rejectionPayload, validateRejection } from '../../shared/utils/rejection'
import DataTable from '../kit/DataTable'
import { EmptyState, ErrorAlert, PageHeader } from '../kit/display'
import { ComboInput, DateInput, SelectInput, TextAreaInput, TextInput, enterToNext } from '../kit/fields'
import FilterBar, { inPeriod } from '../kit/FilterBar'
import { ConfirmDialog, Panel, SubmitButton } from '../kit/overlays'
import StatTile from '../kit/StatTile'
import { errorMessage } from '../lib/format'
import { day, num, plural, qty } from '../lib/numbers'
import { notify } from '../lib/toast'
import { useT } from '../i18n'

const NONE = 'none'
const EMPTY = { rejectionDate: '', truckNumber: '', farmerId: NONE, approxWeightQuintals: '', moisturePct: '', reason: 'HIGH_MOISTURE', notes: '' }

/**
 * Lorries turned away at the mill (paddy not bought). A record for follow-up and for supplier / agent-wise
 * rejection reports; it never changes stock, purchases or payments.
 */
export default function RejectedLorries() {
  const { t } = useT()
  const qc = useQueryClient()
  const [form, setForm] = useState(null) // null = closed; { id?, ...fields }
  const [errs, setErrs] = useState({})
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('month')
  const [reason, setReason] = useState('all')

  const { data: rows = [], isLoading, error } = useQuery({ queryKey: ['rejected-lorries'], queryFn: getRejectedLorries })
  const { data: farmers = [] } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })
  const done = (msg) => () => { qc.invalidateQueries({ queryKey: ['rejected-lorries'] }); setForm(null); notify(msg) }
  const save = useMutation({
    mutationFn: ({ id, data }) => (id ? updateRejectedLorry(id, data) : createRejectedLorry(data)),
    onSuccess: (_r, { id }) => done(id ? 'Entry updated' : 'Rejected lorry recorded')(),
  })
  const remove = useMutation({
    mutationFn: (id) => deleteRejectedLorry(id),
    onSuccess: () => { setDeleting(null); qc.invalidateQueries({ queryKey: ['rejected-lorries'] }); notify('Entry deleted') },
    onError: (e) => { setDeleting(null); notify(errorMessage(e), 'error') },
  })

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => inPeriod(r.rejectionDate, period)
      && (!q || r.truckNumber?.toLowerCase().includes(q) || r.farmerName?.toLowerCase().includes(q)))
  }, [rows, search, period])
  const shown = reason === 'all' ? scoped : scoped.filter(r => r.reason === reason)
  const weight = shown.reduce((s, r) => s + Number(r.approxWeightQuintals || 0), 0)
  const topReason = REJECTION_REASONS.map(x => ({ ...x, n: scoped.filter(r => r.reason === x.value).length })).sort((a, b) => b.n - a.n)[0]

  const options = [{ value: NONE, label: 'Not registered / unknown' },
    ...farmers.map(f => ({ value: String(f.id), label: `${f.name} · ${partyTypeLabel(f.type)}` }))]
  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: undefined })) }
  const openNew = () => { save.reset(); setErrs({}); setForm({ ...EMPTY, rejectionDate: todayISO() }) }
  const openEdit = (r) => {
    save.reset(); setErrs({})
    setForm({ id: r.id, rejectionDate: r.rejectionDate, truckNumber: r.truckNumber, farmerId: r.farmerId ? String(r.farmerId) : NONE,
      approxWeightQuintals: r.approxWeightQuintals ?? '', moisturePct: r.moisturePct ?? '', reason: r.reason, notes: r.notes || '' })
  }
  const submit = (e) => {
    e.preventDefault()
    const f = { ...form, farmerId: form.farmerId === NONE ? '' : form.farmerId }
    const found = validateRejection(f, isFutureDate)
    setErrs(found)
    if (!Object.keys(found).length) save.mutate({ id: form.id, data: rejectionPayload(f) })
  }

  const actions = (r) => (
    <div className="flex justify-end gap-1">
      <Button isIconOnly size="sm" variant="ghost" onPress={() => openEdit(r)} aria-label={`Edit ${r.truckNumber}`}><Pencil className="size-4" /></Button>
      <Button isIconOnly size="sm" variant="ghost" className="text-danger" onPress={() => setDeleting(r)} aria-label={`Delete ${r.truckNumber}`}><Trash2 className="size-4" /></Button>
    </div>
  )
  const columns = [
    { key: 'rejectionDate', header: 'Date', className: 'whitespace-nowrap', cell: (r) => day(r.rejectionDate), sortValue: (r) => r.rejectionDate },
    { key: 'truckNumber', header: 'Truck', cell: (r) => <span className="font-mono text-sm font-semibold">{r.truckNumber}</span>, sortValue: (r) => r.truckNumber },
    { key: 'farmerName', header: 'From', cell: (r) => (r.farmerName ? <span>{r.farmerName} <span className="text-xs text-muted">{partyTypeLabel(r.farmerType)}</span></span> : <span className="text-muted">Unknown</span>), sortValue: (r) => r.farmerName || '' },
    { key: 'approxWeightQuintals', header: 'Approx. weight', align: 'right', cell: (r) => <span className="v4-num">{r.approxWeightQuintals != null ? qty(r.approxWeightQuintals) : '—'}</span>, sortValue: (r) => Number(r.approxWeightQuintals || 0) },
    { key: 'moisturePct', header: 'Moisture', align: 'right', cell: (r) => <span className="v4-num">{r.moisturePct != null ? `${num(r.moisturePct)}%` : '—'}</span> },
    { key: 'reason', header: 'Reason', cell: (r) => <span><span className="font-medium text-risk">{reasonLabel(r.reason)}</span>{r.notes && <span className="block max-w-64 truncate text-xs text-muted" title={r.notes}>{r.notes}</span>}</span> },
    { key: 'recordedBy', header: 'Recorded by', cell: (r) => <span className="text-sm text-muted">{r.recordedBy || '—'}</span> },
    { key: 'act', header: '', align: 'right', pin: true, cell: actions },
  ]
  const phoneRow = (r) => (
    <div className="flex items-start gap-3">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex justify-between gap-2"><span className="font-mono font-semibold">{r.truckNumber}</span><span className="shrink-0 text-sm font-medium text-risk">{reasonLabel(r.reason)}</span></div>
        <p className="truncate text-xs text-muted">{day(r.rejectionDate)} · {r.farmerName || 'Unknown'}{r.approxWeightQuintals != null ? ` · ${qty(r.approxWeightQuintals)}` : ''}</p>
      </div>
      {actions(r)}
    </div>
  )

  return (
    <>
      <PageHeader title={t('nav.rejected')} description="Paddy lorries turned away at the mill. They do not change stock or payments."
        actions={<Button onPress={openNew}><Plus className="size-4" />Record rejected lorry</Button>} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile className="col-span-2 sm:col-span-1" label="Lorries rejected" value={shown.length} format="count" unit="" icon={Ban} tone="risk" />
        <StatTile label="Approx. paddy turned away" value={weight} icon={Truck} tone="paddy" />
        <StatTile label="Most common reason" display={topReason?.n ? <span className="text-base">{topReason.label}</span> : '—'} hint={topReason?.n ? plural(topReason.n, 'lorry', 'lorries') : undefined} tone="neutral" />
      </div>

      <FilterBar search={search} onSearch={setSearch} searchLabel="Truck or farmer" period={period} onPeriod={setPeriod}
        status={reason} onStatus={setReason}
        statuses={[{ id: 'all', label: t('filter.all'), count: scoped.length }, ...REJECTION_REASONS.map(x => ({ id: x.value, label: x.label, count: scoped.filter(r => r.reason === x.value).length }))]} />

      <ErrorAlert error={error} />
      {!isLoading && rows.length === 0
        ? <EmptyState icon={Ban} title="No rejected lorries" action={<Button onPress={openNew}><Plus className="size-4" />Record rejected lorry</Button>}>Record a lorry here when its paddy is turned away, for example for high moisture or poor quality.</EmptyState>
        : <DataTable key={`${period}|${reason}|${search}`} label="Rejected lorries" rows={shown} columns={columns} loading={isLoading} minWidth={1000} pageSize={20}
            empty="No rejected lorries match these filters." phoneRow={phoneRow} initialSort={{ column: 'rejectionDate', direction: 'descending' }} />}

      <Panel open={!!form} onClose={() => setForm(null)} onSubmit={submit} width="sm:w-[32rem]"
        title={form?.id ? 'Edit rejected lorry' : 'Record rejected lorry'} description="Paddy that was not bought. Nothing is added to stock."
        footer={<><Button variant="tertiary" onPress={() => setForm(null)}>Cancel</Button><SubmitButton pending={save.isPending}>Save</SubmitButton></>}>
        {form && (
          <div className="grid gap-4" onKeyDown={enterToNext}>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateInput label="Date" required value={form.rejectionDate} onChange={set('rejectionDate')} error={errs.rejectionDate} />
              <TextInput label="Truck number" required placeholder="AP07CD1234" inputClassName="font-mono uppercase" maxLength={24}
                value={form.truckNumber} onChange={v => set('truckNumber')(v.toUpperCase())} error={errs.truckNumber} />
            </div>
            <ComboInput label="Farmer / agent / supplier" options={options} value={form.farmerId} onChange={(v) => set('farmerId')(v || NONE)}
              placeholder="Search…" empty="No one found" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Approx. weight" unit="Qtl" inputMode="decimal" value={form.approxWeightQuintals} onChange={set('approxWeightQuintals')} error={errs.approxWeightQuintals} />
              <TextInput label="Moisture" unit="%" inputMode="decimal" value={form.moisturePct} onChange={set('moisturePct')} error={errs.moisturePct} />
            </div>
            <SelectInput label="Reason" options={REJECTION_REASONS} value={form.reason} onChange={(v) => set('reason')(v || 'HIGH_MOISTURE')} />
            <TextAreaInput label={form.reason === 'OTHER' ? 'Notes (required for Other)' : 'Notes'} value={form.notes} onChange={set('notes')} error={errs.notes} />
            <ErrorAlert error={save.error} />
          </div>
        )}
      </Panel>

      <ConfirmDialog open={!!deleting} danger title={`Delete the entry for ${deleting?.truckNumber}?`} confirmLabel="Delete" loading={remove.isPending}
        message="Use this only for entries made by mistake. It cannot be undone." onConfirm={() => remove.mutate(deleting.id)} onClose={() => setDeleting(null)} />
    </>
  )
}
