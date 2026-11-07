import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Table } from '@heroui/react'
import { cx } from '../lib/format'
import { useIsPhone } from '../lib/useMediaQuery'
import { Loading } from './display'
import { Pager, usePaged } from './Pager'

/**
 * Dense, quiet table (design review: lists get borders and dividers, not card chrome).
 * columns: [{ key, header, cell?: (row) => node, align?: 'right', className?, sortValue?: (row) => comparable, pin?: true }].
 * `pin` keeps the column visible at the right edge while a wide table scrolls sideways (for row actions such as Pay).
 * A column with sortValue is sortable. onRowClick opens a record. On phones each row renders `phoneRow(row)` (two
 * lines chosen per page) or, without it, the first column plus label/value pairs.
 */
export default function DataTable({ rows, columns, label, rowKey = 'id', empty = 'Nothing here yet.', minWidth = 640, pageSize = 15,
  onRowClick, phoneRow, loading, initialSort }) {
  const [sort, setSort] = useState(initialSort || null) // { column, direction: 'ascending' | 'descending' }
  const phone = useIsPhone()

  const sorted = useMemo(() => {
    const col = sort && columns.find(c => c.key === sort.column)
    if (!col?.sortValue) return rows
    const dir = sort.direction === 'descending' ? -1 : 1
    return [...rows].sort((a, b) => {
      const x = col.sortValue(a), y = col.sortValue(b)
      return (x > y ? 1 : x < y ? -1 : 0) * dir
    })
  }, [rows, sort, columns])

  const paged = usePaged(sorted, pageSize)
  const shown = paged.rows
  const pager = <Pager {...paged} className="border-t border-border" />

  if (loading) return <Loading rows={5} />

  if (phone) {
    const [title, ...rest] = columns
    const fields = rest.filter(c => c.header)
    const value = (c, row) => (c.cell ? c.cell(row) : (row[c.key] ?? '—'))
    return (
      <div className="overflow-hidden rounded-card border border-border bg-surface" aria-label={label}>
        {shown.length === 0 && <p className="py-10 text-center text-sm text-muted">{empty}</p>}
        <ul className="divide-y divide-border">
          {shown.map(row => (
            <li key={row[rowKey]}>
              {phoneRow ? (
                <div role={onRowClick ? 'button' : undefined} tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row) } : undefined}
                  className={cx('px-4 py-3', onRowClick && 'cursor-pointer active:bg-surface-secondary')}>{phoneRow(row)}</div>
              ) : (
                <article className="grid gap-2 px-4 py-3">
                  <div className="text-base">{value(title, row)}</div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {fields.map(c => <div key={c.key} className="min-w-0"><dt className="text-xs text-muted">{c.header}</dt><dd className="text-sm break-words">{value(c, row)}</dd></div>)}
                  </dl>
                  {rest.filter(c => !c.header).map(c => <div key={c.key} className="flex justify-end">{value(c, row)}</div>)}
                </article>
              )}
            </li>
          ))}
        </ul>
        {pager}
      </div>
    )
  }

  const PIN = 'sticky right-0 z-[1] border-l border-border bg-surface'
  const onSort = (key) => setSort(s => (s?.column === key && s.direction === 'ascending' ? { column: key, direction: 'descending' } : { column: key, direction: 'ascending' }))

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={label} style={{ minWidth }}
            onRowAction={onRowClick ? (key) => { const r = rows.find(x => String(x[rowKey]) === String(key)); if (r) onRowClick(r) } : undefined}>
            <Table.Header>
              {columns.map((c, i) => (
                <Table.Column key={c.key} isRowHeader={i === 0} className={cx(c.align === 'right' && 'text-right', c.pin && PIN, c.className)}>
                  {c.sortValue ? (
                    <button type="button" onClick={() => onSort(c.key)} className={cx('inline-flex items-center gap-1 hover:text-foreground', c.align === 'right' && 'flex-row-reverse')}
                      aria-label={`Sort by ${c.header}`}>
                      {c.header}
                      {sort?.column === c.key && (sort.direction === 'ascending' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </button>
                  ) : c.header}
                </Table.Column>
              ))}
            </Table.Header>
            <Table.Body renderEmptyState={() => <p className="py-10 text-center text-sm text-muted">{empty}</p>}>
              {shown.map(row => (
                <Table.Row key={row[rowKey]} id={row[rowKey]} className={onRowClick ? 'cursor-pointer' : undefined}>
                  {columns.map(c => <Table.Cell key={c.key} className={cx(c.align === 'right' && 'text-right', c.pin && PIN, c.className)}>{c.cell ? c.cell(row) : (row[c.key] ?? '—')}</Table.Cell>)}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {pager}
    </div>
  )
}
