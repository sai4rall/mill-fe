import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getProduction } from '../../../shared/api/mill'
import { getMillProduction } from '../../../shared/api/mills'
import { downtimeReasonLabel, duration, shiftLabel } from '../../../shared/utils/production'

const PERIODS = [{ id: 1, label: 'Today' }, { id: 7, label: '7 days' }, { id: 30, label: '30 days' }, { id: 90, label: '90 days' }]
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fmt = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const pct = (v) => (v == null ? '—' : `${fmt(v)}%`)
const has = (r) => r.batches > 0 || r.downtimeMinutes > 0

function Rows({ title, rows, first }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <h2 className="px-5 py-3 font-semibold text-slate-800 border-b border-slate-200">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{[first.header, 'Batches', 'Paddy In (Qtl)', 'Rice Out (Qtl)', 'Recovery', 'Broken · Bran · Husk', 'Unaccounted (Qtl)', 'Downtime'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No production in this period</td></tr>}
            {rows.map(r => (
              <tr key={r.key}>
                <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">{first.cell(r)}</td>
                <td className="px-4 py-3 text-sm font-mono">{r.batches}</td>
                <td className="px-4 py-3 text-sm font-mono">{fmt(r.paddyInQuintals)}</td>
                <td className="px-4 py-3 text-sm font-mono text-emerald-700">{fmt(r.riceQuintals)}</td>
                <td className="px-4 py-3 text-sm font-mono font-semibold">{pct(r.recoveryPct)}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-500">{fmt(r.brokenRiceQuintals)} · {fmt(r.branQuintals)} · {fmt(r.huskQuintals)}</td>
                <td className={`px-4 py-3 text-sm font-mono ${Number(r.unaccountedQuintals) > 0 ? 'text-red-600' : ''}`}>{fmt(r.unaccountedQuintals)}</td>
                <td className="px-4 py-3 text-sm font-mono">{duration(r.downtimeMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Production monitoring: daily output, recovery, losses, downtime and shift comparison. Super admins open it per mill. */
export default function Production() {
  const { id } = useParams()
  const [days, setDays] = useState(30)
  const to = new Date(); const fromD = new Date(); fromD.setDate(fromD.getDate() - (days - 1))
  const [from, toIso] = [iso(fromD), iso(to)]
  const { data: r, isLoading, error } = useQuery({
    queryKey: ['production', id || 'mine', from, toIso],
    queryFn: () => (id ? getMillProduction(id, from, toIso) : getProduction(from, toIso)),
  })
  const t = r?.totals

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Production</h1>
          <p className="text-sm text-slate-500">Daily output, milling recovery, losses, downtime and shift comparison</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Period" className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {PERIODS.map(p => (
              <button key={p.id} type="button" aria-pressed={days === p.id} onClick={() => setDays(p.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${days === p.id ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{p.label}</button>
            ))}
          </div>
          {!id && <Link to="/downtime" className="border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Downtime log</Link>}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{error.response?.data?.error || 'Could not load production'}</p>}
      {isLoading || !r ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              ['Paddy milled', `${fmt(t.paddyInQuintals)} Qtl`, `${t.batches} batches completed${r.batchesInProgress ? ` · ${r.batchesInProgress} running` : ''}`],
              ['Rice produced', `${fmt(t.riceQuintals)} Qtl`, `Recovery ${pct(t.recoveryPct)}`],
              ['Unaccounted loss', `${fmt(t.unaccountedQuintals)} Qtl`, `${pct(t.unaccountedPct)} of paddy${Number(t.shortfallQuintals) > 0 ? ` · ${fmt(t.shortfallQuintals)} Qtl short of expected` : ''}`],
              ['Machine downtime', duration(t.downtimeMinutes), `${r.downtimeByReason.reduce((s, g) => s + g.stoppages, 0)} stoppages`],
            ].map(([label, value, hint]) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{hint}</p>
              </div>
            ))}
          </div>
          <Rows title="Shift comparison" rows={r.shifts.filter(s => s.key !== 'NOT_SET' || has(s))} first={{ header: 'Shift', cell: (x) => shiftLabel(x.key) }} />
          <Rows title="Daily production" rows={[...r.days].filter(has).reverse()} first={{ header: 'Date', cell: (x) => x.key }} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[['Downtime by reason', r.downtimeByReason, downtimeReasonLabel], ['Downtime by machine', r.downtimeByMachine, (k) => k]].map(([title, groups, label]) => (
              <div key={title} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h2 className="font-semibold text-slate-800 mb-2">{title}</h2>
                {groups.length === 0 ? <p className="text-sm text-slate-400 py-3 text-center">No downtime recorded</p> : (
                  <ul className="divide-y divide-slate-100">
                    {groups.map(g => <li key={g.key} className="flex justify-between py-2 text-sm"><span>{label(g.key)}</span><span className="text-slate-500">{g.stoppages} × · <strong className="text-slate-800">{duration(g.minutes)}</strong></span></li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">Recovery = rice out ÷ paddy in for batches completed in the period. Unaccounted loss = paddy in − rice − broken rice − bran − husk (enter by-products when completing a batch).</p>
        </>
      )}
    </div>
  )
}
