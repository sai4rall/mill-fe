import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Clock, Gauge, TrendingDown, Wheat } from 'lucide-react'
import { DOWNTIME_REASONS, downtimeReasonLabel, duration, shiftLabel } from '../../shared/utils/production'
import { cx } from '../lib/format'
import { compact, day, num, qty } from '../lib/numbers'
import DataTable from './DataTable'
import { Section } from './display'
import StatTile from './StatTile'

// Production periods: the report covers at most a year.
export const PRODUCTION_PERIODS = [
  { id: 'today', label: 'Today', days: 1 },
  { id: 'week', label: '7 days', days: 7 },
  { id: 'month', label: '30 days', days: 30 },
  { id: 'quarter', label: '90 days', days: 90 },
]
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** { from, to } ISO dates for a period id, ending today. */
export function periodRange(id, now = new Date()) {
  const days = PRODUCTION_PERIODS.find(p => p.id === id)?.days || 30
  const from = new Date(now); from.setDate(from.getDate() - (days - 1))
  return { from: iso(from), to: iso(now) }
}

export function PeriodSwitch({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Period" className="flex gap-1 rounded-field border border-border bg-surface p-0.5">
      {PRODUCTION_PERIODS.map(p => (
        <button key={p.id} type="button" role="radio" aria-checked={value === p.id} onClick={() => onChange(p.id)}
          className={cx('rounded-[5px] px-3 py-1.5 text-sm font-medium', value === p.id ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground')}>{p.label}</button>
      ))}
    </div>
  )
}

const pct = (v) => (v == null ? '—' : `${num(v)}%`)
const has = (r) => r.batches > 0 || r.downtimeMinutes > 0

/** Totals, daily input vs output, shift comparison, losses and downtime for one mill and period. */
export default function ProductionReport({ report }) {
  const t = report.totals
  const days = report.days.filter(has)
  const shifts = report.shifts.filter(s => s.key !== 'NOT_SET' || has(s))
  const best = shifts.filter(s => s.recoveryPct != null).sort((a, b) => Number(b.recoveryPct) - Number(a.recoveryPct))
  const chart = report.days.map(d => ({ label: day(d.key), 'Paddy in': Number(d.paddyInQuintals), 'Rice out': Number(d.riceQuintals) }))

  const rowColumns = (first) => [
    first,
    { key: 'batches', header: 'Batches', align: 'right', cell: (r) => <span className="v4-num">{num(r.batches, 0)}</span> },
    { key: 'paddyIn', header: 'Paddy in', align: 'right', cell: (r) => <span className="v4-num">{qty(r.paddyInQuintals)}</span>, sortValue: (r) => Number(r.paddyInQuintals) },
    { key: 'rice', header: 'Rice out', align: 'right', cell: (r) => <span className="v4-num">{qty(r.riceQuintals)}</span>, sortValue: (r) => Number(r.riceQuintals) },
    { key: 'recovery', header: 'Recovery', align: 'right', cell: (r) => <span className="v4-num font-semibold">{pct(r.recoveryPct)}</span>, sortValue: (r) => Number(r.recoveryPct ?? -1) },
    { key: 'byproducts', header: 'Broken · Bran · Husk', align: 'right', cell: (r) => <span className="v4-num text-sm text-muted">{num(r.brokenRiceQuintals)} · {num(r.branQuintals)} · {num(r.huskQuintals)}</span> },
    { key: 'unaccounted', header: 'Unaccounted', align: 'right', cell: (r) => <span className={cx('v4-num', Number(r.unaccountedQuintals) > 0 && 'text-risk')}>{qty(r.unaccountedQuintals)}</span>, sortValue: (r) => Number(r.unaccountedQuintals) },
    { key: 'downtime', header: 'Downtime', align: 'right', cell: (r) => <span className="v4-num">{duration(r.downtimeMinutes)}</span>, sortValue: (r) => r.downtimeMinutes },
  ]

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Paddy milled" value={t.paddyInQuintals} icon={Wheat} tone="paddy" hint={`${num(t.batches, 0)} batches completed${report.batchesInProgress ? ` · ${num(report.batchesInProgress, 0)} running` : ''}`} />
        <StatTile label="Rice produced" value={t.riceQuintals} icon={Gauge} tone="rice" hint={`Recovery ${pct(t.recoveryPct)}`} />
        <StatTile label="Unaccounted loss" value={t.unaccountedQuintals} icon={TrendingDown} tone="risk"
          hint={`${pct(t.unaccountedPct)} of paddy${Number(t.shortfallQuintals) > 0 ? ` · ${qty(t.shortfallQuintals)} short of expected` : ''}`} />
        <StatTile label="Machine downtime" display={duration(t.downtimeMinutes)} icon={Clock} tone="warn" hint={`${num(report.downtimeByReason.reduce((s, g) => s + g.stoppages, 0), 0)} stoppages`} />
      </div>

      <section className="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-e1 sm:p-5">
        <h2 className="font-semibold">Paddy in vs rice out, per day</h2>
        {chart.some(d => d['Paddy in'] > 0) ? (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={compact} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <Tooltip cursor={{ fill: 'var(--surface-secondary)' }} formatter={(v) => qty(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Paddy in" fill="var(--paddy)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Rice out" fill="var(--rice)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="py-10 text-center text-sm text-muted">No batches completed in this period.</p>}
      </section>

      <div className="grid gap-2">
        <Section>Shift comparison</Section>
        {best.length > 1 && (
          <p className="text-sm text-muted">
            Best recovery: <b className="text-foreground">{shiftLabel(best[0].key)}</b> ({pct(best[0].recoveryPct)}) ·
            lowest: <b className="text-foreground">{shiftLabel(best.at(-1).key)}</b> ({pct(best.at(-1).recoveryPct)})
          </p>
        )}
        <DataTable label="Shift comparison" rowKey="key" rows={shifts} pageSize={10} minWidth={900}
          columns={rowColumns({ key: 'key', header: 'Shift', cell: (r) => <span className="font-semibold">{shiftLabel(r.key)}</span> })}
          phoneRow={(r) => (
            <div className="grid gap-0.5">
              <div className="flex justify-between"><span className="font-semibold">{shiftLabel(r.key)}</span><span className="v4-num font-semibold">{pct(r.recoveryPct)}</span></div>
              <p className="v4-num text-xs text-muted">{qty(r.paddyInQuintals)} in · {qty(r.riceQuintals)} out · {duration(r.downtimeMinutes)} down</p>
            </div>
          )} />
      </div>

      <div className="grid gap-2">
        <Section>Daily production</Section>
        <DataTable label="Daily production" rowKey="key" rows={days} pageSize={15} minWidth={900} empty="No production in this period."
          initialSort={{ column: 'key', direction: 'descending' }}
          columns={rowColumns({ key: 'key', header: 'Date', cell: (r) => day(r.key), sortValue: (r) => r.key })}
          phoneRow={(r) => (
            <div className="grid gap-0.5">
              <div className="flex justify-between"><span className="font-semibold">{day(r.key)}</span><span className="v4-num font-semibold">{pct(r.recoveryPct)}</span></div>
              <p className="v4-num text-xs text-muted">{qty(r.paddyInQuintals)} in · {qty(r.riceQuintals)} out · {qty(r.unaccountedQuintals)} unaccounted</p>
            </div>
          )} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[['Downtime by reason', report.downtimeByReason, downtimeReasonLabel], ['Downtime by machine', report.downtimeByMachine, (k) => k]].map(([title, groups, label]) => (
          <section key={title} className="rounded-card border border-border bg-surface p-4 shadow-e1">
            <h2 className="mb-2 font-semibold">{title}</h2>
            {groups.length === 0 ? <p className="py-4 text-center text-sm text-muted">No downtime recorded.</p> : (
              <ul className="divide-y divide-border">
                {groups.map(g => (
                  <li key={g.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="flex items-center gap-2">{title.endsWith('reason') && g.key === 'BREAKDOWN' && <AlertTriangle className="size-4 text-risk" />}{label(g.key)}</span>
                    <span className="v4-num text-muted">{num(g.stoppages, 0)} × · <b className="text-foreground">{duration(g.minutes)}</b></span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="text-xs text-muted">
        Recovery = rice out ÷ paddy in for batches completed in the period. Unaccounted loss = paddy in − rice − broken rice − bran − husk
        (record by-products when completing a batch, otherwise husk and bran count as unaccounted). Reasons: {DOWNTIME_REASONS.map(r => r.label).join(', ')}.
      </p>
    </div>
  )
}
