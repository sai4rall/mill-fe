import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Table } from '@heroui/react'
import { motion } from 'motion/react'
import { cx } from '../lib/format'
import { rise } from '../lib/motion'
import { useIsPhone } from '../lib/useMediaQuery'

/**
 * HeroUI table. columns: [{ key, header, cell?: (row) => node, align?: 'right', className? }].
 * Rows fade in one after another; paginates on the client beyond `pageSize` rows.
 */
export default function DataTable({ rows, columns, label, rowKey = 'id', empty = 'Nothing here yet.', minWidth = 640, pageSize = 10 }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pages - 1)
  const shown = rows.slice(current * pageSize, (current + 1) * pageSize)
  const phone = useIsPhone()
  const pager = pages > 1 && (
    <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-sm text-muted">
      <span>{current * pageSize + 1}–{Math.min(rows.length, (current + 1) * pageSize)} of {rows.length}</span>
      <div className="flex gap-1">
        <Button isIconOnly size="sm" variant="ghost" isDisabled={current === 0} onPress={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
        <Button isIconOnly size="sm" variant="ghost" isDisabled={current >= pages - 1} onPress={() => setPage(current + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
      </div>
    </div>
  )

  // Phones: one card per row — first column as the title, actions (header '') at the bottom, the rest as label/value pairs.
  if (phone) {
    const [title, ...rest] = columns
    const actions = rest.filter(c => !c.header)
    const fields = rest.filter(c => c.header)
    const value = (c, row) => (c.cell ? c.cell(row) : (row[c.key] ?? '—'))
    return (
      <motion.div variants={rise} className="grid gap-3" aria-label={label}>
        {shown.length === 0 && <p className="rounded-3xl border border-border bg-surface py-10 text-center text-sm text-muted">{empty}</p>}
        {shown.map((row, r) => (
          <motion.article key={row[rowKey]} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(r, 8) * 0.04 }}
            className="grid gap-3 rounded-3xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="text-[15px]">{value(title, row)}</div>
            {fields.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {fields.map(c => <div key={c.key} className="min-w-0"><dt className="text-[11px] font-medium text-muted uppercase">{c.header}</dt><dd className="truncate text-sm">{value(c, row)}</dd></div>)}
              </dl>
            )}
            {actions.length > 0 && <div className="flex justify-end gap-2 border-t border-border pt-3">{actions.map(c => <div key={c.key}>{value(c, row)}</div>)}</div>}
          </motion.article>
        ))}
        {pager && <div className="overflow-hidden rounded-2xl border border-border bg-surface">{pager}</div>}
      </motion.div>
    )
  }

  return (
    <motion.div variants={rise} className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={label} style={{ minWidth }}>
            <Table.Header>
              {columns.map((c, i) => <Table.Column key={c.key} isRowHeader={i === 0} className={cx(c.align === 'right' && 'text-right', c.className)}>{c.header}</Table.Column>)}
            </Table.Header>
            <Table.Body renderEmptyState={() => <p className="py-10 text-center text-sm text-muted">{empty}</p>}>
              {shown.map((row, r) => (
                <Table.Row key={row[rowKey]} id={row[rowKey]} className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-300" style={{ animationDelay: `${r * 35}ms` }}>
                  {columns.map(c => <Table.Cell key={c.key} className={cx(c.align === 'right' && 'text-right', c.className)}>{c.cell ? c.cell(row) : (row[c.key] ?? '—')}</Table.Cell>)}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {pager}
    </motion.div>
  )
}
