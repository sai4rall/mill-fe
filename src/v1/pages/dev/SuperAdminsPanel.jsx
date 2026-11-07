import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { getSuperAdmins, createSuperAdmin, toggleSuperAdmin, resetSuperAdminPassword, deleteSuperAdmin } from '../../../shared/api/dev'
import Modal from '../../components/Modal'
import PasswordReveal from '../../components/PasswordReveal'
import { errorMessage } from './errorMessage'
import { validateSuperAdmin } from '../../../shared/utils/devValidation'

export default function SuperAdminsPanel() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null) // null = closed
  const [errors, setErrors] = useState({})
  const [reveal, setReveal] = useState(null) // { title, password, message }

  const { data: admins = [], isLoading } = useQuery({ queryKey: ['dev-super-admins'], queryFn: getSuperAdmins })
  const refresh = () => qc.invalidateQueries({ queryKey: ['dev-super-admins'] })

  const create = useMutation({
    mutationFn: (data) => createSuperAdmin(data),
    onSuccess: (created) => {
      setForm(null); refresh()
      setReveal({ title: 'Super admin created', password: created.generatedPassword,
        message: `Password for ${created.username} — save it now, it will not be shown again.` })
    },
  })
  const [deleting, setDeleting] = useState(null)
  const toggle = useMutation({ mutationFn: (id) => toggleSuperAdmin(id), onSuccess: refresh })
  const del = useMutation({
    mutationFn: (a) => deleteSuperAdmin(a.id),
    onSuccess: () => { setDeleting(null); refresh(); qc.invalidateQueries({ queryKey: ['dev-users'] }) },
    onError: () => setDeleting(null),
  })
  const reset = useMutation({
    mutationFn: ({ id }) => resetSuperAdminPassword(id),
    onSuccess: ({ generatedPassword }, { username }) =>
      setReveal({ title: 'Password reset', password: generatedPassword,
        message: `New password for ${username} — save it now, it will not be shown again.` }),
  })

  const openCreate = () => { setErrors({}); create.reset(); setForm({ username: '', fullName: '' }) }
  const submit = (e) => {
    e.preventDefault()
    const found = validateSuperAdmin(form)
    setErrors(found)
    if (Object.keys(found).length) return
    create.mutate({ username: form.username.trim(), fullName: form.fullName.trim() || null })
  }

  const actionError = toggle.error || reset.error || del.error
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm">
          <Plus className="w-4 h-4" /> Add Super Admin
        </button>
      </div>
      {actionError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{errorMessage(actionError)}</p>}

      {isLoading ? <p className="text-slate-400 text-center py-10">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Username', 'Full name', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map(a => (
                <tr key={a.id}>
                  <td className="px-5 py-3 text-sm font-medium text-slate-800">{a.username}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">{a.fullName || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {a.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => toggle.mutate(a.id)} disabled={toggle.isPending}
                        aria-label={`${a.active ? 'Disable' : 'Enable'} ${a.username}`}
                        className="text-sm border border-slate-300 px-3 py-1 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                        {a.active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => reset.mutate({ id: a.id, username: a.username })} disabled={reset.isPending}
                        aria-label={`Reset password for ${a.username}`}
                        className="flex items-center gap-1 text-sm border border-slate-300 px-3 py-1 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                        <RefreshCw className="w-3.5 h-3.5" /> Reset password
                      </button>
                      <button onClick={() => setDeleting(a)} aria-label={`Delete ${a.username}`}
                        className="flex items-center gap-1 text-sm border border-red-200 text-red-600 px-3 py-1 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {form && (
        <Modal title="Add Super Admin" onClose={() => setForm(null)}>
          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <label htmlFor="sa-username" className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
              <input id="sa-username" value={form.username} maxLength={50} autoComplete="off"
                aria-invalid={!!errors.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className={inputCls} />
              {errors.username && <p role="alert" className="text-xs text-red-600 mt-1">{errors.username}</p>}
            </div>
            <div>
              <label htmlFor="sa-fullname" className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
              <input id="sa-fullname" value={form.fullName} maxLength={100}
                aria-invalid={!!errors.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className={inputCls} />
              {errors.fullName && <p role="alert" className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
            </div>
            {create.isError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{errorMessage(create.error)}</p>}
            <p className="text-xs text-slate-400">A password is generated and shown once after creating.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setForm(null)}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={create.isPending}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {create.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title={`Delete ${deleting.username}?`} onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-600 mb-4">The account (company) is removed permanently and its sessions stop working. A super admin who still owns mills cannot be deleted: delete or reassign those mills first. To block access temporarily, use Disable instead.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setDeleting(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => del.mutate(deleting)} disabled={del.isPending}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">{del.isPending ? 'Deleting...' : 'Delete'}</button>
          </div>
        </Modal>
      )}

      {reveal && (
        <Modal title={reveal.title} onClose={() => setReveal(null)}>
          <PasswordReveal password={reveal.password} message={reveal.message} />
          <button onClick={() => setReveal(null)}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 mt-2 text-sm">Done</button>
        </Modal>
      )}
    </div>
  )
}
