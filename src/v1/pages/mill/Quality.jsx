import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, FlaskConical, Award, FileDown } from 'lucide-react'
import {
  getQualityTests, getQualityStandards, getBatchQuality, getBatches, getBranding,
  createQualityTest, updateQualityTest, deleteQualityTest, issueQualityCertificate,
} from '../../../shared/api/mill'
import { isFutureDate, todayISO } from '../../../shared/utils/dates'
import {
  EMPTY_TEST, GRADES, PARAMETERS, PRODUCTS, gradeLabel, limitText, paramOk, previewResult, productLabel, qualitySummary, qualityTestPayload,
  sampleSource, testToForm, validateQualityTest, verdictLabel,
} from '../../../shared/utils/quality'
import { downloadQualityCertificate } from '../../../shared/utils/qualityCertificate'
import { shiftLabel } from '../../../shared/utils/production'
import Modal from '../../components/Modal'

const PAGE_SIZE = 20
const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'
const pct = (v) => (v == null ? '—' : `${Number(v).toFixed(2)}%`)
const errText = (e) => e?.response?.data?.error || 'Something went wrong'

// A+/A green, B+/B blue, C amber (lowest passing grade), failed red.
const GRADE_CLS = { A_PLUS: 'bg-emerald-100 text-emerald-700', A: 'bg-emerald-100 text-emerald-700', B_PLUS: 'bg-sky-100 text-sky-700', B: 'bg-sky-100 text-sky-700', C: 'bg-amber-100 text-amber-800' }

function ResultBadge({ result, grade }) {
  const cls = result === 'FAIL' ? 'bg-red-100 text-red-700' : result === 'PASS' ? GRADE_CLS[grade] || 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cls}`}>{verdictLabel(result, grade)}</span>
}

/** Quality control laboratory: lab tests graded A+ … C against the company standard, failures flagged, batch history and certificates. */
export default function Quality() {
  const qc = useQueryClient()
  const [view, setView] = useState('tests')
  const [filter, setFilter] = useState('all')
  const [batchFilter, setBatchFilter] = useState(null)
  const [page, setPage] = useState(0)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [deleting, setDeleting] = useState(null)
  const [certifying, setCertifying] = useState(null)
  const [actionError, setActionError] = useState('')

  const { data: rows = [], isLoading } = useQuery({ queryKey: ['quality-tests'], queryFn: () => getQualityTests() })
  const { data: standards = [] } = useQuery({ queryKey: ['quality-standards'], queryFn: getQualityStandards })
  const { data: history = [] } = useQuery({ queryKey: ['quality-batches'], queryFn: getBatchQuality, enabled: view === 'batches' })
  const { data: batches = [] } = useQuery({ queryKey: ['batches'], queryFn: getBatches, enabled: !!form })
  const { data: branding } = useQuery({ queryKey: ['branding'], queryFn: getBranding, staleTime: 5 * 60_000 })
  const millName = branding?.millName || 'Mill'

  const refresh = () => ['quality-tests', 'quality-batches'].forEach(k => qc.invalidateQueries({ queryKey: [k] }))
  const save = useMutation({ mutationFn: ({ id, data }) => (id ? updateQualityTest(id, data) : createQualityTest(data)), onSuccess: () => { refresh(); setForm(null) } })
  const remove = useMutation({
    mutationFn: (id) => deleteQualityTest(id),
    onSuccess: () => { refresh(); setDeleting(null) },
    onError: (e) => { setDeleting(null); setActionError(errText(e)) },
  })
  const certify = useMutation({
    mutationFn: (id) => issueQualityCertificate(id),
    onSuccess: (t) => { refresh(); setCertifying(null); downloadQualityCertificate(t, millName) },
    onError: (e) => { setCertifying(null); setActionError(errText(e)) },
  })

  const scoped = useMemo(() => (batchFilter ? rows.filter(r => r.batchId === batchFilter) : rows), [rows, batchFilter])
  const filtered = filter === 'all' ? scoped : filter === 'FAIL' ? scoped.filter(r => r.result === 'FAIL') : scoped.filter(r => r.result === 'PASS' && r.grade === filter)
  const sum = qualitySummary(scoped)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const shown = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
  const standardFor = (product) => standards.find(s => s.product === product)
  const preview = form ? previewResult(form, standardFor(form.product)) : null

  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setErrors(x => ({ ...x, [k]: undefined })) }
  const openNew = (preset = {}) => { save.reset(); setErrors({}); setForm({ ...EMPTY_TEST, testDate: todayISO(), ...preset }) }
  const openEdit = (r) => { save.reset(); setErrors({}); setForm(testToForm(r)) }
  const submit = (e) => {
    e.preventDefault()
    const found = validateQualityTest(form, isFutureDate)
    setErrors(found)
    if (!Object.keys(found).length) save.mutate({ id: form.id, data: qualityTestPayload(form) })
  }
  const Err = ({ k }) => (errors[k] ? <p role="alert" className="text-xs text-red-600 mt-1">{errors[k]}</p> : null)
  const tab = (id, label) => (
    <button type="button" onClick={() => setView(id)} aria-pressed={view === id}
      className={`px-4 py-2 rounded-lg text-sm font-medium ${view === id ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{label}</button>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quality Control</h1>
          <p className="text-sm text-slate-500">Lab tests are graded A+ to C against your company's quality standard. Below C is flagged as failed; graded samples can get a certificate.</p>
        </div>
        <button onClick={() => openNew()} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm"><Plus className="w-4 h-4" /> Record Test</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ['Tests', sum.total, `${sum.certificates} certificate${sum.certificates === 1 ? '' : 's'}`],
          ['Failed', sum.failed, sum.passRate == null ? 'No tests yet' : `${sum.passRate.toFixed(1)}% pass rate`],
          ['Avg Moisture', pct(sum.avgMoisture)],
          ['Avg Broken (rice)', pct(sum.avgBroken)],
        ].map(([label, value, hint]) => (
          <div key={label} className={`bg-white rounded-xl border p-4 shadow-sm ${label === 'Failed' && sum.failed ? 'border-red-200' : 'border-slate-200'}`}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`text-2xl font-bold ${label === 'Failed' && sum.failed ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
            {hint && <p className="text-xs text-slate-400">{hint}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm" aria-label="Tests by grade">
        <span className="text-slate-500">By grade:</span>
        {GRADES.map(g => <span key={g.value} className={`px-2 py-0.5 rounded-full font-medium ${GRADE_CLS[g.value]}`}>{g.label} · {sum.byGrade[g.value]}</span>)}
        <span className="px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Failed · {sum.failed}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">{tab('tests', 'Lab Tests')}{tab('batches', 'Batch History')}</div>
      {actionError && <p role="alert" className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{actionError} <button className="underline ml-2" onClick={() => setActionError('')}>Dismiss</button></p>}

      {view === 'tests' && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {[['all', 'All', scoped.length], ['FAIL', 'Failed', sum.failed], ...GRADES.map(g => [g.value, `Grade ${g.label}`, sum.byGrade[g.value]])].map(([id, label, count]) => (
              <button key={id} type="button" aria-pressed={filter === id} onClick={() => { setFilter(id); setPage(0) }}
                className={`px-3 py-1 rounded-full text-sm border ${filter === id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-600'}`}>{label} ({count})</button>
            ))}
            {batchFilter && <button type="button" onClick={() => setBatchFilter(null)} className="px-3 py-1 rounded-full text-sm border border-amber-300 bg-amber-50 text-amber-800">Batch #{batchFilter} ✕</button>}
          </div>
          {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-16"><FlaskConical className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-400">{rows.length ? 'No tests match this filter' : 'No lab tests yet'}</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>{['Date', 'Sample', 'Source', 'Moisture', 'Broken', 'Grade', 'Certificate', ''].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shown.map(r => {
                        const locked = !!r.certificateNumber
                        const cell = (key) => {
                          const ok = paramOk(PARAMETERS.find(p => p.key === key), r[key], r.standard)
                          return <td className={`px-5 py-3 text-sm font-mono ${ok === false ? 'text-red-700 font-semibold' : 'text-slate-700'}`}>{pct(r[key])}</td>
                        }
                        return (
                          <tr key={r.id} className={r.result === 'FAIL' ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-slate-50'}>
                            <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{r.testDate}</td>
                            <td className="px-5 py-3 text-sm"><span className="font-medium text-slate-800">{r.sampleCode}</span><span className="block text-xs text-slate-400">{productLabel(r.product)}{r.variety ? ` · ${r.variety}` : ''}</span></td>
                            <td className="px-5 py-3 text-sm text-slate-600 max-w-56 truncate" title={sampleSource(r)}>{sampleSource(r)}</td>
                            {cell('moisturePct')}
                            {cell('brokenPct')}
                            <td className="px-5 py-3 text-sm"><ResultBadge result={r.result} grade={r.grade} />{r.failureReasons?.length > 0 && <span className="block text-xs text-red-600 max-w-64 truncate mt-1" title={r.failureReasons.join('\n')}>{r.failureReasons.join('; ')}</span>}</td>
                            <td className="px-5 py-3 text-sm font-mono text-slate-600">{r.certificateNumber || '—'}</td>
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                {locked && <button onClick={() => downloadQualityCertificate(r, millName)} aria-label={`Download certificate ${r.certificateNumber}`} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"><FileDown className="w-4 h-4" /></button>}
                                {!locked && r.result === 'PASS' && <button onClick={() => setCertifying(r)} aria-label={`Issue certificate for ${r.sampleCode}`} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"><Award className="w-4 h-4" /></button>}
                                {!locked && <button onClick={() => openEdit(r)} aria-label={`Edit ${r.sampleCode}`} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"><Pencil className="w-4 h-4" /></button>}
                                {!locked && <button onClick={() => setDeleting(r)} aria-label={`Delete ${r.sampleCode}`} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {pages > 1 && (
                    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
                      <span>{current * PAGE_SIZE + 1}–{Math.min(filtered.length, (current + 1) * PAGE_SIZE)} of {filtered.length}</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setPage(current - 1)} disabled={current === 0} className="border border-slate-300 px-3 py-1 rounded-lg hover:bg-slate-50 disabled:opacity-40">Previous</button>
                        <span>Page {current + 1} of {pages}</span>
                        <button type="button" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} className="border border-slate-300 px-3 py-1 rounded-lg hover:bg-slate-50 disabled:opacity-40">Next</button>
                      </div>
                    </nav>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {view === 'batches' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          {history.length === 0 ? <p className="text-slate-400 text-center py-16">No milling batches yet</p> : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Batch', 'Date', 'Tests', 'Avg Moisture', 'Avg Broken', 'Latest Grade', 'Certificates', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map(b => (
                  <tr key={b.batchId} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">#{b.batchId}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{b.batchDate}<span className="block text-xs text-slate-400">{shiftLabel(b.shift)} · {Number(b.paddyInputQuintals).toFixed(2)} Qtl</span></td>
                    <td className="px-5 py-3 text-sm">{b.testCount}{b.failCount > 0 && <span className="text-red-600"> ({b.failCount} failed)</span>}</td>
                    <td className="px-5 py-3 text-sm font-mono">{pct(b.avgMoisturePct)}</td>
                    <td className="px-5 py-3 text-sm font-mono">{pct(b.avgBrokenPct)}</td>
                    <td className="px-5 py-3 text-sm"><ResultBadge result={b.latestResult} grade={b.latestGrade} />{b.latestTestDate && <span className="block text-xs text-slate-400">{b.latestTestDate}</span>}</td>
                    <td className="px-5 py-3 text-sm">{b.certificateCount}</td>
                    <td className="px-5 py-3 text-sm whitespace-nowrap">
                      {b.testCount > 0 && <button onClick={() => { setBatchFilter(b.batchId); setFilter('all'); setPage(0); setView('tests') }} className="text-emerald-700 hover:underline mr-3">History</button>}
                      <button onClick={() => openNew({ product: 'RICE', batchId: String(b.batchId) })} aria-label={`Test batch ${b.batchId}`} className="text-emerald-700 hover:underline">+ Test</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'Edit Lab Test' : 'Record Lab Test'} onClose={() => setForm(null)}>
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="qc-date" className="block text-sm font-medium text-slate-700 mb-1">Test Date *</label>
                <input id="qc-date" type="date" max={todayISO()} value={form.testDate} onChange={e => set('testDate')(e.target.value)} className={inputCls} />
                <Err k="testDate" />
              </div>
              <div>
                <label htmlFor="qc-product" className="block text-sm font-medium text-slate-700 mb-1">Product *</label>
                <select id="qc-product" value={form.product} onChange={e => set('product')(e.target.value)} className={inputCls}>
                  {PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="qc-batch" className="block text-sm font-medium text-slate-700 mb-1">Milling Batch</label>
              <select id="qc-batch" value={form.batchId} onChange={e => set('batchId')(e.target.value)} className={inputCls}>
                <option value="">Not from a batch</option>
                {batches.map(b => <option key={b.id} value={String(b.id)}>Batch #{b.id} · {b.batchDate} · {Number(b.paddyInputQuintals).toFixed(2)} Qtl paddy</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="qc-lot" className="block text-sm font-medium text-slate-700 mb-1">Lot / Stack Reference</label>
                <input id="qc-lot" maxLength={50} value={form.lotReference} onChange={e => set('lotReference')(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="qc-variety" className="block text-sm font-medium text-slate-700 mb-1">Variety</label>
                <input id="qc-variety" maxLength={50} placeholder="e.g. Sona Masoori" value={form.variety} onChange={e => set('variety')(e.target.value)} className={inputCls} />
              </div>
            </div>
            <fieldset className="border border-slate-200 rounded-lg p-3">
              <legend className="text-sm font-semibold text-slate-700 px-1">Readings (%)</legend>
              <div className="grid grid-cols-2 gap-3">
                {PARAMETERS.map(p => {
                  const required = p.key === 'moisturePct' || (p.key === 'brokenPct' && form.product === 'RICE')
                  const failing = preview.failed.includes(p.key)
                  return (
                    <div key={p.key}>
                      <label htmlFor={`qc-${p.key}`} className="block text-sm font-medium text-slate-700 mb-1">{p.label}{required ? ' *' : ''}</label>
                      <input id={`qc-${p.key}`} inputMode="decimal" value={form[p.key]} onChange={e => set(p.key)(e.target.value)}
                        className={`${inputCls} ${failing ? 'border-red-400 bg-red-50' : ''}`} />
                      <p className={`text-xs mt-0.5 ${failing ? 'text-red-600' : 'text-slate-400'}`}>C: {limitText(p, standardFor(form.product))} · A+: {limitText(p, standardFor(form.product), 'A_PLUS')}</p>
                      <Err k={p.key} />
                    </div>
                  )
                })}
              </div>
              <p role="status" className={`text-sm font-medium mt-3 ${preview.result === 'FAIL' ? 'text-red-600' : 'text-emerald-700'}`}>
                {preview.result === 'FAIL' ? `Will be flagged as FAILED (${preview.failed.length} below grade C)` : `Grade so far: ${gradeLabel(preview.grade)}`}
              </p>
            </fieldset>
            <div>
              <label htmlFor="qc-tested-by" className="block text-sm font-medium text-slate-700 mb-1">Tested By</label>
              <input id="qc-tested-by" maxLength={100} placeholder="Lab technician / chemist" value={form.testedBy} onChange={e => set('testedBy')(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="qc-remarks" className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
              <textarea id="qc-remarks" rows={2} value={form.remarks} onChange={e => set('remarks')(e.target.value)} className={inputCls} />
            </div>
            {save.isError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{errText(save.error)}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setForm(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={save.isPending} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">{save.isPending ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {certifying && (
        <Modal title={`Issue a certificate for ${certifying.sampleCode}?`} onClose={() => setCertifying(null)}>
          <p className="text-sm text-slate-600 mb-4">The certificate shows grade <strong>{gradeLabel(certifying.grade) || '—'}</strong> and gets the next number. The test is then locked: it can no longer be edited or deleted.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setCertifying(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => certify.mutate(certifying.id)} disabled={certify.isPending} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">{certify.isPending ? 'Issuing...' : 'Issue Certificate'}</button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete this lab test?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-600 mb-4">Use this only for tests entered by mistake. It cannot be undone.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setDeleting(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => remove.mutate(deleting.id)} disabled={remove.isPending} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">{remove.isPending ? 'Deleting...' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
