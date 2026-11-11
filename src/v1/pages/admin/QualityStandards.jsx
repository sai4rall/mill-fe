import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCompanyQualityStandards, resetCompanyQualityStandard, saveCompanyQualityStandard } from '../../../shared/api/mills'
import { GRADES, PARAMETERS, PRODUCTS, standardPayload, standardToForm, validateStandard } from '../../../shared/utils/quality'

const errText = (e) => e?.response?.data?.error || 'Could not save'

/** Grade table for one product: rows = parameters, columns = A+ … C. Blank = not checked at that grade. */
function GradeTable({ standard }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(() => standardToForm(standard))
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState('')
  const refresh = (msg) => () => { setSaved(msg); qc.invalidateQueries({ queryKey: ['quality-standards-company'] }) }
  const save = useMutation({ mutationFn: (data) => saveCompanyQualityStandard(standard.product, data), onSuccess: refresh('Saved') })
  const reset = useMutation({ mutationFn: () => resetCompanyQualityStandard(standard.product), onSuccess: refresh('Back to the default grades') })
  const label = PRODUCTS.find(p => p.value === standard.product)?.label
  const submit = (e) => {
    e.preventDefault()
    setSaved('')
    const found = validateStandard(form)
    setErrors(found)
    if (!Object.keys(found).length) save.mutate(standardPayload(form))
  }
  const errorList = Object.entries(errors).filter(([, v]) => v)

  return (
    <form onSubmit={submit} noValidate className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{label}</h2>
        <p className="text-sm text-slate-500">{standard.configured ? `Company grades${standard.updatedBy ? ` · updated by ${standard.updatedBy}` : ''}` : 'Using the built-in default grades'}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm" aria-label={`${label} grade limits`}>
          <thead>
            <tr>
              <th className="text-left px-2 py-2 text-xs font-semibold text-slate-600 uppercase">Parameter</th>
              {GRADES.map(g => <th key={g.value} scope="col" className={`px-2 py-2 text-center font-bold ${g.value === 'C' ? 'text-amber-700' : 'text-emerald-700'}`}>{g.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {PARAMETERS.map(p => (
              <tr key={p.limit} className="border-t border-slate-100">
                <th scope="row" className="text-left px-2 py-1.5 font-medium text-slate-700 whitespace-nowrap">{p.label} <span className="text-xs font-normal text-slate-400">{p.kind === 'min' ? '(min %)' : '(max %)'}</span></th>
                {GRADES.map(g => {
                  const err = errors[`${g.value}.${p.limit}`]
                  return (
                    <td key={g.value} className="px-1 py-1.5">
                      <input aria-label={`${label} ${p.label} grade ${g.label}`} inputMode="decimal" placeholder="—" title={err} aria-invalid={!!err}
                        value={form[g.value][p.limit]}
                        onChange={e => { const v = e.target.value; setSaved(''); setForm(f => ({ ...f, [g.value]: { ...f[g.value], [p.limit]: v } })); setErrors(x => ({ ...x, [`${g.value}.${p.limit}`]: undefined })) }}
                        className={`w-full border rounded-lg px-2 py-1.5 text-center font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 ${err ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {errorList.length > 0 && <p role="alert" className="text-xs text-red-600">{errorList.map(([k, v]) => {
        const [g, l] = k.split('.')
        return `${PARAMETERS.find(p => p.limit === l)?.label} ${GRADES.find(x => x.value === g)?.label}: ${v}`
      }).join(' · ')}</p>}
      {(save.isError || reset.isError) && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{errText(save.error || reset.error)}</p>}
      {saved && <p className="text-emerald-700 text-sm" role="status">{saved}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={save.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{save.isPending ? 'Saving...' : `Save ${label} Grades`}</button>
        {standard.configured && <button type="button" onClick={() => reset.mutate()} disabled={reset.isPending} className="border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">Reset to Defaults</button>}
      </div>
    </form>
  )
}

/** Super admin: the company's quality grades (A+ … C), used by every mill they own to grade lab tests. */
export default function QualityStandards() {
  const { data: standards = [], isLoading } = useQuery({ queryKey: ['quality-standards-company'], queryFn: getCompanyQualityStandards })
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Quality Standards</h1>
        <p className="text-sm text-slate-500">
          Grade limits for all of your company's mills. A lab sample gets the best grade it meets on every parameter; below C it fails.
          Leave a cell blank to not check that parameter at that grade. Changes apply to tests saved from now on.
        </p>
      </div>
      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p>
        : standards.map(s => <GradeTable key={`${s.product}|${s.updatedAt || ''}|${s.configured}`} standard={s} />)}
    </div>
  )
}
