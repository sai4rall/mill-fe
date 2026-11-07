import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Search } from 'lucide-react'
import { getAllUsers, resetUserPassword } from '../../../shared/api/dev'
import { useAuth } from '../../../shared/context/AuthContext'
import Modal from '../../components/Modal'
import PasswordReveal from '../../components/PasswordReveal'
import { errorMessage } from './errorMessage'

const roleLabel = (r) => (r ? r.charAt(0) + r.slice(1).toLowerCase().replaceAll('_', ' ') : '')

/** Every account in the system: the dev admin can reset anyone's password except their own (use Change password). */
export default function AccountsPanel() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [reveal, setReveal] = useState(null)
  const { data: accounts = [], isLoading, error } = useQuery({ queryKey: ['dev-users'], queryFn: getAllUsers })
  const reset = useMutation({
    mutationFn: (a) => resetUserPassword(a.id),
    onSuccess: ({ generatedPassword }, a) => {
      setConfirm(null); qc.invalidateQueries({ queryKey: ['dev-users'] })
      setReveal({ password: generatedPassword, message: `New password for ${a.username}. They are signed out everywhere. Save it now, it will not be shown again.` })
    },
  })
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? accounts.filter(a => [a.username, a.fullName, a.millName, a.role].some(v => v?.toLowerCase().includes(q))) : accounts
  }, [accounts, query])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative w-full sm:w-80">
          <span className="sr-only">Search accounts</span>
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Username, name, mill or role"
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </label>
        <p className="text-xs text-slate-400">{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</p>
      </div>
      {(error || reset.error) && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{errorMessage(error || reset.error)}</p>}

      {isLoading ? <p className="text-slate-400 text-center py-10">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Username', 'Role', 'Mill', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map(a => (
                  <tr key={a.id}>
                    <td className="px-5 py-3 text-sm"><p className="font-medium text-slate-800">{a.username}</p>{a.fullName && a.fullName !== a.username && <p className="text-xs text-slate-400">{a.fullName}</p>}</td>
                    <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{roleLabel(a.role)}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{a.millName || '—'}{a.millStatus === 'INACTIVE' && <span className="ml-1 text-xs text-amber-700">(inactive)</span>}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{a.active ? 'Active' : 'Disabled'}</span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {a.username === user?.username
                        ? <span className="text-xs text-slate-400">You · use Change password</span>
                        : (
                          <button onClick={() => setConfirm(a)} aria-label={`Reset password for ${a.username}`}
                            className="inline-flex items-center gap-1 text-sm border border-slate-300 px-3 py-1 rounded-lg hover:bg-slate-50">
                            <RefreshCw className="w-3.5 h-3.5" /> Reset password
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No accounts match.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirm && (
        <Modal title={`Reset password for ${confirm.username}?`} onClose={() => setConfirm(null)}>
          <p className="text-sm text-slate-600 mb-4">A new password is generated and shown once. They are signed out of every device and must use the new password.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setConfirm(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => reset.mutate(confirm)} disabled={reset.isPending}
              className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">{reset.isPending ? 'Resetting...' : 'Reset password'}</button>
          </div>
        </Modal>
      )}
      {reveal && (
        <Modal title="Password reset" onClose={() => setReveal(null)}>
          <PasswordReveal password={reveal.password} message={reveal.message} />
          <button onClick={() => setReveal(null)} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 mt-2 text-sm">Done</button>
        </Modal>
      )}
    </div>
  )
}
