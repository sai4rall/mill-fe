import { useEffect, useRef, useState } from 'react'
import { Alert, Avatar, Chip, Skeleton } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { getFarmerPhoto } from '../../shared/api/mill'
import { useObjectUrl } from '../../shared/utils/useObjectUrl'
import { cx, errorMessage } from '../lib/format'
import { compact, money, num, statusLabel } from '../lib/numbers'
import { useT } from '../i18n'

export function PageHeader({ title, description, actions, icon }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const FORMATS = {
  number: (v, d) => num(v, d),
  count: (v) => num(v, 0),
  money: (v, d) => money(v, d),
}

/**
 * An exact figure, shown at its final value immediately (never counted up from zero). When the value changes after
 * first render it gets a short highlight. `compactAbove` switches to L/Cr notation for long numbers; the exact
 * value stays in the tooltip.
 */
export function Figure({ value, format = 'number', decimals = 2, compactAbove, className }) {
  const text = FORMATS[format](value, decimals)
  const exact = text
  const shown = compactAbove && Math.abs(Number(value || 0)) >= compactAbove
    ? (format === 'money' ? `${Number(value) < 0 ? '−' : ''}₹${compact(Math.abs(Number(value)))}` : compact(value))
    : text
  const first = useRef(true)
  const [changed, setChanged] = useState(false)
  useEffect(() => {
    if (first.current) { first.current = false; return undefined }
    setChanged(true)
    const t = setTimeout(() => setChanged(false), 900)
    return () => clearTimeout(t)
  }, [value])
  return <span className={cx('v4-num', changed && 'v4-changed', className)} title={shown !== exact ? exact : undefined}>{shown}</span>
}

/** Kept for older call sites: renders a Figure. */
export function NumberTicker({ value, decimals = 2, prefix = '', className }) {
  return <Figure value={value} decimals={decimals} format={prefix === '₹' ? 'money' : decimals === 0 ? 'count' : 'number'} className={className} />
}

const STATUS = {
  PENDING: 'warning', PARTIAL: 'accent', PAID: 'success', FULFILLED: 'success', CANCELLED: 'danger',
  IN_PROGRESS: 'accent', COMPLETED: 'success', ACTIVE: 'success', INACTIVE: 'default',
}

/** Status in sentence case with a dot (colour is never the only signal: the label is always there). */
export function StatusChip({ status, color, children }) {
  const { t } = useT()
  if (!status && !children) return null
  const label = children || t(`status.${status}`, { defaultValue: statusLabel(status) })
  return (
    <Chip size="sm" variant="soft" color={color || STATUS[status] || 'default'} className="gap-1.5">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />{label}
    </Chip>
  )
}

export function ErrorAlert({ error, children }) {
  if (!error && !children) return null
  return (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content><Alert.Description>{children || errorMessage(error)}</Alert.Description></Alert.Content>
    </Alert>
  )
}

/** Skeleton rows instead of a spinner, so the layout does not jump when data arrives. */
export function Loading({ rows = 4, className = '' }) {
  return (
    <div className={cx('grid gap-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-12 w-full rounded-card" />)}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
      {Icon && <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground"><Icon className="size-6" /></div>}
      <p className="font-semibold">{title}</p>
      {children && <p className="max-w-md text-sm text-muted">{children}</p>}
      {action}
    </div>
  )
}

/** Farmer photo (fetched with auth as a blob) or initials. */
export function FarmerAvatar({ farmer, className = 'size-9' }) {
  const { data: blob } = useQuery({
    queryKey: ['farmer-photo', farmer.id, farmer.photoUpdatedAt],
    queryFn: () => getFarmerPhoto(farmer.id, farmer.photoUpdatedAt),
    enabled: !!farmer.photoUpdatedAt, staleTime: Infinity,
  })
  const url = useObjectUrl(blob)
  const initials = farmer.name?.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <Avatar className={cx('shrink-0', className)}>
      {url && <Avatar.Image src={url} alt={farmer.name} className="object-cover" />}
      <Avatar.Fallback className="bg-accent-soft text-xs font-semibold text-accent-soft-foreground">{initials || '?'}</Avatar.Fallback>
    </Avatar>
  )
}

/** Small heading that separates groups of fields inside a form. */
export function Section({ children }) {
  return <div className="flex items-center gap-3 pt-1"><span className="text-xs font-semibold tracking-wide text-muted uppercase">{children}</span><span className="h-px flex-1 bg-border" /></div>
}
