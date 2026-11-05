import { Alert, Button, Center, Loader, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Droplets, Info } from 'lucide-react'
import { getMoistureTable, resetMillMoisture, saveMillMoisture } from '../../shared/api/moisture'
import { formatBand } from '../../shared/utils/moisture'
import PageHeader from '../components/PageHeader'
import RangesEditor from '../components/RangesEditor'
import { errorMessage } from '../../shared/utils/errors'

/** Mill admin: view the moisture table in effect and override the global one for this mill. */
export default function MoistureSettings() {
  const qc = useQueryClient()
  const { data: table, isLoading } = useQuery({ queryKey: ['moisture'], queryFn: getMoistureTable })
  const done = (msg) => (data) => { qc.setQueryData(['moisture'], data); notifications.show({ color: 'leaf', message: msg }) }
  const save = useMutation({ mutationFn: (r) => saveMillMoisture(r), onSuccess: done('Moisture ranges saved') })
  const reset = useMutation({ mutationFn: () => resetMillMoisture(), onSuccess: done('Using global defaults again'),
    onError: (e) => notifications.show({ color: 'red', message: errorMessage(e) }) })

  if (isLoading || !table) return <Center py={80}><Loader /></Center>
  const usingMill = table.source === 'MILL'
  const initial = usingMill ? table.millRanges : table.globalRanges
  return (
    <Stack gap="lg" maw={760}>
      <PageHeader title="Moisture Deductions" description="Each purchase price is reduced by the deduction for its moisture %" />
      <Alert variant="light" color={usingMill ? 'leaf' : 'gray'} icon={usingMill ? <Droplets size={18} /> : <Info size={18} />}>
        {usingMill && <>Your mill uses <b>its own ranges</b>, overriding the global defaults.</>}
        {table.source === 'GLOBAL' && <>Your mill uses the <b>global defaults</b> set by the super admin. Saving below creates your own ranges.</>}
        {table.source === 'NONE' && <>No ranges are set (globally or for your mill), so purchases get <b>no deduction</b>.</>}
        {usingMill && table.globalRanges.length > 0 && (
          <Text size="xs" mt={4}>Global defaults: {table.globalRanges.map(r => `${formatBand(r)} → ${Number(r.deductionPct)}%`).join(', ')}</Text>
        )}
      </Alert>
      <RangesEditor key={JSON.stringify(initial)} initial={initial} saving={save.isPending}
        saveLabel={usingMill ? 'Save my ranges' : 'Override for my mill'}
        serverError={save.isError ? errorMessage(save.error) : null} onSave={(r) => save.mutate(r)} />
      {usingMill && <Button variant="light" color="red" w="fit-content" loading={reset.isPending} onClick={() => reset.mutate()}>Reset to global defaults</Button>}
    </Stack>
  )
}
