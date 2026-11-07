import { useState } from 'react'
import { Button } from '@heroui/react'
import { KeyRound } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getGpsKeyStatus, rotateGpsKey } from '../../shared/api/mill'
import { GPS_KEY_HELP, gpsKeySummary } from '../../shared/utils/gps'
import { ErrorAlert } from './display'
import { ConfirmDialog } from './overlays'
import PasswordReveal from './PasswordReveal'

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
    <div className="grid gap-3 rounded-card border border-border bg-surface-secondary/40 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-field bg-accent-soft text-accent-soft-foreground"><KeyRound className="size-4" /></div>
        <div className="min-w-0"><p className="text-sm font-bold">GPS device key</p><p className="text-xs text-muted">{gpsKeySummary(status)}</p></div>
      </div>
      <Button size="sm" variant="secondary" isPending={rotate.isPending} onPress={() => (status?.configured ? setConfirming(true) : rotate.mutate())}>
        {status?.configured ? 'Generate new key' : 'Generate key'}
      </Button>
      <p className="text-xs text-muted">{GPS_KEY_HELP}</p>
      <ErrorAlert error={rotate.error} />
      <ConfirmDialog open={confirming} title="Replace the GPS device key?" message="Devices using the current key will stop reporting until you update them."
        confirmLabel="Replace key" danger loading={rotate.isPending} onConfirm={() => rotate.mutate()} onClose={() => setConfirming(false)} />
      <PasswordReveal open={!!newKey} onClose={() => setNewKey('')} title="GPS device key" password={newKey}
        message="Copy this device key now — it will not be shown again." />
    </div>
  )
}
