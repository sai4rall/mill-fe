import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cx } from '../lib/format'
import { useIsPhone } from '../lib/useMediaQuery'
import { Figure } from './display'

const TONES = {
  paddy: 'bg-paddy-soft text-paddy', rice: 'bg-rice-soft text-rice', ok: 'bg-ok-soft text-ok',
  risk: 'bg-risk-soft text-risk', warn: 'bg-warn-soft text-warn', neutral: 'bg-surface-secondary text-muted',
}
// Older tone names map onto the semantic set.
const ALIAS = { amber: 'paddy', emerald: 'ok', blue: 'rice', cyan: 'rice', teal: 'ok', violet: 'neutral', orange: 'warn', rose: 'risk' }

/**
 * A metric: label, exact figure (never truncated; compact L/Cr on phones with the exact value in the tooltip),
 * optional unit, icon and change against the previous period. Static: it does not move on hover.
 */
export default function StatTile({ label, value, display, unit = 'Qtl', format = 'number', decimals = 2, icon: Icon, tone = 'neutral',
  delta, hint, className, big, prefix }) {
  const phone = useIsPhone()
  const t = TONES[ALIAS[tone] || tone] || TONES.neutral
  const fmt = prefix === '₹' ? 'money' : format
  return (
    <div className={cx('min-w-0 rounded-card border border-border bg-surface p-4 shadow-e1', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium text-muted">{label}</p>
        {Icon && <div className={cx('flex size-8 shrink-0 items-center justify-center rounded-field', t)}><Icon className="size-4" /></div>}
      </div>
      <p className={cx('mt-2 font-bold tracking-tight break-words', big ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl')}>
        {display ?? <Figure value={value} format={fmt} decimals={fmt === 'count' ? 0 : decimals} compactAbove={phone ? 100000 : undefined} />}
        {display == null && unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}
      </p>
      {(delta != null || hint) && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          {delta != null && Number.isFinite(delta) && (
            <span className={cx('inline-flex items-center gap-0.5 font-semibold', delta >= 0 ? 'text-ok' : 'text-risk')}>
              {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{Math.abs(delta).toFixed(0)}%
            </span>
          )}
          {hint}
        </p>
      )}
    </div>
  )
}
