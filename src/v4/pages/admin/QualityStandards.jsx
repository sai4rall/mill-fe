import { useState } from 'react'
import { Alert, Button } from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCompanyQualityStandards, resetCompanyQualityStandard, saveCompanyQualityStandard } from '../../../shared/api/mills'
import { GRADES, PARAMETERS, PRODUCTS, standardPayload, standardToForm, validateStandard } from '../../../shared/utils/quality'
import { ErrorAlert, Loading, PageHeader } from '../../kit/display'
import { cx, errorMessage } from '../../lib/format'
import { time } from '../../lib/numbers'
import { notify } from '../../lib/toast'

/** Grade table for one product: rows = parameters, columns = A+ … C. Blank = not checked at that grade. */
function GradeTable({ standard }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(() => standardToForm(standard))
  const [errs, setErrs] = useState({})
  const done = (msg) => () => { qc.invalidateQueries({ queryKey: ['quality-standards-company'] }); notify(msg) }
  const save = useMutation({ mutationFn: (data) => saveCompanyQualityStandard(standard.product, data), onSuccess: done('Quality grades saved') })
  const reset = useMutation({ mutationFn: () => resetCompanyQualityStandard(standard.product), onSuccess: done('Back to the default grades'), onError: (e) => notify(errorMessage(e), 'error') })
  const label = PRODUCTS.find(p => p.value === standard.product)?.label
  const set = (grade, limit) => (e) => {
    const v = e.target.value
    setForm(f => ({ ...f, [grade]: { ...f[grade], [limit]: v } }))
    setErrs(x => ({ ...x, [`${grade}.${limit}`]: undefined }))
  }
  const submit = (e) => {
    e.preventDefault()
    const found = validateStandard(form)
    setErrs(found)
    if (!Object.keys(found).length) save.mutate(standardPayload(form))
  }
  const firstError = Object.values(errs).find(Boolean)

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-card border border-border bg-surface p-4 shadow-e1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{label}</h2>
          <p className="text-sm text-muted">
            {standard.configured ? `Company grades${standard.updatedBy ? ` · updated by ${standard.updatedBy}${standard.updatedAt ? ` ${time(standard.updatedAt)}` : ''}` : ''}` : 'Using the built-in default grades'}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-separate border-spacing-1 text-sm" aria-label={`${label} grade limits`}>
          <thead>
            <tr>
              <th className="text-left font-medium text-muted">Parameter</th>
              {GRADES.map(g => <th key={g.value} scope="col" className={cx('rounded-field px-2 py-1 text-center font-bold', g.value === 'C' ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok')}>{g.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {PARAMETERS.map(p => (
              <tr key={p.limit}>
                <th scope="row" className="pr-2 text-left font-medium whitespace-nowrap">{p.label} <span className="text-xs font-normal text-muted">{p.kind === 'min' ? '(min %)' : '(max %)'}</span></th>
                {GRADES.map(g => {
                  const err = errs[`${g.value}.${p.limit}`]
                  return (
                    <td key={g.value}>
                      <input aria-label={`${label} ${p.label} grade ${g.label}`} inputMode="decimal" placeholder="—" value={form[g.value][p.limit]} onChange={set(g.value, p.limit)}
                        aria-invalid={!!err} title={err}
                        className={cx('v4-num h-9 w-full rounded-field border bg-surface px-2 text-center', err ? 'border-risk bg-risk-soft' : 'border-border')} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {firstError && <p className="text-sm text-risk" role="alert">{Object.entries(errs).filter(([, v]) => v).map(([k, v]) => {
        const [g, l] = k.split('.')
        return `${PARAMETERS.find(p => p.limit === l)?.label} ${GRADES.find(x => x.value === g)?.label}: ${v}`
      }).join(' · ')}</p>}
      <ErrorAlert error={save.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" isPending={save.isPending}>Save {label?.toLowerCase()} grades</Button>
        {standard.configured && <Button variant="danger-soft" isPending={reset.isPending} onPress={() => reset.mutate()}>Reset to defaults</Button>}
      </div>
    </form>
  )
}

/** Super admin: the company's quality grades (A+ … C), used by every mill they own to grade lab tests. */
export default function QualityStandards() {
  const { data: standards, isLoading, error } = useQuery({ queryKey: ['quality-standards-company'], queryFn: getCompanyQualityStandards })
  if (isLoading) return <Loading />
  return (
    <div className="grid max-w-4xl gap-6">
      <PageHeader title="Quality standards" description="Grade limits for all of your company's mills. Lab samples get the best grade they meet on every parameter; below C they fail." />
      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>
            Leave a cell blank to not check that parameter at that grade (the lower grades' limits still apply). A better grade can never be looser
            than a worse one. Changes apply to tests saved from now on; earlier tests and certificates keep the grades they were given.
          </Alert.Description>
        </Alert.Content>
      </Alert>
      <ErrorAlert error={error} />
      {(standards || []).map(s => <GradeTable key={`${s.product}|${s.updatedAt || ''}|${s.configured}`} standard={s} />)}
    </div>
  )
}
