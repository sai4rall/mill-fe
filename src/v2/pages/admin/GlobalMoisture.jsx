import { Center, Loader, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getGlobalMoisture, saveGlobalMoisture } from '../../../shared/api/moisture'
import PageHeader from '../../components/PageHeader'
import RangesEditor from '../../components/RangesEditor'
import { errorMessage } from '../../../shared/utils/errors'

export default function GlobalMoisture() {
  const qc = useQueryClient()
  const { data: ranges, isLoading } = useQuery({ queryKey: ['moisture-global'], queryFn: getGlobalMoisture })
  const save = useMutation({
    mutationFn: (r) => saveGlobalMoisture(r),
    onSuccess: (data) => { qc.setQueryData(['moisture-global'], data); notifications.show({ color: 'leaf', message: 'Global ranges saved' }) },
  })
  if (isLoading || !ranges) return <Center py={80}><Loader /></Center>
  return (
    <Stack gap="lg" maw={760}>
      <PageHeader title="Moisture Deductions — Global Defaults"
        description="Applies to every mill without its own ranges. Mill admins can override these for their mill." />
      <RangesEditor key={JSON.stringify(ranges)} initial={ranges} saving={save.isPending} saveLabel="Save global ranges"
        serverError={save.isError ? errorMessage(save.error) : null} onSave={(r) => save.mutate(r)} />
    </Stack>
  )
}
