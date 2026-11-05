import { useEffect, useRef } from 'react'
import { Alert, Avatar, Chip, Spinner } from '@heroui/react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { getFarmerPhoto } from '../../shared/api/mill'
import { useObjectUrl } from '../../shared/utils/useObjectUrl'
import { cx, errorMessage } from '../lib/format'
import { rise } from '../lib/motion'

export function PageHeader({ title, description, actions, icon }) {
  return (
    <motion.div variants={rise} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </motion.div>
  )
}

/** Counts up to `value` when it scrolls into view. */
export function NumberTicker({ value, decimals = 2, prefix = '', className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => `${prefix}${Number(v).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`)
  useEffect(() => {
    if (!inView) return
    const controls = animate(mv, Number(value || 0), { duration: 1.1, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [inView, value, mv])
  return <motion.span ref={ref} className={cx('v4-num', className)}>{text}</motion.span>
}

const STATUS = {
  PENDING: 'warning', PARTIAL: 'accent', PAID: 'success', FULFILLED: 'success', CANCELLED: 'danger',
  IN_PROGRESS: 'accent', COMPLETED: 'success', ACTIVE: 'success', INACTIVE: 'default',
}

export function StatusChip({ status, color, children }) {
  if (!status && !children) return null
  return <Chip size="sm" variant="soft" color={color || STATUS[status] || 'default'}>{children || status.replaceAll('_', ' ')}</Chip>
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

export function Loading({ className = 'py-20' }) {
  return <div className={cx('flex justify-center', className)} role="status" aria-label="Loading"><Spinner color="accent" /></div>
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <motion.div variants={rise} className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
      {Icon && (
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground"><Icon className="size-6" /></motion.div>
      )}
      <p className="font-semibold">{title}</p>
      {children && <p className="max-w-md text-sm text-muted">{children}</p>}
      {action}
    </motion.div>
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

/** Small "label: value" divider-style heading inside forms. */
export function Section({ children }) {
  return <div className="flex items-center gap-3 pt-1"><span className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">{children}</span><span className="h-px flex-1 bg-border" /></div>
}
