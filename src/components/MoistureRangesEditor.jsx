import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { validateRanges, hasRangeErrors, toPayload, toRows } from '../utils/moisture'

const EMPTY_ROW = { fromPct: '', toPct: '', deductionPct: '' }

/**
 * Editable moisture bands. `initial` is a list of API ranges; `onSave` receives the sorted payload.
 * Leave "To" empty for an open-ended last band.
 */
export default function MoistureRangesEditor({ initial, onSave, saving, serverError, saveLabel = 'Save ranges' }) {
  const [rows, setRows] = useState(() => toRows(initial))
  const [errors, setErrors] = useState({ rows: {}, table: null })
  const [touched, setTouched] = useState(false)

  const update = (i, key, value) => {
    const next = rows.map((r, k) => (k === i ? { ...r, [key]: value } : r))
    setRows(next)
    if (touched) setErrors(validateRanges(next))
  }
  const addRow = () => {
    const last = rows[rows.length - 1]
    setRows([...rows, { ...EMPTY_ROW, fromPct: last?.toPct || '' }])
  }
  const removeRow = (i) => {
    const next = rows.filter((_, k) => k !== i)
    setRows(next)
    if (touched) setErrors(validateRanges(next))
  }
  const save = () => {
    setTouched(true)
    const found = validateRanges(rows)
    setErrors(found)
    if (!hasRangeErrors(found)) onSave(toPayload(rows))
  }

  const cell = 'w-full min-w-[4.5rem] border border-slate-300 rounded-lg px-2 sm:px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400'
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {/* Short headers so all columns fit a phone; the note below the table explains from/to. */}
              {[['From %', 'Moisture from (inclusive)'], ['Below %', 'Up to, not including; empty = and above'],
                ['Deduction %', 'Price deduction'], ['', '']].map(([h, title]) => (
                <th key={h || 'actions'} title={title || undefined}
                  className="text-left px-2 sm:px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">No ranges — purchases get no deduction.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="align-top">
                <td className="px-2 sm:px-4 py-2">
                  <input aria-label={`Range ${i + 1} from`} inputMode="decimal" value={r.fromPct} className={cell}
                    onChange={e => update(i, 'fromPct', e.target.value.trim())} />
                </td>
                <td className="px-2 sm:px-4 py-2">
                  <input aria-label={`Range ${i + 1} to`} inputMode="decimal" value={r.toPct} placeholder="& above" className={cell}
                    onChange={e => update(i, 'toPct', e.target.value.trim())} />
                </td>
                <td className="px-2 sm:px-4 py-2">
                  <input aria-label={`Range ${i + 1} deduction`} inputMode="decimal" value={r.deductionPct} className={cell}
                    onChange={e => update(i, 'deductionPct', e.target.value.trim())} />
                  {errors.rows[i] && <p role="alert" className="text-xs text-red-600 mt-1">{errors.rows[i]}</p>}
                </td>
                <td className="px-2 sm:px-4 py-2">
                  <button type="button" onClick={() => removeRow(i)} aria-label={`Remove range ${i + 1}`}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
      {errors.table && <p role="alert" className="text-sm text-red-600">{errors.table}</p>}
      {serverError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={addRow} disabled={rows.length >= 20}
          className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add range
        </button>
        <button type="button" onClick={save} disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
          {saving ? 'Saving...' : saveLabel}
        </button>
      </div>
      <p className="text-xs text-slate-400">
        A range covers moisture from its first value up to, but not including, its second value. Leave the second value empty for
        "and above". Moisture outside every range gets no deduction.
      </p>
    </div>
  )
}
