import { useState } from 'react'
import { Button } from '@heroui/react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { num } from '../lib/numbers'

/** Splits rows into pages. Give the component a `key` that changes with the filters so it starts again on page 1. */
export function usePaged(rows, pageSize) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pages - 1)
  return { rows: rows.slice(current * pageSize, (current + 1) * pageSize), page: current, pages, total: rows.length, pageSize, setPage }
}

/** "21–40 of 240 · Page 2 of 12" with first / previous / next / last. Hidden when everything fits on one page. */
export function Pager({ page, pages, total, pageSize, setPage, className = '' }) {
  if (pages <= 1) return null
  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  return (
    <nav aria-label="Pagination" className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-muted ${className}`}>
      <span className="v4-num">{num(from, 0)}–{num(to, 0)} of {num(total, 0)}</span>
      <div className="flex items-center gap-1">
        <Button isIconOnly size="sm" variant="ghost" isDisabled={page === 0} onPress={() => setPage(0)} aria-label="First page"><ChevronsLeft className="size-4" /></Button>
        <Button isIconOnly size="sm" variant="ghost" isDisabled={page === 0} onPress={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
        <span className="v4-num px-2" aria-live="polite">Page {num(page + 1, 0)} of {num(pages, 0)}</span>
        <Button isIconOnly size="sm" variant="ghost" isDisabled={page >= pages - 1} onPress={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
        <Button isIconOnly size="sm" variant="ghost" isDisabled={page >= pages - 1} onPress={() => setPage(pages - 1)} aria-label="Last page"><ChevronsRight className="size-4" /></Button>
      </div>
    </nav>
  )
}
