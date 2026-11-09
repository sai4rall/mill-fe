import { useMemo, useState } from 'react'
import { Button } from '@heroui/react'
import { Clock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createDowntime, deleteDowntime, getDowntime, updateDowntime } from '../../shared/api/mill'
import { isFutureDate, todayISO } from '../../shared/utils/dates'
import {
  DOWNTIME_REASONS, MACHINES, SHIFTS, currentShift, downtimePayload, downtimeReasonLabel, duration, minutesBetween, shiftLabel, validateDowntime,
} from '../../shared/utils/production'
import DataTable from '../kit/DataTable'
import { EmptyState, ErrorAlert, PageHeader } from '../kit/display'
import { DateInput, SelectInput, TextAreaInput, TextInput } from '../kit/fields'
import FilterBar, { inPeriod } from '../kit/FilterBar'
import { ConfirmDialog, Panel, SubmitButton } from '../kit/overlays'
import StatTile from '../kit/StatTile'
import { cx, errorMessage } from '../lib/format'
import { day, num } from '../lib/numbers'
import { notify } from '../lib/toast'

const EMPTY = { downtimeDate: '', shift: '', machine: '', startTime: '', endTime: '', reason: 'BREAKDOWN', notes: '' }
const hhmm = (t) => (t ? String(t).slice(0, 5) : '')

/** Machine stoppages on the mill floor: who/what/when/why, feeding the production report. */
export default function Downtime() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [errs, setErrs] = useState({})
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('month')
  const [reason, setReason] = useState('all')
  const { data: rows = [], isLoading, error } = useQuery({ queryKey: ['downtime'], queryFn: getDowntime })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['downtime'] }); qc.invalidateQueries({ queryKey: ['production'] }) }
  const save = useMutation({
    mutationFn: ({ id, data }) => (id ? updateDowntime(id, data) : createDowntime(data)),
    onSuccess: (_r, { id }) => { refresh(); setForm(null); notify(id ? 'Entry updated' : 'Downtime recorded') },
  })
  const remove = useMutation({
    mutationFn: (id) => deleteDowntime(id),
    onSuccess: () => { refresh(); setDeleting(null); notify('Entry deleted') },
    onError: (e) => { setDeleting(null); notify(errorMessage(e), 'error') },
  })

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => inPeriod(r.downtimeDate, period) && (!q || r.machine.toLowerCase().includes(q)))
  }, [rows, search, period])
  const shown = reason === 'all' ? scoped : scoped.filter(r => r.reason === reason)
  const total = shown.reduce((s, r) => s + r.durationMinutes, 0)
  const byShift = SHIFTS.map(s => ({ ...s, minutes: shown.filter(r => r.shift === s.value).reduce((t, r) => t + r.durationMinutes, 0) }))

  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: undefined })) }
  const openNew = () => { save.reset(); setErrs({}); setForm({ ...EMPTY, downtimeDate: todayISO(), shift: currentShift() }) }
  const openEdit = (r) => {
    save.reset(); setErrs({})
    setForm({ id: r.id, downtimeDate: r.downtimeDate, shift: r.shift, machine: r.machine, startTime: hhmm(r.startTime), endTime: hhmm(r.endTime), reason: r.reason, notes: r.notes || '' })
  }
  const submit = (e) => {
    e.preventDefault()
    const found = validateDowntime(form, isFutureDate)
    setErrs(found)
    if (!Object.keys(found).length) save.mutate({ id: form.id, data: downtimePayload(form) })
  }

  const actions = (r) => (
    <div className="flex justify-end gap-1">
      <Button isIconOnly size="sm" variant="ghost" onPress={() => openEdit(r)} aria-label={`Edit ${r.machine} ${hhmm(r.startTime)}`}><Pencil className="size-4" /></Button>
      <Button isIconOnly size="sm" variant="ghost" className="text-danger" onPress={() => setDeleting(r)} aria-label={`Delete ${r.machine} ${hhmm(r.startTime)}`}><Trash2 className="size-4" /></Button>
    </div>
  )
  const columns = [
    { key: 'downtimeDate', header: 'Date', className: 'whitespace-nowrap', cell: (r) => day(r.downtimeDate), sortValue: (r) => `${r.downtimeDate} ${r.startTime}` },
    { key: 'shift', header: 'Shift', cell: (r) => shiftLabel(r.shift), sortValue: (r) => r.shift },
    { key: 'machine', header: 'Machine', cell: (r) => <span className="font-semibold">{r.machine}</span>, sortValue: (r) => r.machine.toLowerCase() },
    { key: 'time', header: 'From – to', cell: (r) => <span className="v4-num">{hhmm(r.startTime)} – {hhmm(r.endTime)}</span> },
    { key: 'durationMinutes', header: 'Duration', align: 'right', cell: (r) => <span className="v4-num font-semibold">{duration(r.durationMinutes)}</span>, sortValue: (r) => r.durationMinutes },
    { key: 'reason', header: 'Reason', cell: (r) => <span><span className={cx('font-medium', r.reason === 'BREAKDOWN' && 'text-risk')}>{downtimeReasonLabel(r.reason)}</span>{r.notes && <span className="block max-w-64 truncate text-xs text-muted" title={r.notes}>{r.notes}</span>}</span> },
    { key: 'recordedBy', header: 'Recorded by', cell: (r) => <span className="text-sm text-muted">{r.recordedBy || '—'}</span> },
    { key: 'act', header: '', align: 'right', pin: true, cell: actions },
  ]

  return (
    <>
      <PageHeader title="Machine downtime" description="Stoppages on the mill floor. They feed the production report and shift comparison."
        actions={<Button onPress={openNew}><Plus className="size-4" />Record downtime</Button>} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile className="col-span-2 lg:col-span-1" label="Total downtime" display={duration(total)} icon={Clock} tone="warn" hint={`${num(shown.length, 0)} stoppages`} />
        {byShift.map(s => <StatTile key={s.value} label={`${s.label} shift`} display={duration(s.minutes)} hint={s.hours} tone="neutral" />)}
      </div>

      <FilterBar search={search} onSearch={setSearch} searchLabel="Machine" period={period} onPeriod={setPeriod} status={reason} onStatus={setReason}
        statuses={[{ id: 'all', label: 'All', count: scoped.length }, ...DOWNTIME_REASONS.map(r => ({ id: r.value, label: r.label, count: scoped.filter(x => x.reason === r.value).length }))]} />

      <ErrorAlert error={error} />
      {!isLoading && rows.length === 0
        ? <EmptyState icon={Clock} title="No downtime recorded" action={<Button onPress={openNew}><Plus className="size-4" />Record downtime</Button>}>Record each machine stoppage with its time and reason.</EmptyState>
        : <DataTable key={`${period}|${reason}|${search}`} label="Machine downtime" rows={shown} columns={columns} loading={isLoading} minWidth={980} pageSize={20}
            empty="No downtime matches these filters." initialSort={{ column: 'downtimeDate', direction: 'descending' }}
            phoneRow={(r) => (
              <div className="flex items-start gap-3">
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <div className="flex justify-between gap-2"><span className="truncate font-semibold">{r.machine}</span><span className="v4-num shrink-0 font-semibold">{duration(r.durationMinutes)}</span></div>
                  <p className="truncate text-xs text-muted">{day(r.downtimeDate)} · {shiftLabel(r.shift)} · {hhmm(r.startTime)}–{hhmm(r.endTime)} · {downtimeReasonLabel(r.reason)}</p>
                </div>
                {actions(r)}
              </div>
            )} />}

      <Panel open={!!form} onClose={() => setForm(null)} onSubmit={submit} width="sm:w-[32rem]"
        title={form?.id ? 'Edit downtime' : 'Record downtime'} description="A machine stoppage. An end time before the start means it ran past midnight."
        footer={<><Button variant="tertiary" onPress={() => setForm(null)}>Cancel</Button><SubmitButton pending={save.isPending}>Save</SubmitButton></>}>
        {form && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DateInput label="Date" required value={form.downtimeDate} onChange={set('downtimeDate')} error={errs.downtimeDate} />
              <div className="grid gap-1">
                <SelectInput label="Shift" options={SHIFTS.map(s => ({ value: s.value, label: `${s.label} (${s.hours})` }))} value={form.shift} onChange={set('shift')} />
                {errs.shift && <p className="text-xs text-danger" role="alert">{errs.shift}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <TextInput label="Machine" required placeholder="e.g. Husker" maxLength={100} value={form.machine} onChange={set('machine')} error={errs.machine} />
              <div className="flex flex-wrap gap-1.5" aria-label="Common machines">
                {MACHINES.map(m => (
                  <button key={m} type="button" onClick={() => set('machine')(m)}
                    className={cx('rounded-full border px-2.5 py-1 text-xs', form.machine === m ? 'border-accent bg-accent-soft text-accent-soft-foreground' : 'border-border text-muted hover:text-foreground')}>{m}</button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Stopped at" type="time" required value={form.startTime} onChange={set('startTime')} error={errs.startTime} />
              <TextInput label="Restarted at" type="time" required value={form.endTime} onChange={set('endTime')} error={errs.endTime}
                hint={form.startTime && form.endTime && form.startTime !== form.endTime ? `Duration: ${duration(minutesBetween(form.startTime, form.endTime))}` : undefined} />
            </div>
            <SelectInput label="Reason" options={DOWNTIME_REASONS} value={form.reason} onChange={(v) => set('reason')(v || 'BREAKDOWN')} />
            <TextAreaInput label={form.reason === 'OTHER' ? 'Notes (required for Other)' : 'Notes'} value={form.notes} onChange={set('notes')} error={errs.notes} />
            <ErrorAlert error={save.error} />
          </div>
        )}
      </Panel>

      <ConfirmDialog open={!!deleting} danger title="Delete this downtime entry?" confirmLabel="Delete" loading={remove.isPending}
        message="Use this only for entries made by mistake. It cannot be undone." onConfirm={() => remove.mutate(deleting.id)} onClose={() => setDeleting(null)} />
    </>
  )
}
