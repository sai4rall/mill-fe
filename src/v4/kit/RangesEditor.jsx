import { useState } from 'react'
import { Button } from '@heroui/react'
import { Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { hasRangeErrors, toPayload, toRows, validateRanges } from '../../shared/utils/moisture'
import { ErrorAlert } from './display'
import { TextInput } from './fields'

/** Editable moisture bands (same rules as the other UIs). `onSave` receives the sorted payload. */
export default function RangesEditor({ initial, onSave, saving, serverError, saveLabel = 'Save ranges' }) {
  const [rows, setRows] = useState(() => toRows(initial).map((r, i) => ({ ...r, _k: i })))
  const [nextKey, setNextKey] = useState(() => toRows(initial).length)
  const [errors, setErrors] = useState({ rows: {}, table: null })
  const [touched, setTouched] = useState(false)
  const update = (next) => { setRows(next); if (touched) setErrors(validateRanges(next)) }
  const set = (i, key, value) => update(rows.map((r, k) => (k === i ? { ...r, [key]: value.trim() } : r)))
  const add = () => { update([...rows, { fromPct: rows[rows.length - 1]?.toPct || '', toPct: '', deductionPct: '', _k: nextKey }]); setNextKey(k => k + 1) }
  const remove = (i) => update(rows.filter((_, k) => k !== i))
  const save = () => {
    setTouched(true)
    const found = validateRanges(rows)
    setErrors(found)
    if (!hasRangeErrors(found)) onSave(toPayload(rows))
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="grid grid-cols-[1fr_1fr_1fr_44px] gap-3 border-b border-border bg-surface-secondary/60 px-4 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase">
          <span>From %</span><span>Below %</span><span>Deduction %</span><span />
        </div>
        <div className="grid gap-1 p-2">
          {rows.length === 0 && <p className="py-8 text-center text-sm text-muted">No ranges — purchases get no deduction.</p>}
          <AnimatePresence initial={false}>
            {rows.map((r, i) => (
              <motion.div key={r._k} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-[1fr_1fr_1fr_44px] items-start gap-3 px-2 py-1.5">
                <TextInput aria-label={`Range ${i + 1} from`} inputMode="decimal" value={r.fromPct} onChange={v => set(i, 'fromPct', v)} />
                <TextInput aria-label={`Range ${i + 1} to`} inputMode="decimal" placeholder="& above" value={r.toPct} onChange={v => set(i, 'toPct', v)} />
                <TextInput aria-label={`Range ${i + 1} deduction`} inputMode="decimal" value={r.deductionPct} onChange={v => set(i, 'deductionPct', v)} error={errors.rows[i]} />
                <Button isIconOnly variant="ghost" className="text-danger" onPress={() => remove(i)} aria-label={`Remove range ${i + 1}`}><Trash2 className="size-4" /></Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      {errors.table && <p className="text-sm text-danger" role="alert">{errors.table}</p>}
      {serverError && <ErrorAlert>{serverError}</ErrorAlert>}
      <div className="flex gap-2">
        <Button variant="secondary" onPress={add} isDisabled={rows.length >= 20}><Plus className="size-4" />Add range</Button>
        <Button onPress={save} isPending={saving}>{saveLabel}</Button>
      </div>
      <p className="text-xs text-muted">A range covers moisture from its first value up to, but not including, its second value. Leave the second value empty for “and above”. Moisture outside every range gets no deduction.</p>
    </div>
  )
}
