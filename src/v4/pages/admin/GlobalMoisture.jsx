import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getGlobalMoisture, saveGlobalMoisture } from '../../../shared/api/moisture'
import { Loading, PageHeader } from '../../kit/display'
import RangesEditor from '../../kit/RangesEditor'
import { errorMessage } from '../../lib/format'
import { notify } from '../../lib/toast'

export default function GlobalMoisture() {
  const qc = useQueryClient()
  const { data: ranges, isLoading } = useQuery({ queryKey: ['moisture-global'], queryFn: getGlobalMoisture })
  const save = useMutation({ mutationFn: (r) => saveGlobalMoisture(r), onSuccess: (data) => { qc.setQueryData(['moisture-global'], data); notify('Company ranges saved') } })
  if (isLoading || !ranges) return <Loading />
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Moisture Deductions — Company Defaults" description="Applies to your company's mills without their own ranges. Other companies never see these. Mill admins can override them for their mill." />
      <RangesEditor key={JSON.stringify(ranges)} initial={ranges} saving={save.isPending} saveLabel="Save company ranges"
        serverError={save.isError ? errorMessage(save.error) : null} onSave={(r) => save.mutate(r)} />
    </div>
  )
}
