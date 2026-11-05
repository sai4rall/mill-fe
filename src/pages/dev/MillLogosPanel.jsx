import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Upload, Trash2 } from 'lucide-react'
import { getDevMills, getDevMillLogo, uploadMillLogo, deleteMillLogo } from '../../api/dev'
import { useObjectUrl } from '../../utils/useObjectUrl'
import { errorMessage } from './errorMessage'
import { LOGO_TYPES, logoFileError } from './devValidation'

function LogoPreview({ mill }) {
  const { data: blob } = useQuery({
    queryKey: ['dev-mill-logo', mill.millId, mill.logoUpdatedAt],
    queryFn: () => getDevMillLogo(mill.millId, mill.logoUpdatedAt),
    enabled: !!mill.logoUpdatedAt,
    staleTime: Infinity,
  })
  const url = useObjectUrl(blob)
  return (
    <div className="h-20 w-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
      {url ? <img src={url} alt={`${mill.millName} logo`} className="max-h-full max-w-full object-contain" />
           : <Building2 aria-label="No logo" className="w-8 h-8 text-slate-300" />}
    </div>
  )
}

function MillLogoCard({ mill }) {
  const qc = useQueryClient()
  const input = useRef(null)
  const [error, setError] = useState('')
  const refresh = () => qc.invalidateQueries({ queryKey: ['dev-mills'] })

  const upload = useMutation({
    mutationFn: (file) => uploadMillLogo(mill.millId, file),
    onSuccess: () => { setError(''); refresh() },
    onError: (e) => setError(errorMessage(e)),
  })
  const remove = useMutation({
    mutationFn: () => deleteMillLogo(mill.millId),
    onSuccess: () => { setError(''); refresh() },
    onError: (e) => setError(errorMessage(e)),
  })

  const onPick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const problem = logoFileError(file)
    if (problem) { setError(problem); return }
    upload.mutate(file)
  }

  const busy = upload.isPending || remove.isPending
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-4" data-testid={`mill-logo-${mill.millId}`}>
      <LogoPreview mill={mill} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800 truncate">{mill.millName}</p>
        <p className="text-xs text-slate-400 truncate">{mill.location || '—'} · {mill.status}</p>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">
            <Upload className="w-3.5 h-3.5" /> {upload.isPending ? 'Uploading...' : mill.logoUpdatedAt ? 'Replace logo' : 'Upload logo'}
          </button>
          {mill.logoUpdatedAt && (
            <button type="button" onClick={() => remove.mutate()} disabled={busy} aria-label={`Remove ${mill.millName} logo`}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 px-2 rounded-lg disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
        {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
        <input ref={input} type="file" accept={LOGO_TYPES.join(',')} className="hidden" onChange={onPick}
          aria-label={`${mill.millName} logo file`} />
      </div>
    </div>
  )
}

export default function MillLogosPanel() {
  const { data: mills = [], isLoading } = useQuery({ queryKey: ['dev-mills'], queryFn: getDevMills })
  if (isLoading) return <p className="text-slate-400 text-center py-10">Loading...</p>
  if (!mills.length) return <p className="text-slate-400 text-center py-10">No mills yet. Super admins create mills.</p>
  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">PNG, JPEG or WebP, up to 1 MB. Shown at the top left for the mill's users after login.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mills.map(m => <MillLogoCard key={m.millId} mill={m} />)}
      </div>
    </div>
  )
}
