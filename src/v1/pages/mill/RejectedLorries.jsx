import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Ban } from 'lucide-react'
import { getRejectedLorries, createRejectedLorry, updateRejectedLorry, deleteRejectedLorry, getFarmers } from '../../../shared/api/mill'
import { isFutureDate, todayISO } from '../../../shared/utils/dates'
import { partyTypeLabel } from '../../../shared/utils/partyTypes'
import { REJECTION_REASONS, reasonLabel, rejectionPayload, validateRejection } from '../../../shared/utils/rejection'
import Modal from '../../components/Modal'

const EMPTY = { rejectionDate: '', truckNumber: '', farmerId: '', approxWeightQuintals: '', moisturePct: '', reason: 'HIGH_MOISTURE', notes: '' }
const PAGE_SIZE = 20
const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'
const errorText = (e) => e?.response?.data?.error || e?.message || 'Something went wrong'

/** Lorries turned away at the mill. They do not change stock, purchases or payments. */
export default function RejectedLorries() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [deleting, setDeleting] = useState(null)
  const [page, setPage] = useState(0)
  const { data: rows = [], isLoading } = useQuery({ queryKey: ['rejected-lorries'], queryFn: getRejectedLorries })
  const { data: farmers = [] } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })
  const refresh = () => qc.invalidateQueries({ queryKey: ['rejected-lorries'] })
  const save = useMutation({
    mutationFn: ({ id, data }) => (id ? updateRejectedLorry(id, data) : createRejectedLorry(data)),
    onSuccess: () => { refresh(); setForm(null) },
  })
  const remove = useMutation({ mutationFn: (id) => deleteRejectedLorry(id), onSuccess: () => { refresh(); setDeleting(null) } })

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const shown = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
  const set = (k) => (e) => { const v = e.target.value; setForm(f => ({ ...f, [k]: k === 'truckNumber' ? v.toUpperCase() : v })); setErrors(x => ({ ...x, [k]: undefined })) }
  const openNew = () => { save.reset(); setErrors({}); setForm({ ...EMPTY, rejectionDate: todayISO() }) }
  const openEdit = (r) => {
    save.reset(); setErrors({})
    setForm({ id: r.id, rejectionDate: r.rejectionDate, truckNumber: r.truckNumber, farmerId: r.farmerId ? String(r.farmerId) : '',
      approxWeightQuintals: r.approxWeightQuintals ?? '', moisturePct: r.moisturePct ?? '', reason: r.reason, notes: r.notes || '' })
  }
  const submit = (e) => {
    e.preventDefault()
    const found = validateRejection(form, isFutureDate)
    setErrors(found)
    if (!Object.keys(found).length) save.mutate({ id: form.id, data: rejectionPayload(form) })
  }
  const Err = ({ k }) => (errors[k] ? <p role="alert" className="text-xs text-red-600 mt-1">{errors[k]}</p> : null)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-2xl font-bold text-slate-800">Rejected Lorries</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm">
          <Plus className="w-4 h-4" /> Record Rejected Lorry
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">Paddy lorries turned away at the mill. They do not change stock or payments.</p>

      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {rows.length === 0 ? (
            <div className="text-center py-16"><Ban className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-400">No rejected lorries recorded</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{['Date', 'Truck', 'From', 'Approx. Weight', 'Moisture', 'Reason', 'Recorded By', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{r.rejectionDate}</td>
                      <td className="px-5 py-3 text-sm font-mono font-medium text-slate-800">{r.truckNumber}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{r.farmerName ? <>{r.farmerName} <span className="text-xs text-slate-400">{partyTypeLabel(r.farmerType)}</span></> : 'Unknown'}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{r.approxWeightQuintals != null ? `${r.approxWeightQuintals} Qtl` : '—'}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{r.moisturePct != null ? `${Number(r.moisturePct)}%` : '—'}</td>
                      <td className="px-5 py-3 text-sm"><span className="font-medium text-red-700">{reasonLabel(r.reason)}</span>{r.notes && <span className="block text-xs text-slate-400 max-w-64 truncate" title={r.notes}>{r.notes}</span>}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{r.recordedBy || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(r)} aria-label={`Edit ${r.truckNumber}`} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeleting(r)} aria-label={`Delete ${r.truckNumber}`} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
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
        <Modal title={form.id ? 'Edit Rejected Lorry' : 'Record Rejected Lorry'} onClose={() => setForm(null)}>
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rl-date" className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input id="rl-date" type="date" max={todayISO()} value={form.rejectionDate} onChange={set('rejectionDate')} className={inputCls} />
                <Err k="rejectionDate" />
              </div>
              <div>
                <label htmlFor="rl-truck" className="block text-sm font-medium text-slate-700 mb-1">Truck Number *</label>
                <input id="rl-truck" value={form.truckNumber} maxLength={24} placeholder="AP07CD1234" onChange={set('truckNumber')} className={`${inputCls} font-mono`} />
                <Err k="truckNumber" />
              </div>
            </div>
            <div>
              <label htmlFor="rl-farmer" className="block text-sm font-medium text-slate-700 mb-1">Farmer / Agent / Supplier</label>
              <select id="rl-farmer" value={form.farmerId} onChange={set('farmerId')} className={inputCls}>
                <option value="">Not registered / unknown</option>
                {farmers.map(f => <option key={f.id} value={String(f.id)}>{f.name} · {partyTypeLabel(f.type)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rl-weight" className="block text-sm font-medium text-slate-700 mb-1">Approx. Weight (Qtl)</label>
                <input id="rl-weight" type="number" step="0.01" min="0" value={form.approxWeightQuintals} onChange={set('approxWeightQuintals')} className={inputCls} />
                <Err k="approxWeightQuintals" />
              </div>
              <div>
                <label htmlFor="rl-moisture" className="block text-sm font-medium text-slate-700 mb-1">Moisture %</label>
                <input id="rl-moisture" type="number" step="0.01" min="0" max="100" value={form.moisturePct} onChange={set('moisturePct')} className={inputCls} />
                <Err k="moisturePct" />
              </div>
            </div>
            <div>
              <label htmlFor="rl-reason" className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
              <select id="rl-reason" value={form.reason} onChange={set('reason')} className={inputCls}>
                {REJECTION_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="rl-notes" className="block text-sm font-medium text-slate-700 mb-1">Notes{form.reason === 'OTHER' ? ' *' : ''}</label>
              <textarea id="rl-notes" rows={2} value={form.notes} onChange={set('notes')} className={inputCls} />
              <Err k="notes" />
            </div>
            {save.isError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{errorText(save.error)}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setForm(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={save.isPending} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">{save.isPending ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title={`Delete the entry for ${deleting.truckNumber}?`} onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-600 mb-4">Use this only for entries made by mistake. It cannot be undone.</p>
          {remove.isError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mb-3">{errorText(remove.error)}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setDeleting(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => remove.mutate(deleting.id)} disabled={remove.isPending} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">{remove.isPending ? 'Deleting...' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
