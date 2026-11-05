import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMoistureTable, saveMillMoisture, resetMillMoisture } from '../../../shared/api/moisture'
import MoistureRangesEditor from '../../components/MoistureRangesEditor'
import { formatBand } from '../../../shared/utils/moisture'

const errorMessage = (e) => e?.response?.data?.error || e?.message

/** Mill admin: view the moisture table in effect and override the global one for this mill. */
export default function MoistureSettings() {
  const qc = useQueryClient()
  const { data: table, isLoading } = useQuery({ queryKey: ['moisture'], queryFn: getMoistureTable })
  const onDone = (data) => qc.setQueryData(['moisture'], data)
  const save = useMutation({ mutationFn: (ranges) => saveMillMoisture(ranges), onSuccess: onDone })
  const reset = useMutation({ mutationFn: () => resetMillMoisture(), onSuccess: onDone })

  if (isLoading || !table) return <p className="text-slate-400 text-center py-20">Loading...</p>
  const usingMill = table.source === 'MILL'
  // Start editing from the mill's own table, or from a copy of the global one.
  const initial = usingMill ? table.millRanges : table.globalRanges

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Moisture Deductions</h1>
      <p className="text-sm text-slate-500 mb-4">The price of each purchase is reduced by the deduction for its moisture %.</p>

      <div className={`rounded-lg px-4 py-3 text-sm mb-6 border ${usingMill ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
        {usingMill && <>Your mill uses <strong>its own ranges</strong>, overriding the global defaults.</>}
        {table.source === 'GLOBAL' && <>Your mill uses the <strong>global defaults</strong> set by the super admin. Saving below creates your own ranges.</>}
        {table.source === 'NONE' && <>No ranges are set (globally or for your mill), so purchases get <strong>no deduction</strong>.</>}
        {usingMill && table.globalRanges.length > 0 && (
          <p className="text-xs mt-1 text-emerald-700">Global defaults: {table.globalRanges.map(r => `${formatBand(r)} → ${Number(r.deductionPct)}%`).join(', ')}</p>
        )}
      </div>

      <MoistureRangesEditor key={JSON.stringify(initial)} initial={initial} saving={save.isPending}
        saveLabel={usingMill ? 'Save my ranges' : 'Override for my mill'}
        serverError={save.isError ? errorMessage(save.error) : null}
        onSave={(ranges) => save.mutate(ranges)} />

      {usingMill && (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <button type="button" onClick={() => reset.mutate()} disabled={reset.isPending}
            className="text-sm text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg disabled:opacity-60">
            {reset.isPending ? 'Resetting...' : 'Reset to global defaults'}
          </button>
          {reset.isError && <p className="text-red-600 text-sm mt-2">{errorMessage(reset.error)}</p>}
        </div>
      )}
      {save.isSuccess && !save.isPending && <p role="status" className="text-sm text-emerald-700 mt-3">Saved.</p>}
    </div>
  )
}
