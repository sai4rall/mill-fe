import { useState } from 'react'
import { Button, Card, Group, Text, ThemeIcon } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { getGpsKeyStatus, rotateGpsKey } from '../../shared/api/mill'
import { GPS_KEY_HELP, gpsKeySummary } from '../../shared/utils/gps'
import ErrorAlert from './ErrorAlert'
import PasswordModal from './PasswordModal'

/** Mill admin: generate or rotate the key GPS devices authenticate with. */
export default function GpsKeyCard() {
  const qc = useQueryClient()
  const [newKey, setNewKey] = useState('')
  const [confirming, setConfirming] = useState(false)
  const { data: status } = useQuery({ queryKey: ['gps-key'], queryFn: getGpsKeyStatus })
  const rotate = useMutation({
    mutationFn: rotateGpsKey,
    onSuccess: (r) => { setConfirming(false); setNewKey(r.deviceKey); qc.invalidateQueries({ queryKey: ['gps-key'] }) },
  })
  return (
    <Card padding="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon variant="light" size={36} radius="md"><KeyRound size={18} /></ThemeIcon>
          <div><Text fw={700} size="sm">GPS device key</Text><Text size="xs" c="dimmed">{gpsKeySummary(status)}</Text></div>
        </Group>
        {confirming ? (
          <Group gap="xs">
            <Text size="xs" c="orange.8">Devices using the current key will stop reporting.</Text>
            <Button size="xs" variant="default" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button size="xs" color="orange" loading={rotate.isPending} onClick={() => rotate.mutate()}>Replace key</Button>
          </Group>
        ) : (
          <Button size="xs" loading={rotate.isPending} onClick={() => (status?.configured ? setConfirming(true) : rotate.mutate())}>
            {status?.configured ? 'Generate new key' : 'Generate key'}
          </Button>
        )}
      </Group>
      <Text size="xs" c="dimmed" mt="xs">{GPS_KEY_HELP}</Text>
      <ErrorAlert error={rotate.error} />
      <PasswordModal opened={!!newKey} onClose={() => setNewKey('')} title="GPS device key" password={newKey}
        message="Copy this device key now — it will not be shown again." />
    </Card>
  )
}
