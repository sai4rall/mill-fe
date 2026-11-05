import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/v3/ui/button'
import { Card } from '@/v3/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v3/ui/table'
import { cn } from '@/v3/lib/utils'

/**
 * Table in a card. columns: [{ key, header, cell?: (row) => node, align?: 'right', className? }].
 * Paginates on the client once there are more than `pageSize` rows.
 */
export default function DataTable({ rows, columns, rowKey = 'id', empty = 'Nothing here yet.', minWidth = 640, pageSize = 10, footer }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pages - 1)
  const shown = rows.slice(current * pageSize, (current + 1) * pageSize)
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Table style={{ minWidth }}>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            {columns.map(c => (
              <TableHead key={c.key} className={cn('h-11 px-4 text-xs font-medium tracking-wide text-muted-foreground uppercase', c.align === 'right' && 'text-right', c.className)}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.length === 0 && (
            <TableRow className="hover:bg-transparent"><TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">{empty}</TableCell></TableRow>
          )}
          {shown.map(row => (
            <TableRow key={row[rowKey]}>
              {columns.map(c => (
                <TableCell key={c.key} className={cn('px-4 py-3', c.align === 'right' && 'text-right', c.className)}>{c.cell ? c.cell(row) : (row[c.key] ?? '—')}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {footer}
      </Table>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-2.5 text-sm text-muted-foreground">
          <span>{current * pageSize + 1}–{Math.min(rows.length, (current + 1) * pageSize)} of {rows.length}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="size-8" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft /></Button>
            <Button variant="ghost" size="icon" className="size-8" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight /></Button>
          </div>
        </div>
      )}
    </Card>
  )
}
