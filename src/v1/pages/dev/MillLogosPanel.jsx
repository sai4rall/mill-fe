import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Upload, Trash2, Power } from 'lucide-react'
import { getDevMills, getDevMillLogo, uploadMillLogo, deleteMillLogo, setMillStatus, deleteMill, assignMillOwner, getSuperAdmins } from '../../../shared/api/dev'
import Modal from '../../components/Modal'
import { useObjectUrl } from '../../../shared/utils/useObjectUrl'
import { errorMessage } from './errorMessage'
import { LOGO_TYPES, logoFileError } from '../../../shared/utils/devValidation'

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

function MillLogoCard({ mill, companies, onDelete }) {
  const qc = useQueryClient()
  const input = useRef(null)
  const [error, setError] = useState('')
  const refresh = () => { qc.invalidateQueries({ queryKey: ['dev-mills'] }); qc.invalidateQueries({ queryKey: ['dev-users'] }) }
  const active = mill.status === 'ACTIVE'
  const status = useMutation({
    mutationFn: () => setMillStatus(mill.millId, active ? 'INACTIVE' : 'ACTIVE'),
    onSuccess: () => { setError(''); refresh() },
    onError: (e) => setError(errorMessage(e)),
  })

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

  const owner = useMutation({
    mutationFn: (ownerId) => assignMillOwner(mill.millId, Number(ownerId)),
    onSuccess: () => { setError(''); refresh() },
    onError: (e) => setError(errorMessage(e)),
  })
  const busy = upload.isPending || remove.isPending || status.isPending || owner.isPending
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-4" data-testid={`mill-logo-${mill.millId}`}>
      <LogoPreview mill={mill} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800 truncate">{mill.millName}</p>
        <p className="text-xs text-slate-400 truncate">{mill.location || '—'} · <span className={active ? 'text-emerald-700' : 'text-amber-700 font-medium'}>{active ? 'Active' : 'Inactive'}</span></p>
        <label className="block mt-2 text-xs text-slate-500">
          Company (super admin)
          <select value={mill.ownerId ? String(mill.ownerId) : ''} disabled={busy} aria-label={`Company for ${mill.millName}`}
            onChange={e => { if (e.target.value) owner.mutate(e.target.value) }}
            className="mt-1 block w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400">
            {!mill.ownerId && <option value="">Not assigned</option>}
            {companies.map(c => <option key={c.id} value={String(c.id)}>{c.username}</option>)}
          </select>
        </label>
        {!mill.ownerId && <p className="text-xs text-amber-700 mt-1">No company owns this mill, so no super admin can see it. Assign one.</p>}
        <div className="flex flex-wrap gap-2 mt-3">
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
          <button type="button" onClick={() => status.mutate()} disabled={busy} aria-label={`${active ? 'Deactivate' : 'Activate'} ${mill.millName}`}
            className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 ${active ? 'border-amber-300 text-amber-800 hover:bg-amber-50' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}>
            <Power className="w-3.5 h-3.5" /> {active ? 'Deactivate' : 'Activate'}
          </button>
          <button type="button" onClick={() => onDelete(mill)} disabled={busy} aria-label={`Delete ${mill.millName}`}
            className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
        {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
        <input ref={input} type="file" accept={LOGO_TYPES.join(',')} className="hidden" onChange={onPick}
          aria-label={`${mill.millName} logo file`} />
      </div>
    </div>
  )
}

/** Deleting wipes all of the mill's data, so its name must be typed to confirm (the server checks it too). */
function DeleteMillModal({ mill, onClose }) {
  const qc = useQueryClient()
  const [typed, setTyped] = useState('')
  const del = useMutation({
    mutationFn: () => deleteMill(mill.millId, typed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev-mills'] }); qc.invalidateQueries({ queryKey: ['dev-users'] }); qc.invalidateQueries({ queryKey: ['dev-flags'] })
      onClose()
    },
  })
  const matches = typed.trim() === mill.millName.trim()
  return (
    <Modal title={`Delete ${mill.millName}?`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">This permanently deletes the mill, its admin and operators, farmers, purchases, payments, batches, orders, shipments, GPS history and settings. It cannot be undone.</p>
        <div>
          <label htmlFor="delete-mill-name" className="block text-sm font-medium text-slate-700 mb-1">Type “{mill.millName}” to confirm</label>
          <input id="delete-mill-name" value={typed} autoComplete="off" onChange={e => setTyped(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        {del.isError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{errorMessage(del.error)}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={() => del.mutate()} disabled={!matches || del.isPending}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {del.isPending ? 'Deleting...' : 'Delete mill permanently'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function MillLogosPanel() {
  const [deleting, setDeleting] = useState(null)
  const { data: mills = [], isLoading } = useQuery({ queryKey: ['dev-mills'], queryFn: getDevMills })
  const { data: companies = [] } = useQuery({ queryKey: ['dev-super-admins'], queryFn: getSuperAdmins })
  if (isLoading) return <p className="text-slate-400 text-center py-10">Loading...</p>
  if (!mills.length) return <p className="text-slate-400 text-center py-10">No mills yet. Super admins create mills.</p>
  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">Each super admin is a separate company and sees only the mills it owns. Logos: PNG, JPEG or WebP, up to 1 MB, shown at the top left for the mill's users. A deactivated mill's users are signed out and cannot sign in until it is activated again.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mills.map(m => <MillLogoCard key={m.millId} mill={m} companies={companies} onDelete={setDeleting} />)}
      </div>
      {deleting && <DeleteMillModal key={deleting.millId} mill={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}
