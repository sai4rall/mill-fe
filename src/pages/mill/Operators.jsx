import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOperators, createOperator, toggleOperatorStatus, resetOperatorPassword } from '../../api/mill'
import Modal from '../../components/Modal'
import PasswordReveal from '../../components/PasswordReveal'
import { Plus, RefreshCw, UserCheck, UserX } from 'lucide-react'

export default function Operators() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [createdCreds, setCreatedCreds] = useState(null)
  const [resetResult, setResetResult] = useState(null)
  const [form, setForm] = useState({ username: '', fullName: '' })

  const { data: operators = [], isLoading } = useQuery({ queryKey: ['operators'], queryFn: getOperators })

  const createMutation = useMutation({
    mutationFn: createOperator,
    onSuccess: (data) => { qc.invalidateQueries(['operators']); setShowCreate(false); setCreatedCreds(data) }
  })

  const toggleMutation = useMutation({
    mutationFn: toggleOperatorStatus,
    onSuccess: () => qc.invalidateQueries(['operators'])
  })

  const resetMutation = useMutation({
    mutationFn: resetOperatorPassword,
    onSuccess: (data) => setResetResult(data)
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Operators</h1>
        <button onClick={() => { setForm({ username: '', fullName: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add Operator
        </button>
      </div>

      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {operators.length === 0 ? (
            <p className="text-slate-400 text-center py-16">No operators yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Username', 'Full Name', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operators.map(op => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-slate-800 text-sm font-medium">{op.username}</td>
                    <td className="px-5 py-3 text-slate-600 text-sm">{op.fullName || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${op.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {op.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => toggleMutation.mutate(op.id)}
                          className={`p-1.5 rounded transition-colors ${op.active ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                          {op.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button onClick={() => resetMutation.mutate(op.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <Modal title="Add Operator" onClose={() => setShowCreate(false)}>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
              <input value={form.username} required onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={createMutation.isPending}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {createMutation.isPending ? 'Creating...' : 'Create Operator'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {createdCreds && (
        <Modal title="Operator Created" onClose={() => setCreatedCreds(null)}>
          <p className="text-slate-600 mb-2 text-sm">Username: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono">{createdCreds.username}</code></p>
          <PasswordReveal password={createdCreds.generatedPassword} />
          <button onClick={() => setCreatedCreds(null)}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 mt-2 text-sm">Done</button>
        </Modal>
      )}

      {resetResult && (
        <Modal title="Password Reset" onClose={() => setResetResult(null)}>
          <PasswordReveal password={resetResult.generatedPassword} message={resetResult.message} />
          <button onClick={() => setResetResult(null)}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 mt-2 text-sm">Done</button>
        </Modal>
      )}
    </div>
  )
}
