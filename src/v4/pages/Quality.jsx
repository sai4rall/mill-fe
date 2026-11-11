import { useMemo, useState } from 'react'
import { Button } from '@heroui/react'
import { AlertTriangle, Award, Droplets, FileDown, FlaskConical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createQualityTest, deleteQualityTest, getBatches, getBatchQuality, getQualityStandards, getQualityTests, issueQualityCertificate, updateQualityTest,
} from '../../shared/api/mill'
import { isFutureDate, todayISO } from '../../shared/utils/dates'
import {
  EMPTY_TEST, GRADES, PARAMETERS, PRODUCTS, gradeLabel, limitText, paramOk, previewResult, productLabel, qualitySummary, qualityTestPayload,
  sampleSource, testToForm, validateQualityTest, verdictLabel,
} from '../../shared/utils/quality'
import { downloadQualityCertificate } from '../../shared/utils/qualityCertificate'
import { shiftLabel } from '../../shared/utils/production'
import DataTable from '../kit/DataTable'
import { EmptyState, ErrorAlert, PageHeader, StatusChip } from '../kit/display'
import { ComboInput, DateInput, SelectInput, TextAreaInput, TextInput } from '../kit/fields'
import FilterBar, { inPeriod } from '../kit/FilterBar'
import { ConfirmDialog, Panel, SubmitButton } from '../kit/overlays'
import StatTile from '../kit/StatTile'
import { cx, errorMessage } from '../lib/format'
import { day, num, plural, qty } from '../lib/numbers'
import { useMillName } from '../lib/useMillName'
import { notify } from '../lib/toast'

const NONE = 'none'
const pct = (v) => (v == null ? '—' : `${num(v)}%`)
// Grade colours: A+/A green, B+/B blue, C amber (passed but lowest grade), failed red.
const GRADE_COLOR = { A_PLUS: 'success', A: 'success', B_PLUS: 'accent', B: 'accent', C: 'warning' }
const ResultChip = ({ result, grade }) => (
  <StatusChip color={result === 'FAIL' ? 'danger' : result === 'PASS' ? GRADE_COLOR[grade] || 'success' : 'default'}>{verdictLabel(result, grade)}</StatusChip>
)

/** Reading with a red mark when it is outside the limit the test was judged against. */
function Reading({ test, param }) {
  const ok = paramOk(param, test[param.key], test.standard)
  return <span className={cx('v4-num', ok === false && 'font-semibold text-risk')}>{pct(test[param.key])}</span>
}

/**
 * Quality control laboratory: record lab tests (moisture, broken %, …) graded A+ … C against the company's standard
 * (set by the super admin), flag failures, keep batch-wise history and issue quality certificates.
 */
export default function Quality() {
  const qc = useQueryClient()
  const millName = useMillName()
  const [view, setView] = useState('tests')
  const [form, setForm] = useState(null)
  const [errs, setErrs] = useState({})
  const [deleting, setDeleting] = useState(null)
  const [certifying, setCertifying] = useState(null)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('month')
  const [result, setResult] = useState('all')

  const { data: rows = [], isLoading, error } = useQuery({ queryKey: ['quality-tests'], queryFn: () => getQualityTests() })
  const { data: standards = [] } = useQuery({ queryKey: ['quality-standards'], queryFn: getQualityStandards })
  const { data: history = [], isLoading: historyLoading } = useQuery({ queryKey: ['quality-batches'], queryFn: getBatchQuality, enabled: view === 'batches' })
  const { data: batches = [] } = useQuery({ queryKey: ['batches'], queryFn: getBatches, enabled: !!form })

  const refresh = () => ['quality-tests', 'quality-batches'].forEach(k => qc.invalidateQueries({ queryKey: [k] }))
  const save = useMutation({
    mutationFn: ({ id, data }) => (id ? updateQualityTest(id, data) : createQualityTest(data)),
    onSuccess: (t, { id }) => {
      refresh(); setForm(null)
      notify(t.result === 'FAIL' ? `${t.sampleCode} failed the quality standard` : `${t.sampleCode}${id ? ' updated:' : ''} grade ${gradeLabel(t.grade)}`, t.result === 'FAIL' ? 'error' : undefined)
    },
  })
  const remove = useMutation({
    mutationFn: (id) => deleteQualityTest(id),
    onSuccess: () => { refresh(); setDeleting(null); notify('Test deleted') },
    onError: (e) => { setDeleting(null); notify(errorMessage(e), 'error') },
  })
  const certify = useMutation({
    mutationFn: (id) => issueQualityCertificate(id),
    onSuccess: (t) => { refresh(); setCertifying(null); downloadQualityCertificate(t, millName); notify(`Certificate ${t.certificateNumber} issued`) },
    onError: (e) => { setCertifying(null); notify(errorMessage(e), 'error') },
  })

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => inPeriod(r.testDate, period) && (!q || [r.sampleCode, r.variety, r.lotReference, r.certificateNumber, r.batchId && `batch #${r.batchId}`]
      .some(v => v && String(v).toLowerCase().includes(q))))
  }, [rows, search, period])
  const shown = result === 'all' ? scoped : result === 'FAIL' ? scoped.filter(r => r.result === 'FAIL') : scoped.filter(r => r.result === 'PASS' && r.grade === result)
  const sum = qualitySummary(scoped)
  const standardFor = (product) => standards.find(s => s.product === product)

  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: undefined })) }
  const openNew = (preset = {}) => { save.reset(); setErrs({}); setForm({ ...EMPTY_TEST, testDate: todayISO(), ...preset }) }
  const openEdit = (r) => { save.reset(); setErrs({}); setForm(testToForm(r)) }
  const submit = (e) => {
    e.preventDefault()
    const found = validateQualityTest(form, isFutureDate)
    setErrs(found)
    if (!Object.keys(found).length) save.mutate({ id: form.id, data: qualityTestPayload(form) })
  }

  const batchOptions = [{ value: NONE, label: 'Not from a batch' }, ...batches.map(b => ({ value: String(b.id), label: `Batch #${b.id} · ${b.batchDate} · ${num(b.paddyInputQuintals)} Qtl paddy` }))]
  const preview = form ? previewResult(form, standardFor(form.product)) : null

  const actions = (r) => {
    const locked = !!r.certificateNumber
    return (
      <div className="flex justify-end gap-1">
        {locked && <Button isIconOnly size="sm" variant="ghost" onPress={() => downloadQualityCertificate(r, millName)} aria-label={`Download certificate ${r.certificateNumber}`}><FileDown className="size-4" /></Button>}
        {!locked && r.result === 'PASS' && <Button isIconOnly size="sm" variant="ghost" onPress={() => setCertifying(r)} aria-label={`Issue certificate for ${r.sampleCode}`}><Award className="size-4" /></Button>}
        {!locked && <Button isIconOnly size="sm" variant="ghost" onPress={() => openEdit(r)} aria-label={`Edit ${r.sampleCode}`}><Pencil className="size-4" /></Button>}
        {!locked && <Button isIconOnly size="sm" variant="ghost" className="text-danger" onPress={() => setDeleting(r)} aria-label={`Delete ${r.sampleCode}`}><Trash2 className="size-4" /></Button>}
      </div>
    )
  }
  const P = Object.fromEntries(PARAMETERS.map(p => [p.key, p]))
  const columns = [
    { key: 'testDate', header: 'Date', className: 'whitespace-nowrap', cell: (r) => day(r.testDate), sortValue: (r) => `${r.testDate} ${String(r.id).padStart(9, '0')}` },
    { key: 'sampleCode', header: 'Sample', cell: (r) => <span><span className="font-semibold">{r.sampleCode}</span><span className="block text-xs text-muted">{productLabel(r.product)}{r.variety ? ` · ${r.variety}` : ''}</span></span>, sortValue: (r) => r.id },
    { key: 'source', header: 'Source', cell: (r) => <span className="block max-w-56 truncate text-sm" title={sampleSource(r)}>{sampleSource(r)}</span> },
    { key: 'moisturePct', header: 'Moisture', align: 'right', cell: (r) => <Reading test={r} param={P.moisturePct} />, sortValue: (r) => Number(r.moisturePct) },
    { key: 'brokenPct', header: 'Broken', align: 'right', cell: (r) => <Reading test={r} param={P.brokenPct} />, sortValue: (r) => Number(r.brokenPct ?? -1) },
    { key: 'result', header: 'Grade', cell: (r) => (
      <span><ResultChip result={r.result} grade={r.grade} />{r.failureReasons?.length > 0 && <span className="mt-0.5 block max-w-64 truncate text-xs text-risk" title={r.failureReasons.join('\n')}>{r.failureReasons.join('; ')}</span>}</span>
    ), sortValue: (r) => (r.result === 'FAIL' ? 9 : GRADES.findIndex(g => g.value === r.grade)) },
    { key: 'certificateNumber', header: 'Certificate', cell: (r) => <span className="v4-num text-sm">{r.certificateNumber || '—'}</span> },
    { key: 'act', header: '', align: 'right', pin: true, cell: actions },
  ]

  const historyColumns = [
    { key: 'batchId', header: 'Batch', cell: (b) => <span className="font-semibold">#{b.batchId}</span>, sortValue: (b) => b.batchId },
    { key: 'batchDate', header: 'Date', cell: (b) => <span>{day(b.batchDate)}<span className="block text-xs text-muted">{shiftLabel(b.shift)} · {qty(b.paddyInputQuintals)}</span></span>, sortValue: (b) => b.batchDate },
    { key: 'testCount', header: 'Tests', align: 'right', cell: (b) => <span className="v4-num">{b.testCount}{b.failCount > 0 && <span className="text-risk"> ({b.failCount} failed)</span>}</span>, sortValue: (b) => b.testCount },
    { key: 'avgMoisturePct', header: 'Avg moisture', align: 'right', cell: (b) => <span className="v4-num">{pct(b.avgMoisturePct)}</span>, sortValue: (b) => Number(b.avgMoisturePct ?? -1) },
    { key: 'avgBrokenPct', header: 'Avg broken', align: 'right', cell: (b) => <span className="v4-num">{pct(b.avgBrokenPct)}</span>, sortValue: (b) => Number(b.avgBrokenPct ?? -1) },
    { key: 'latestResult', header: 'Latest grade', cell: (b) => <span><ResultChip result={b.latestResult} grade={b.latestGrade} />{b.latestTestDate && <span className="block text-xs text-muted">{day(b.latestTestDate)}</span>}</span>, sortValue: (b) => b.latestResult || '' },
    { key: 'certificateCount', header: 'Certificates', align: 'right', cell: (b) => <span className="v4-num">{b.certificateCount}</span> },
    { key: 'act', header: '', align: 'right', pin: true, cell: (b) => (
      <div className="flex justify-end gap-1">
        {b.testCount > 0 && <Button size="sm" variant="ghost" onPress={() => { setView('tests'); setPeriod('all'); setResult('all'); setSearch(`batch #${b.batchId}`) }}>History</Button>}
        <Button size="sm" variant="ghost" onPress={() => openNew({ product: 'RICE', batchId: String(b.batchId) })} aria-label={`Test batch ${b.batchId}`}><Plus className="size-4" />Test</Button>
      </div>
    ) },
  ]

  return (
    <>
      <PageHeader title="Quality control" description="Lab tests are graded A+ to C against your company's quality standard. Below C is flagged as failed; graded samples can get a certificate."
        actions={<Button onPress={() => openNew()}><Plus className="size-4" />Record test</Button>} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Tests" display={num(sum.total, 0)} icon={FlaskConical} tone="neutral" hint={plural(sum.certificates, 'certificate')} />
        <StatTile label="Failed" display={num(sum.failed, 0)} icon={AlertTriangle} tone={sum.failed ? 'risk' : 'ok'}
          hint={sum.passRate == null ? 'No tests yet' : `${num(sum.passRate, 1)}% pass rate`} />
        <StatTile label="Avg moisture" display={pct(sum.avgMoisture)} icon={Droplets} tone="rice" />
        <StatTile label="Avg broken (rice)" display={pct(sum.avgBroken)} tone="paddy" />
        <div className="col-span-2 flex flex-wrap items-center gap-2 lg:col-span-4" aria-label="Tests by grade">
          <span className="text-sm text-muted">By grade:</span>
          {GRADES.map(g => <StatusChip key={g.value} color={GRADE_COLOR[g.value]}>{g.label} · {sum.byGrade[g.value]}</StatusChip>)}
          <StatusChip color="danger">Failed · {sum.failed}</StatusChip>
        </div>
      </div>

      <div className="flex gap-2" role="group" aria-label="View">
        {[['tests', 'Lab tests'], ['batches', 'Batch history']].map(([id, label]) => (
          <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}
            className={cx('h-9 rounded-full border px-4 text-sm font-medium', view === id ? 'border-accent bg-accent-soft text-accent-soft-foreground' : 'border-border bg-surface text-muted hover:text-foreground')}>{label}</button>
        ))}
      </div>

      <ErrorAlert error={error} />
      {view === 'tests' && (
        <>
          <FilterBar search={search} onSearch={setSearch} searchLabel="Sample, batch, variety or certificate" period={period} onPeriod={setPeriod} status={result} onStatus={setResult}
            statuses={[{ id: 'all', label: 'All', count: scoped.length }, { id: 'FAIL', label: 'Failed', count: sum.failed },
              ...GRADES.map(g => ({ id: g.value, label: `Grade ${g.label}`, count: sum.byGrade[g.value] }))]} />
          {!isLoading && rows.length === 0
            ? <EmptyState icon={FlaskConical} title="No lab tests yet" action={<Button onPress={() => openNew()}><Plus className="size-4" />Record test</Button>}>Record moisture, broken % and other readings for paddy or rice samples.</EmptyState>
            : <DataTable key={`${period}|${result}|${search}`} label="Lab tests" rows={shown} columns={columns} loading={isLoading} minWidth={1080} pageSize={20}
                empty="No tests match these filters." initialSort={{ column: 'testDate', direction: 'descending' }}
                phoneRow={(r) => (
                  <div className="flex items-start gap-3">
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <div className="flex justify-between gap-2"><span className="truncate font-semibold">{r.sampleCode} · {productLabel(r.product)}</span><ResultChip result={r.result} grade={r.grade} /></div>
                      <p className="truncate text-xs text-muted">{day(r.testDate)} · Moisture {pct(r.moisturePct)}{r.brokenPct != null ? ` · Broken ${pct(r.brokenPct)}` : ''}</p>
                      {r.failureReasons?.length > 0 && <p className="truncate text-xs text-risk">{r.failureReasons.join('; ')}</p>}
                    </div>
                    {actions(r)}
                  </div>
                )} />}
        </>
      )}
      {view === 'batches' && (
        <DataTable label="Batch-wise quality history" rows={history} rowKey="batchId" columns={historyColumns} loading={historyLoading} minWidth={980} pageSize={20}
          empty="No milling batches yet." initialSort={{ column: 'batchDate', direction: 'descending' }}
          phoneRow={(b) => (
            <div className="grid gap-0.5">
              <div className="flex justify-between gap-2"><span className="font-semibold">Batch #{b.batchId} · {day(b.batchDate)}</span><ResultChip result={b.latestResult} grade={b.latestGrade} /></div>
              <p className="text-xs text-muted">{b.testCount} tests{b.failCount ? `, ${b.failCount} failed` : ''} · Avg moisture {pct(b.avgMoisturePct)} · Avg broken {pct(b.avgBrokenPct)}</p>
            </div>
          )} />
      )}

      <Panel open={!!form} onClose={() => setForm(null)} onSubmit={submit} width="sm:w-[36rem]"
        title={form?.id ? 'Edit lab test' : 'Record lab test'} description="Readings are graded against your company's current quality standard when you save."
        footer={<><Button variant="tertiary" onPress={() => setForm(null)}>Cancel</Button><SubmitButton pending={save.isPending}>Save</SubmitButton></>}>
        {form && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DateInput label="Test date" required value={form.testDate} onChange={set('testDate')} error={errs.testDate} />
              <SelectInput label="Product" options={PRODUCTS} value={form.product} onChange={(v) => set('product')(v || 'RICE')} />
            </div>
            <ComboInput label="Milling batch" options={batchOptions} value={form.batchId || NONE} onChange={(v) => set('batchId')(v === NONE ? '' : v)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Lot / stack reference" maxLength={50} value={form.lotReference} onChange={set('lotReference')} error={errs.lotReference} />
              <TextInput label="Variety" placeholder="e.g. Sona Masoori" maxLength={50} value={form.variety} onChange={set('variety')} error={errs.variety} />
            </div>
            <fieldset className="grid gap-3 rounded-card border border-border p-3">
              <legend className="px-1 text-sm font-semibold">Readings</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {PARAMETERS.map(p => {
                  const required = p.key === 'moisturePct' || (p.key === 'brokenPct' && form.product === 'RICE')
                  const failing = preview.failed.includes(p.key)
                  return (
                    <TextInput key={p.key} label={p.label} unit="%" inputMode="decimal" required={required} value={form[p.key]} onChange={set(p.key)}
                      error={errs[p.key] || (failing ? `Below grade C (${limitText(p, standardFor(form.product))})` : undefined)}
                      hint={`C: ${limitText(p, standardFor(form.product))} · A+: ${limitText(p, standardFor(form.product), 'A_PLUS')}`} />
                  )
                })}
              </div>
              <p className={cx('text-sm font-medium', preview.result === 'FAIL' ? 'text-risk' : 'text-ok')} role="status">
                {preview.result === 'FAIL' ? `Will be flagged as FAILED (${preview.failed.length} below grade C)` : `Grade so far: ${gradeLabel(preview.grade)}`}
              </p>
            </fieldset>
            <TextInput label="Tested by" placeholder="Lab technician / chemist" maxLength={100} value={form.testedBy} onChange={set('testedBy')} error={errs.testedBy} />
            <TextAreaInput label="Remarks" value={form.remarks} onChange={set('remarks')} />
            <ErrorAlert error={save.error} />
          </div>
        )}
      </Panel>

      <ConfirmDialog open={!!certifying} title={`Issue a certificate for ${certifying?.sampleCode}?`} confirmLabel="Issue certificate" loading={certify.isPending}
        message={`The certificate shows grade ${gradeLabel(certifying?.grade) || '—'} and gets the next number. The test is then locked: it can no longer be edited or deleted.`} onConfirm={() => certify.mutate(certifying.id)} onClose={() => setCertifying(null)} />
      <ConfirmDialog open={!!deleting} danger title="Delete this lab test?" confirmLabel="Delete" loading={remove.isPending}
        message="Use this only for tests entered by mistake. It cannot be undone." onConfirm={() => remove.mutate(deleting.id)} onClose={() => setDeleting(null)} />
    </>
  )
}
