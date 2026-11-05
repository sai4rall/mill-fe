import { Card } from '@/v3/ui/card'
import { cn } from '@/v3/lib/utils'
import { qtl } from '../lib/format'

/** Metric tile. `value` is shown in quintals unless `display` is given. `tone` picks the icon colour. */
const TONES = {
  amber: 'bg-amber-50 text-amber-600', blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600', teal: 'bg-teal-50 text-teal-600', cyan: 'bg-cyan-50 text-cyan-600',
  orange: 'bg-orange-50 text-orange-600', rose: 'bg-rose-50 text-rose-600',
}

export default function StatCard({ label, value, display, unit = 'Qtl', icon: Icon, tone = 'emerald', valueClassName }) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-center gap-4">
        {Icon && <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}><Icon className="size-5" /></div>}
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className={cn('v3-num text-xl font-semibold tracking-tight', valueClassName)}>
            {display ?? qtl(value)}
            {display == null && unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
          </p>
        </div>
      </div>
    </Card>
  )
}
