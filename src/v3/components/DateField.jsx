import { useState } from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { Button } from '@/v3/ui/button'
import { Calendar } from '@/v3/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/v3/ui/popover'
import { cn } from '@/v3/lib/utils'
import { todayISO } from '../../shared/utils/dates'

const toDate = (iso) => { if (!iso) return undefined; const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
const pretty = (iso) => toDate(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

/**
 * Date picker for 'YYYY-MM-DD' strings. Dates are picked from a calendar (no free typing),
 * and days after today are disabled unless `allowFuture` is set. `min`/`max` narrow the range further.
 */
export default function DateField({ id, value, onChange, placeholder = 'Pick a date', min, max, allowFuture = false, clearable, invalid, className }) {
  const [open, setOpen] = useState(false)
  const latest = [allowFuture ? null : todayISO(), max].filter(Boolean).sort()[0]
  const disabled = [latest && { after: toDate(latest) }, min && { before: toDate(min) }].filter(Boolean)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('relative', className)}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" aria-invalid={invalid || undefined}
            className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground')}>
            <CalendarIcon className="size-4 opacity-60" />
            {value ? pretty(value) : placeholder}
          </Button>
        </PopoverTrigger>
        {clearable && value && (
          <button type="button" onClick={() => onChange('')} aria-label="Clear date"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"><X className="size-3.5" /></button>
        )}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={toDate(value)} defaultMonth={toDate(value) || toDate(latest)} disabled={disabled}
          endMonth={latest ? toDate(latest) : undefined} startMonth={min ? toDate(min) : undefined} captionLayout="dropdown"
          onSelect={(d) => { if (d) { onChange(todayISO(d)); setOpen(false) } }} />
      </PopoverContent>
    </Popover>
  )
}
