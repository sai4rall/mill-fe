import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { getDowntime, createDowntime, updateDowntime, deleteDowntime } from '../../../shared/api/mill'
import { isFutureDate, todayISO } from '../../../shared/utils/dates'
import {
  DOWNTIME_REASONS, MACHINES, SHIFTS, currentShift, downtimePayload, downtimeReasonLabel, duration, minutesBetween, shiftLabel, validateDowntime,
} from '../../../shared/utils/production'
import Modal from '../../components/Modal'

const EMPTY = { downtimeDate: '', shift: '', machine: '', startTime: '', endTime: '', reason: 'BREAKDOWN', notes: '' }
const PAGE_SIZE = 20
const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'
const hhmm = (t) => (t ? String(t).slice(0, 5) : '')

/** Machine stoppages on the mill floor. They feed the production report. */
export default function Downtime() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [deleting, setDeleting] = useState(null)
  const [page, setPage] = useState(0)
  const { data: rows = [], isLoading } = useQuery({ queryKey: ['downtime'], queryFn: getDowntime })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['downtime'] }); qc.invalidateQueries({ queryKey: ['production'] }) }
  const save = useMutation({ mutationFn: ({ id, data }) => (id ? updateDowntime(id, data) : createDowntime(data)), onSuccess: () => { refresh(); setForm(null) } })
  const remove = useMutation({ mutationFn: (id) => deleteDowntime(id), onSuccess: () => { refresh(); setDeleting(null) } })

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const shown = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setErrors(x => ({ ...x, [k]: undefined })) }
  const openNew = () => { save.reset(); setErrors({}); setForm({ ...EMPTY, downtimeDate: todayISO(), shift: currentShift() }) }
  const openEdit = (r) => { save.reset(); setErrors({}); setForm({ id: r.id, downtimeDate: r.downtimeDate, shift: r.shift, machine: r.machine, startTime: hhmm(r.startTime), endTime: hhmm(r.endTime), reason: r.reason, notes: r.notes || '' }) }
  const submit = (e) => {
    e.preventDefault()
    const found = validateDowntime(form, isFutureDate)
    setErrors(found)
    if (!Object.keys(found).length) save.mutate({ id: form.id, data: downtimePayload(form) })
  }
  const Err = ({ k }) => (errors[k] ? <p role="alert" className="text-xs text-red-600 mt-1">{errors[k]}</p> : null)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Machine Downtime</h1>
          <p className="text-sm text-slate-500">Stoppages on the mill floor. They feed the production report and shift comparison.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm"><Plus className="w-4 h-4" /> Record Downtime</button>
      </div>

      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {rows.length === 0 ? (
            <div className="text-center py-16"><Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-400">No downtime recorded</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{['Date', 'Shift', 'Machine', 'From – To', 'Duration', 'Reason', 'Recorded By', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{r.downtimeDate}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{shiftLabel(r.shift)}</td>
                      <td className="px-5 py-3 text-sm font-medium text-slate-800">{r.machine}</td>
                      <td className="px-5 py-3 text-sm font-mono text-slate-600">{hhmm(r.startTime)} – {hhmm(r.endTime)}</td>
                      <td className="px-5 py-3 text-sm font-mono font-semibold">{duration(r.durationMinutes)}</td>
                      <td className="px-5 py-3 text-sm"><span className={r.reason === 'BREAKDOWN' ? 'text-red-700 font-medium' : 'text-slate-700'}>{downtimeReasonLabel(r.reason)}</span>{r.notes && <span className="block text-xs text-slate-400 max-w-64 truncate" title={r.notes}>{r.notes}</span>}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{r.recordedBy || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(r)} aria-label={`Edit ${r.machine} ${hhmm(r.startTime)}`} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeleting(r)} aria-label={`Delete ${r.machine} ${hhmm(r.startTime)}`} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pages > 1 && (
                <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
                  <span>{current * PAGE_SIZE + 1}–{Math.min(rows.length, (current + 1) * PAGE_SIZE)} of {rows.length}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPage(current - 1)} disabled={current === 0} className="border border-slate-300 px-3 py-1 rounded-lg hover:bg-slate-50 disabled:opacity-40">Previous</button>
                    <span>Page {current + 1} of {pages}</span>
                    <button type="button" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} className="border border-slate-300 px-3 py-1 rounded-lg hover:bg-slate-50 disabled:opacity-40">Next</button>
                  </div>
                </nav>
              )}
            </div>
          )}
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'Edit Downtime' : 'Record Downtime'} onClose={() => setForm(null)}>
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dt-date" className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input id="dt-date" type="date" max={todayISO()} value={form.downtimeDate} onChange={e => set('downtimeDate')(e.target.value)} className={inputCls} />
                <Err k="downtimeDate" />
              </div>
              <div>
                <label htmlFor="dt-shift" className="block text-sm font-medium text-slate-700 mb-1">Shift *</label>
                <select id="dt-shift" value={form.shift} onChange={e => set('shift')(e.target.value)} className={inputCls}>
                  <option value="">Select shift</option>
                  {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label} ({s.hours})</option>)}
                </select>
                <Err k="shift" />
              </div>
            </div>
            <div>
              <label htmlFor="dt-machine" className="block text-sm font-medium text-slate-700 mb-1">Machine *</label>
              <input id="dt-machine" list="dt-machines" value={form.machine} maxLength={100} placeholder="e.g. Husker" onChange={e => set('machine')(e.target.value)} className={inputCls} />
              <datalist id="dt-machines">{MACHINES.map(m => <option key={m} value={m} />)}</datalist>
              <Err k="machine" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dt-start" className="block text-sm font-medium text-slate-700 mb-1">Stopped At *</label>
                <input id="dt-start" type="time" value={form.startTime} onChange={e => set('startTime')(e.target.value)} className={inputCls} />
                <Err k="startTime" />
              </div>
              <div>
                <label htmlFor="dt-end" className="block text-sm font-medium text-slate-700 mb-1">Restarted At *</label>
                <input id="dt-end" type="time" value={form.endTime} onChange={e => set('endTime')(e.target.value)} className={inputCls} />
                <Err k="endTime" />
              </div>
            </div>
            {form.startTime && form.endTime && form.startTime !== form.endTime && <p className="text-sm text-slate-500">Duration: <strong>{duration(minutesBetween(form.startTime, form.endTime))}</strong> (an end time before the start means it ran past midnight)</p>}
            <div>
              <label htmlFor="dt-reason" className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
              <select id="dt-reason" value={form.reason} onChange={e => set('reason')(e.target.value)} className={inputCls}>
                {DOWNTIME_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="dt-notes" className="block text-sm font-medium text-slate-700 mb-1">Notes{form.reason === 'OTHER' ? ' *' : ''}</label>
              <textarea id="dt-notes" rows={2} value={form.notes} onChange={e => set('notes')(e.target.value)} className={inputCls} />
              <Err k="notes" />
            </div>
            {save.isError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{save.error?.response?.data?.error || 'Could not save'}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setForm(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={save.isPending} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">{save.isPending ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete this downtime entry?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-600 mb-4">Use this only for entries made by mistake. It cannot be undone.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setDeleting(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => remove.mutate(deleting.id)} disabled={remove.isPending} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">{remove.isPending ? 'Deleting...' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
