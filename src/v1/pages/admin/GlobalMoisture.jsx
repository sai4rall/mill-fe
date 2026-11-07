import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGlobalMoisture, saveGlobalMoisture } from '../../../shared/api/moisture'
import MoistureRangesEditor from '../../components/MoistureRangesEditor'

/** Super admin: the company's default moisture table, used by its mills that have not defined their own. */
export default function GlobalMoisture() {
  const qc = useQueryClient()
  const { data: ranges, isLoading } = useQuery({ queryKey: ['moisture-global'], queryFn: getGlobalMoisture })
  const save = useMutation({
    mutationFn: (r) => saveGlobalMoisture(r),
    onSuccess: (data) => qc.setQueryData(['moisture-global'], data),
  })

  if (isLoading || !ranges) return <p className="text-slate-400 text-center py-20">Loading...</p>
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Moisture Deductions — Company Defaults</h1>
      <p className="text-sm text-slate-500 mb-6">
        Applies to every mill that has not set its own ranges. A mill admin can override these for their mill.
      </p>
      <MoistureRangesEditor key={JSON.stringify(ranges)} initial={ranges} saving={save.isPending} saveLabel="Save company ranges"
        serverError={save.isError ? (save.error?.response?.data?.error || save.error?.message) : null}
        onSave={(r) => save.mutate(r)} />
      {save.isSuccess && !save.isPending && <p role="status" className="text-sm text-emerald-700 mt-3">Saved.</p>}
    </div>
  )
}
