import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getProductionComparison } from '../../../shared/api/mills'
import { duration } from '../../../shared/utils/production'
import DataTable from '../../kit/DataTable'
import { ErrorAlert, PageHeader, StatusChip } from '../../kit/display'
import { PeriodSwitch, periodRange } from '../../kit/ProductionReport'
import { cx } from '../../lib/format'
import { num, qty } from '../../lib/numbers'
import { usePref } from '../../lib/prefs'
import { v4 } from '../../lib/paths'

const pct = (v) => (v == null ? '—' : `${num(v)}%`)

/** Super admin: production of every mill of the company side by side; a row opens that mill's full report. */
export default function ProductionComparison() {
  const navigate = useNavigate()
  const [period, setPeriod] = usePref('production.period', 'month')
  const { from, to } = periodRange(period)
  const { data: rows = [], isLoading, error } = useQuery({ queryKey: ['production-compare', from, to], queryFn: () => getProductionComparison(from, to) })
  const ranked = rows.filter(r => r.totals.recoveryPct != null).map(r => Number(r.totals.recoveryPct))
  const top = ranked.length ? Math.max(...ranked) : null
  const low = ranked.length > 1 ? Math.min(...ranked) : null

  const columns = [
    { key: 'millName', header: 'Mill', cell: (r) => <span className="font-semibold">{r.millName}</span>, sortValue: (r) => r.millName.toLowerCase() },
    { key: 'status', header: 'Status', cell: (r) => <StatusChip status={r.status} /> },
    { key: 'batches', header: 'Batches', align: 'right', cell: (r) => <span className="v4-num">{num(r.totals.batches, 0)}</span>, sortValue: (r) => r.totals.batches },
    { key: 'paddy', header: 'Paddy milled', align: 'right', cell: (r) => <span className="v4-num">{qty(r.totals.paddyInQuintals)}</span>, sortValue: (r) => Number(r.totals.paddyInQuintals) },
    { key: 'rice', header: 'Rice produced', align: 'right', cell: (r) => <span className="v4-num">{qty(r.totals.riceQuintals)}</span>, sortValue: (r) => Number(r.totals.riceQuintals) },
    { key: 'recovery', header: 'Recovery', align: 'right', sortValue: (r) => Number(r.totals.recoveryPct ?? -1),
      cell: (r) => <span className={cx('v4-num font-semibold', Number(r.totals.recoveryPct) === top && 'text-ok', Number(r.totals.recoveryPct) === low && 'text-risk')}>{pct(r.totals.recoveryPct)}</span> },
    { key: 'unaccounted', header: 'Unaccounted', align: 'right', cell: (r) => <span className="v4-num">{qty(r.totals.unaccountedQuintals)} <span className="text-xs text-muted">({pct(r.totals.unaccountedPct)})</span></span>, sortValue: (r) => Number(r.totals.unaccountedPct ?? 0) },
    { key: 'downtime', header: 'Downtime', align: 'right', cell: (r) => <span className="v4-num">{duration(r.totals.downtimeMinutes)}</span>, sortValue: (r) => r.totals.downtimeMinutes },
  ]
  return (
    <>
      <PageHeader title="Production across mills" description="Output, milling recovery, losses and downtime for each of your mills. Open a mill for its daily and shift report."
        actions={<PeriodSwitch value={period} onChange={setPeriod} />} />
      <ErrorAlert error={error} />
      <DataTable label="Production by mill" rowKey="millId" rows={rows} columns={columns} loading={isLoading} minWidth={900}
        empty="You have no mills yet." onRowClick={(r) => navigate(v4(`/admin/mills/${r.millId}/production`))}
        phoneRow={(r) => (
          <div className="grid gap-0.5">
            <div className="flex justify-between gap-2"><span className="truncate font-semibold">{r.millName}</span><span className="v4-num font-semibold">{pct(r.totals.recoveryPct)}</span></div>
            <p className="v4-num text-xs text-muted">{qty(r.totals.paddyInQuintals)} in · {qty(r.totals.riceQuintals)} out · {duration(r.totals.downtimeMinutes)} down</p>
          </div>
        )} />
    </>
  )
}
