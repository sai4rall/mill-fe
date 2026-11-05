import { Badge } from '@/v3/ui/badge'
import { cn } from '@/v3/lib/utils'

const STYLES = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  red: 'border-rose-200 bg-rose-50 text-rose-700',
  gray: 'border-zinc-200 bg-zinc-50 text-zinc-600',
}
const TONE = {
  PENDING: 'amber', PARTIAL: 'blue', PAID: 'green', FULFILLED: 'green', CANCELLED: 'red',
  IN_PROGRESS: 'blue', COMPLETED: 'green', ACTIVE: 'green', INACTIVE: 'gray',
}

export function Tone({ tone = 'gray', className, children }) {
  return <Badge variant="outline" className={cn('rounded-md font-medium', STYLES[tone], className)}>{children}</Badge>
}

export default function StatusBadge({ status }) {
  if (!status) return null
  return <Tone tone={TONE[status] || 'gray'}>{status.replaceAll('_', ' ')}</Tone>
}
