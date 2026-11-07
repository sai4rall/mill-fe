import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { getGpsKeyStatus, rotateGpsKey } from '../../shared/api/mill'
import { GPS_KEY_HELP, gpsKeySummary } from '../../shared/utils/gps'
import PasswordReveal from './PasswordReveal'

/** Mill admin: generate or rotate the key GPS devices authenticate with. */
export default function GpsKeyCard() {
  const qc = useQueryClient()
  const [newKey, setNewKey] = useState('')
  const { data: status } = useQuery({ queryKey: ['gps-key'], queryFn: getGpsKeyStatus })
  const rotate = useMutation({
    mutationFn: rotateGpsKey,
    onSuccess: (r) => { setNewKey(r.deviceKey); qc.invalidateQueries({ queryKey: ['gps-key'] }) },
  })
  const onRotate = () => {
    if (status?.configured && !window.confirm('Generate a new key? Devices using the current key will stop reporting until updated.')) return
    rotate.mutate()
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-slate-800">GPS device key</p>
            <p className="text-xs text-slate-500">{gpsKeySummary(status)}</p>
          </div>
        </div>
        <button onClick={onRotate} disabled={rotate.isPending}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
          {status?.configured ? 'Generate new key' : 'Generate key'}
        </button>
      </div>
      {newKey && <PasswordReveal password={newKey} message="Copy this device key now — it will not be shown again." />}
      {rotate.isError && <p className="text-xs text-red-600 mt-2">{rotate.error?.response?.data?.error || 'Could not generate a key'}</p>}
      <p className="text-xs text-slate-400 mt-2">{GPS_KEY_HELP}</p>
    </div>
  )
}
