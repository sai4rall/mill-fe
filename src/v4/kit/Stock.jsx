import { BarChart3, Factory, Package2, TrendingDown, TrendingUp, Wheat } from 'lucide-react'
import { motion } from 'motion/react'
import { cx, ledgerRows } from '../lib/format'
import { num } from '../lib/numbers'
import { rise } from '../lib/motion'
import StatTile from './StatTile'

export const STOCK_TILES = [
  { key: 'paddyOnHand', label: 'Paddy on Hand', icon: Wheat, tone: 'amber' },
  { key: 'paddyInMill', label: 'Paddy in Mill', icon: Factory, tone: 'blue' },
  { key: 'riceOnHand', label: 'Rice on Hand', icon: Package2, tone: 'emerald' },
  { key: 'totalPaddyPurchased', label: 'Total Paddy Purchased', icon: TrendingUp, tone: 'violet' },
  { key: 'totalRiceProduced', label: 'Total Rice Produced', icon: BarChart3, tone: 'teal' },
  { key: 'totalRiceExported', label: 'Total Rice Exported', icon: TrendingDown, tone: 'cyan' },
]

export function StockTiles({ stock }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {STOCK_TILES.map(t => <StatTile key={t.key} label={t.label} value={stock?.[t.key]} icon={t.icon} tone={t.tone} />)}
    </div>
  )
}

/** Ledger as a vertical list of rows (keeps working on phones without sideways scrolling). */
export function StockLedger({ stock, note }) {
  return (
    <motion.div variants={rise} className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="font-bold">Stock ledger</h3>
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
      <ul className="divide-y divide-border">
        {ledgerRows(stock).map(r => (
          <li key={r.label} className={cx('flex items-center justify-between gap-4 px-5 py-3.5', r.bold && 'bg-accent-soft/50')}>
            <div className="min-w-0"><p className={cx('text-sm', r.bold ? 'font-bold' : 'font-medium')}>{r.label}</p><p className="text-xs text-muted">{r.desc}</p></div>
            <span className={cx('v4-num shrink-0 text-right', r.bold ? 'text-lg font-bold' : 'font-semibold')}>{num(r.value)} <span className="text-xs font-medium text-muted">Qtl</span></span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
