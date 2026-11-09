import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getProductionComparison } from '../../../shared/api/mills'
import { duration } from '../../../shared/utils/production'

const PERIODS = [{ id: 1, label: 'Today' }, { id: 7, label: '7 days' }, { id: 30, label: '30 days' }, { id: 90, label: '90 days' }]
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fmt = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

/** Super admin: production of each of the company's mills side by side. */
export default function ProductionComparison() {
  const navigate = useNavigate()
  const [days, setDays] = useState(30)
  const fromD = new Date(); fromD.setDate(fromD.getDate() - (days - 1))
  const from = iso(fromD), to = iso(new Date())
  const { data: rows = [], isLoading } = useQuery({ queryKey: ['production-compare', from, to], queryFn: () => getProductionComparison(from, to) })
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Production Across Mills</h1>
          <p className="text-sm text-slate-500">Output, recovery, losses and downtime for each of your mills. Click a mill for its daily and shift report.</p>
        </div>
        <div role="group" aria-label="Period" className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {PERIODS.map(p => (
            <button key={p.id} type="button" aria-pressed={days === p.id} onClick={() => setDays(p.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${days === p.id ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{p.label}</button>
          ))}
        </div>
      </div>
      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Mill', 'Batches', 'Paddy Milled (Qtl)', 'Rice (Qtl)', 'Recovery', 'Unaccounted (Qtl)', 'Downtime'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">You have no mills yet</td></tr>}
              {rows.map(r => (
                <tr key={r.millId} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/admin/mills/${r.millId}/production`)}>
                  <td className="px-5 py-3 text-sm font-medium text-emerald-700">{r.millName}{r.status === 'INACTIVE' && <span className="ml-1 text-xs text-amber-700">(inactive)</span>}</td>
                  <td className="px-5 py-3 text-sm font-mono">{r.totals.batches}</td>
                  <td className="px-5 py-3 text-sm font-mono">{fmt(r.totals.paddyInQuintals)}</td>
                  <td className="px-5 py-3 text-sm font-mono">{fmt(r.totals.riceQuintals)}</td>
                  <td className="px-5 py-3 text-sm font-mono font-semibold">{r.totals.recoveryPct == null ? '—' : `${fmt(r.totals.recoveryPct)}%`}</td>
                  <td className="px-5 py-3 text-sm font-mono">{fmt(r.totals.unaccountedQuintals)}</td>
                  <td className="px-5 py-3 text-sm font-mono">{duration(r.totals.downtimeMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
