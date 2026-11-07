import { Alert, Button } from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMoistureTable, resetMillMoisture, saveMillMoisture } from '../../shared/api/moisture'
import { formatBand } from '../../shared/utils/moisture'
import { Loading, PageHeader } from '../kit/display'
import RangesEditor from '../kit/RangesEditor'
import { errorMessage } from '../lib/format'
import { notify } from '../lib/toast'

/** Mill admin: view the moisture table in effect and override the company default for this mill. */
export default function MoistureSettings() {
  const qc = useQueryClient()
  const { data: table, isLoading } = useQuery({ queryKey: ['moisture'], queryFn: getMoistureTable })
  const done = (msg) => (data) => { qc.setQueryData(['moisture'], data); notify(msg) }
  const save = useMutation({ mutationFn: (r) => saveMillMoisture(r), onSuccess: done('Moisture ranges saved') })
  const reset = useMutation({ mutationFn: () => resetMillMoisture(), onSuccess: done('Using company defaults again'), onError: (e) => notify(errorMessage(e), 'error') })

  if (isLoading || !table) return <Loading />
  const usingMill = table.source === 'MILL'
  const initial = usingMill ? table.millRanges : table.globalRanges
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Moisture Deductions" description="Each purchase price is reduced by the deduction for its moisture %" />
      <Alert status={usingMill ? 'success' : 'default'}>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>
            {usingMill && <>Your mill uses <b>its own ranges</b>, overriding the company defaults.</>}
            {table.source === 'GLOBAL' && <>Your mill uses the <b>company defaults</b> set by your super admin. Saving below creates your own ranges.</>}
            {table.source === 'NONE' && <>No ranges are set (by your company or for your mill), so purchases get <b>no deduction</b>.</>}
            {usingMill && table.globalRanges.length > 0 && <span className="mt-1 block text-xs">Company defaults: {table.globalRanges.map(r => `${formatBand(r)} → ${Number(r.deductionPct)}%`).join(', ')}</span>}
          </Alert.Description>
        </Alert.Content>
      </Alert>
      <RangesEditor key={JSON.stringify(initial)} initial={initial} saving={save.isPending} saveLabel={usingMill ? 'Save my ranges' : 'Override for my mill'}
        serverError={save.isError ? errorMessage(save.error) : null} onSave={(r) => save.mutate(r)} />
      {usingMill && <Button variant="danger-soft" className="w-fit" isPending={reset.isPending} onPress={() => reset.mutate()}>Reset to company defaults</Button>}
    </div>
  )
}
