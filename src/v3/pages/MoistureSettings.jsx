import { Droplets, Info, Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '@/v3/ui/alert'
import { Button } from '@/v3/ui/button'
import { getMoistureTable, resetMillMoisture, saveMillMoisture } from '../../shared/api/moisture'
import { formatBand } from '../../shared/utils/moisture'
import PageHeader from '../components/PageHeader'
import RangesEditor from '../components/RangesEditor'
import Loading from '../components/Loading'
import { errorMessage } from '../lib/format'
import { notify } from '../lib/toast'

/** Mill admin: view the moisture table in effect and override the global one for this mill. */
export default function MoistureSettings() {
  const qc = useQueryClient()
  const { data: table, isLoading } = useQuery({ queryKey: ['moisture'], queryFn: getMoistureTable })
  const done = (msg) => (data) => { qc.setQueryData(['moisture'], data); notify(msg) }
  const save = useMutation({ mutationFn: (r) => saveMillMoisture(r), onSuccess: done('Moisture ranges saved') })
  const reset = useMutation({ mutationFn: () => resetMillMoisture(), onSuccess: done('Using global defaults again'), onError: (e) => notify(errorMessage(e), 'error') })

  if (isLoading || !table) return <Loading />
  const usingMill = table.source === 'MILL'
  const initial = usingMill ? table.millRanges : table.globalRanges
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Moisture Deductions" description="Each purchase price is reduced by the deduction for its moisture %" />
      <Alert className={usingMill ? 'border-emerald-200 bg-emerald-50' : 'bg-muted/40'}>
        {usingMill ? <Droplets className="text-emerald-600" /> : <Info />}
        <AlertDescription>
          <p>
            {usingMill && <>Your mill uses <b>its own ranges</b>, overriding the global defaults.</>}
            {table.source === 'GLOBAL' && <>Your mill uses the <b>global defaults</b> set by the super admin. Saving below creates your own ranges.</>}
            {table.source === 'NONE' && <>No ranges are set (globally or for your mill), so purchases get <b>no deduction</b>.</>}
          </p>
          {usingMill && table.globalRanges.length > 0 && (
            <p className="text-xs">Global defaults: {table.globalRanges.map(r => `${formatBand(r)} → ${Number(r.deductionPct)}%`).join(', ')}</p>
          )}
        </AlertDescription>
      </Alert>
      <RangesEditor key={JSON.stringify(initial)} initial={initial} saving={save.isPending} saveLabel={usingMill ? 'Save my ranges' : 'Override for my mill'}
        serverError={save.isError ? errorMessage(save.error) : null} onSave={(r) => save.mutate(r)} />
      {usingMill && <Button variant="outline" className="w-fit text-destructive hover:text-destructive" disabled={reset.isPending} onClick={() => reset.mutate()}>{reset.isPending && <Loader2 className="animate-spin" />}Reset to global defaults</Button>}
    </div>
  )
}
