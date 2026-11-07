import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/v3/ui/button'
import { Card } from '@/v3/ui/card'
import { getGpsKeyStatus, rotateGpsKey } from '../../shared/api/mill'
import { GPS_KEY_HELP, gpsKeySummary } from '../../shared/utils/gps'
import ConfirmDialog from './ConfirmDialog'
import ErrorAlert from './ErrorAlert'
import PasswordDialog from './PasswordDialog'

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
    <Card className="gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><KeyRound className="size-4" /></div>
          <div><p className="text-sm font-semibold">GPS device key</p><p className="text-xs text-muted-foreground">{gpsKeySummary(status)}</p></div>
        </div>
        <Button size="sm" disabled={rotate.isPending} onClick={() => (status?.configured ? setConfirming(true) : rotate.mutate())}>
          {rotate.isPending && <Loader2 className="animate-spin" />}{status?.configured ? 'Generate new key' : 'Generate key'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{GPS_KEY_HELP}</p>
      <ErrorAlert error={rotate.error} />
      <ConfirmDialog open={confirming} title="Replace the GPS device key?" message="Devices using the current key will stop reporting until you update them."
        confirmLabel="Replace key" danger loading={rotate.isPending} onConfirm={() => rotate.mutate()} onClose={() => setConfirming(false)} />
      <PasswordDialog open={!!newKey} onClose={() => setNewKey('')} title="GPS device key" password={newKey}
        message="Copy this device key now — it will not be shown again." />
    </Card>
  )
}
