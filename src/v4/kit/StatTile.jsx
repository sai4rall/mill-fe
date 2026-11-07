import { motion } from 'motion/react'
import { cx } from '../lib/format'
import { hoverLift, rise } from '../lib/motion'
import { NumberTicker } from './display'

const TONES = {
  amber: 'from-amber-400/20 text-amber-600', blue: 'from-blue-400/20 text-blue-600', emerald: 'from-emerald-400/25 text-emerald-600',
  violet: 'from-violet-400/20 text-violet-600', teal: 'from-teal-400/20 text-teal-600', cyan: 'from-cyan-400/20 text-cyan-600',
  orange: 'from-orange-400/20 text-orange-600', rose: 'from-rose-400/20 text-rose-600',
}

/** Bento tile: animated number (or `display` text), icon with a soft tinted glow, lifts on hover. */
export default function StatTile({ label, value, display, unit = 'Qtl', icon: Icon, tone = 'emerald', decimals = 2, prefix, className, big }) {
  return (
    <motion.div variants={rise} {...hoverLift}
      className={cx('relative min-w-0 overflow-hidden rounded-3xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5', className)}>
      <div className={cx('pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-gradient-to-br to-transparent blur-2xl', TONES[tone])} />
      <div className="relative flex h-full flex-col justify-between gap-4">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-xs font-medium text-muted sm:text-sm">{label}</p>
          {Icon && <div className={cx('flex size-9 items-center justify-center rounded-xl bg-surface-secondary', TONES[tone].split(' ')[1])}><Icon className="size-[18px]" /></div>}
        </div>
        <p className={cx('truncate font-bold tracking-tight', big ? 'text-2xl sm:text-4xl' : 'text-lg sm:text-2xl')}>
          {display ?? <NumberTicker value={value} decimals={decimals} prefix={prefix} />}
          {display == null && unit && <span className="ml-1.5 text-sm font-medium text-muted">{unit}</span>}
        </p>
      </div>
    </motion.div>
  )
}
