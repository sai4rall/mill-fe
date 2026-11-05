import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/v3/ui/button'
import { Card } from '@/v3/ui/card'
import { Input } from '@/v3/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v3/ui/table'
import { hasRangeErrors, toPayload, toRows, validateRanges } from '../../shared/utils/moisture'
import ErrorAlert from './ErrorAlert'

/** Editable moisture bands (same rules as the other UIs). `onSave` receives the sorted payload. */
export default function RangesEditor({ initial, onSave, saving, serverError, saveLabel = 'Save ranges' }) {
  const [rows, setRows] = useState(() => toRows(initial))
  const [errors, setErrors] = useState({ rows: {}, table: null })
  const [touched, setTouched] = useState(false)
  const update = (next) => { setRows(next); if (touched) setErrors(validateRanges(next)) }
  const set = (i, key, value) => update(rows.map((r, k) => (k === i ? { ...r, [key]: value } : r)))
  const add = () => update([...rows, { fromPct: rows[rows.length - 1]?.toPct || '', toPct: '', deductionPct: '' }])
  const remove = (i) => update(rows.filter((_, k) => k !== i))
  const save = () => {
    setTouched(true)
    const found = validateRanges(rows)
    setErrors(found)
    if (!hasRangeErrors(found)) onSave(toPayload(rows))
  }
  const cell = (i, key, label, extra) => (
    <Input value={rows[i][key]} onChange={e => set(i, key, e.target.value.trim())} inputMode="decimal" aria-label={`Range ${i + 1} ${label}`} className="min-w-20" {...extra} />
  )

  return (
    <div className="grid gap-4">
      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader className="bg-muted/50"><TableRow>
            <TableHead className="px-4" title="Moisture from (inclusive)">From %</TableHead>
            <TableHead title="Up to, not including; empty = and above">Below %</TableHead>
            <TableHead title="Price deduction">Deduction %</TableHead>
            <TableHead className="w-14" />
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No ranges — purchases get no deduction.</TableCell></TableRow>}
            {rows.map((r, i) => (
              <TableRow key={i} className="align-top">
                <TableCell className="px-4 py-3">{cell(i, 'fromPct', 'from')}</TableCell>
                <TableCell className="py-3">{cell(i, 'toPct', 'to', { placeholder: '& above' })}</TableCell>
                <TableCell className="py-3">
                  {cell(i, 'deductionPct', 'deduction', { 'aria-invalid': !!errors.rows[i] || undefined })}
                  {errors.rows[i] && <p className="mt-1 text-xs whitespace-normal text-destructive">{errors.rows[i]}</p>}
                </TableCell>
                <TableCell className="py-3"><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => remove(i)} aria-label={`Remove range ${i + 1}`}><Trash2 /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {errors.table && <p className="text-sm text-destructive" role="alert">{errors.table}</p>}
      {serverError && <ErrorAlert>{serverError}</ErrorAlert>}
      <div className="flex gap-2">
        <Button variant="outline" onClick={add} disabled={rows.length >= 20}><Plus />Add range</Button>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="animate-spin" />}{saveLabel}</Button>
      </div>
      <p className="text-xs text-muted-foreground">A range covers moisture from its first value up to, but not including, its second value. Leave the second value empty for “and above”. Moisture outside every range gets no deduction.</p>
    </div>
  )
}
