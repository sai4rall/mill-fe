import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGlobalFlags, updateGlobalFlag, getMillFlags, setMillFlag, getDevMills } from '../../api/dev'
import { errorMessage } from './errorMessage'

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

const toChoice = (v) => (v == null ? 'inherit' : v ? 'on' : 'off')
const fromChoice = (c) => (c === 'inherit' ? null : c === 'on')

function OverrideSelect({ value, globalValue, onChange, label, disabled }) {
  return (
    <select aria-label={label} value={toChoice(value)} disabled={disabled} onChange={e => onChange(fromChoice(e.target.value))}
      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
      <option value="inherit">Inherit ({globalValue ? 'On' : 'Off'})</option>
      <option value="on">On</option>
      <option value="off">Off</option>
    </select>
  )
}

const Badge = ({ on, onText, offText }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${on ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
    {on ? onText : offText}
  </span>
)

export default function FeatureFlagsPanel() {
  const qc = useQueryClient()
  const [millId, setMillId] = useState('') // '' = global defaults

  const { data: mills = [] } = useQuery({ queryKey: ['dev-mills'], queryFn: getDevMills })
  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['dev-flags', millId || 'global'],
    queryFn: () => (millId ? getMillFlags(millId) : getGlobalFlags()),
  })

  const mutation = useMutation({
    mutationFn: ({ key, data }) => (millId ? setMillFlag(millId, key, data) : updateGlobalFlag(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['dev-flags'] }),
  })

  const th = 'text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="flag-scope" className="text-sm font-medium text-slate-700">Apply to</label>
        <select id="flag-scope" value={millId} onChange={e => setMillId(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">All mills (global defaults)</option>
          {mills.map(m => <option key={m.millId} value={m.millId}>{m.millName}</option>)}
        </select>
        <p className="text-xs text-slate-400">
          {millId ? '"Inherit" uses the global default. Overrides apply to this mill only.' : 'Applies to every mill without its own override.'}
        </p>
      </div>

      {mutation.isError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{errorMessage(mutation.error)}</p>}

      {isLoading ? <p className="text-slate-400 text-center py-10">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className={th}>Module</th>
                <th className={th}>Show in menu</th>
                <th className={th}>Enabled</th>
                {millId && <th className={th}>Effective</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flags.map(f => (
                <tr key={f.key}>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-800">{f.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{f.key}</p>
                  </td>
                  {millId ? (
                    <>
                      <td className="px-5 py-3">
                        <OverrideSelect label={`${f.name} show in menu`} value={f.overrideShowInMenu} globalValue={f.globalShowInMenu}
                          disabled={mutation.isPending}
                          onChange={v => mutation.mutate({ key: f.key, data: { showInMenu: v, enabled: f.overrideEnabled } })} />
                      </td>
                      <td className="px-5 py-3">
                        <OverrideSelect label={`${f.name} enabled`} value={f.overrideEnabled} globalValue={f.globalEnabled}
                          disabled={mutation.isPending}
                          onChange={v => mutation.mutate({ key: f.key, data: { showInMenu: f.overrideShowInMenu, enabled: v } })} />
                      </td>
                      <td className="px-5 py-3 space-x-1">
                        <Badge on={f.showInMenu} onText="In menu" offText="Hidden" />
                        <Badge on={f.enabled} onText="Enabled" offText="Not enabled" />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3">
                        <Toggle label={`${f.name} show in menu`} checked={f.showInMenu} disabled={mutation.isPending}
                          onChange={v => mutation.mutate({ key: f.key, data: { showInMenu: v } })} />
                      </td>
                      <td className="px-5 py-3">
                        <Toggle label={`${f.name} enabled`} checked={f.enabled} disabled={mutation.isPending}
                          onChange={v => mutation.mutate({ key: f.key, data: { enabled: v } })} />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
