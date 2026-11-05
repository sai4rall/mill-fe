import { Label } from '@/v3/ui/label'
import { cn } from '@/v3/lib/utils'

/** Label + control + hint/error. Pass the control's id as `id` so the label is linked. */
export default function Field({ id, label, required, error, hint, className, children }) {
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      {label && <Label htmlFor={id}>{label}{required && <span className="text-destructive"> *</span>}</Label>}
      {children}
      {error ? <p id={id ? `${id}-error` : undefined} className="text-xs text-destructive">{error}</p>
        : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
