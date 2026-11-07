import { SearchField } from '@heroui/react'
import { X } from 'lucide-react'
import { cx } from '../lib/format'
import { daysAgo } from '../lib/numbers'
import { useT } from '../i18n'

/** Pill toggle used for status and period filters. */
function Pill({ active, onPress, children, count }) {
  return (
    <button type="button" onClick={onPress} aria-pressed={active}
      className={cx('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors',
        active ? 'border-accent bg-accent-soft text-accent-soft-foreground' : 'border-border bg-surface text-muted hover:text-foreground')}>
      {children}{count != null && <span className="v4-num text-xs opacity-70">{count}</span>}
    </button>
  )
}

export const PERIODS = [
  { id: 'today', days: 0, label: 'filter.today' },
  { id: 'week', days: 6, label: 'filter.week' },
  { id: 'month', days: 29, label: 'filter.month' },
  { id: 'all', days: null, label: 'filter.all' },
]

/** True when an ISO date falls inside the period ("today", "week" = last 7 days, "month" = last 30, "all"). */
export function inPeriod(iso, periodId, now = new Date()) {
  const p = PERIODS.find(x => x.id === periodId)
  if (!p || p.days == null) return true
  const ago = daysAgo(iso, now)
  return ago >= 0 && ago <= p.days
}

/**
 * Search + status pills + period pills + sort, above a list (design review: lists get real tools).
 * Everything is controlled by the page; the page remembers the view with usePref.
 */
export default function FilterBar({ search, onSearch, searchLabel, statuses, status, onStatus, period, onPeriod, sorts, sort, onSort, onClear, dirty }) {
  const { t } = useT()
  return (
    <div className="grid gap-3 rounded-card border border-border bg-surface p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {onSearch && (
          <SearchField aria-label={searchLabel || t('filter.search')} value={search} onChange={onSearch} className="md:w-72">
            <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder={searchLabel || t('filter.search')} /><SearchField.ClearButton /></SearchField.Group>
          </SearchField>
        )}
        {onPeriod && (
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Period">
            {PERIODS.map(p => <Pill key={p.id} active={period === p.id} onPress={() => onPeriod(p.id)}>{t(p.label)}</Pill>)}
          </div>
        )}
        {sorts && (
          <label className="flex items-center gap-2 text-sm text-muted md:ml-auto">
            {t('filter.sort')}
            <select value={sort} onChange={e => onSort(e.target.value)} className="h-8 rounded-field border border-border bg-surface px-2 text-sm text-foreground">
              {sorts.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        )}
      </div>
      {(statuses || dirty) && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Status">
          {statuses?.map(s => <Pill key={s.id} active={status === s.id} onPress={() => onStatus(s.id)} count={s.count}>{s.label}</Pill>)}
          {dirty && onClear && (
            <button type="button" onClick={onClear} className="ml-auto inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"><X className="size-3.5" />{t('filter.clear')}</button>
          )}
        </div>
      )}
    </div>
  )
}
