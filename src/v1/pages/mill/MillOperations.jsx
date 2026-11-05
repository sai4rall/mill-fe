import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBatches, createBatch, completeBatch, getPurchases } from '../../../shared/api/mill'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { Plus, CheckCircle } from 'lucide-react'
import { todayISO } from '../../../shared/utils/dates'

export default function MillOperations() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [completeModal, setCompleteModal] = useState(null)
  const [form, setForm] = useState({ batchDate: '', paddyInputQuintals: '', expectedRiceQuintals: '', notes: '', purchaseEntries: [] })
  const [completeForm, setCompleteForm] = useState({ actualRiceQuintals: '', notes: '' })

  const { data: batches = [], isLoading } = useQuery({ queryKey: ['batches'], queryFn: getBatches })
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const availablePurchases = purchases.filter(p => p.weightQuintals > 0)

  const createMutation = useMutation({
    mutationFn: createBatch,
    onSuccess: () => { qc.invalidateQueries(['batches']); qc.invalidateQueries(['stock']); setShowCreate(false) }
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, data }) => completeBatch(id, data),
    onSuccess: () => { qc.invalidateQueries(['batches']); qc.invalidateQueries(['stock']); setCompleteModal(null) }
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mill Operations</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> Start Batch
        </button>
      </div>

      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Date', 'Paddy Input (Qtl)', 'Expected Rice (Qtl)', 'Actual Rice (Qtl)', 'Conversion %', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700 text-sm">{b.batchDate}</td>
                  <td className="px-4 py-3 text-slate-700 text-sm font-mono">{b.paddyInputQuintals}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm font-mono">{b.expectedRiceQuintals || '—'}</td>
                  <td className="px-4 py-3 text-emerald-600 text-sm font-mono font-semibold">{b.actualRiceQuintals || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm font-mono">{b.conversionRate ? `${b.conversionRate}%` : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    {b.status === 'IN_PROGRESS' && (
                      <button onClick={() => { setCompleteModal(b); setCompleteForm({ actualRiceQuintals: '', notes: '' }) }}
                        className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1.5 rounded font-medium transition-colors">
                        <CheckCircle className="w-3 h-3" /> Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <Modal title="Start Mill Batch" onClose={() => setShowCreate(false)}>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, paddyInputQuintals: parseFloat(form.paddyInputQuintals), expectedRiceQuintals: form.expectedRiceQuintals ? parseFloat(form.expectedRiceQuintals) : null }) }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batch Date *</label>
              <input type="date" max={todayISO()} value={form.batchDate} required onChange={e => setForm(f => ({ ...f, batchDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paddy Input (Qtl) *</label>
                <input type="number" step="0.01" value={form.paddyInputQuintals} required onChange={e => setForm(f => ({ ...f, paddyInputQuintals: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Rice (Qtl)</label>
                <input type="number" step="0.01" value={form.expectedRiceQuintals} onChange={e => setForm(f => ({ ...f, expectedRiceQuintals: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={createMutation.isPending}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {createMutation.isPending ? 'Starting...' : 'Start Batch'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {completeModal && (
        <Modal title="Complete Batch" onClose={() => setCompleteModal(null)}>
          <p className="text-slate-500 text-sm mb-4">Paddy input: <strong>{completeModal.paddyInputQuintals} Qtl</strong></p>
          <form onSubmit={(e) => { e.preventDefault(); completeMutation.mutate({ id: completeModal.id, data: { actualRiceQuintals: parseFloat(completeForm.actualRiceQuintals), notes: completeForm.notes } }) }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Actual Rice Output (Qtl) *</label>
              <input type="number" step="0.01" value={completeForm.actualRiceQuintals} required onChange={e => setCompleteForm(f => ({ ...f, actualRiceQuintals: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={completeForm.notes} onChange={e => setCompleteForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setCompleteModal(null)}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={completeMutation.isPending}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {completeMutation.isPending ? 'Completing...' : 'Mark Complete'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
