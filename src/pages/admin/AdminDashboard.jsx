import { useState } from 'react'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getMills, createMill, toggleMillStatus, resetMillPassword, getMillStock } from '../../api/mills'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import PasswordReveal from '../../components/PasswordReveal'
import { Plus, RefreshCw, Building2, Phone, Mail, MapPin, Wheat, Package2, ChevronRight } from 'lucide-react'

function StockChip({ label, value, color }) {
  const colors = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return (
    <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs font-medium ${colors[color]}`}>
      <span className="opacity-70">{label}</span>
      <span className="text-base font-bold font-mono">{Number(value || 0).toFixed(1)}</span>
      <span className="opacity-60 text-[10px]">Qtl</span>
    </div>
  )
}

export default function AdminDashboard() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [createdCreds, setCreatedCreds] = useState(null)
  const [resetResult, setResetResult] = useState(null)
  const [form, setForm] = useState({ name: '', location: '', contactPhone: '', contactEmail: '', adminUsername: '', adminFullName: '' })

  const { data: mills = [], isLoading } = useQuery({ queryKey: ['mills'], queryFn: getMills })

  // Fetch stock for every mill in parallel
  const stockQueries = useQueries({
    queries: mills.map(mill => ({
      queryKey: ['mill-stock', mill.id],
      queryFn: () => getMillStock(mill.id),
      staleTime: 30000,
    })),
  })

  const createMutation = useMutation({
    mutationFn: createMill,
    onSuccess: (data) => {
      qc.invalidateQueries(['mills'])
      setShowCreate(false)
      setCreatedCreds(data)
      setForm({ name: '', location: '', contactPhone: '', contactEmail: '', adminUsername: '', adminFullName: '' })
    }
  })

  const toggleMutation = useMutation({
    mutationFn: toggleMillStatus,
    onSuccess: () => qc.invalidateQueries(['mills'])
  })

  const resetMutation = useMutation({
    mutationFn: resetMillPassword,
    onSuccess: (data) => setResetResult(data)
  })

  const handleSubmit = (e) => { e.preventDefault(); createMutation.mutate(form) }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mills Management</h1>
          <p className="text-slate-500 mt-1">Manage all rice mills in the system</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Mill
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400">Loading mills...</div>
      ) : mills.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No mills yet. Click <strong>Add Mill</strong> to create one.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {mills.map((mill, idx) => {
            const stock = stockQueries[idx]?.data
            const stockLoading = stockQueries[idx]?.isLoading
            return (
              <div key={mill.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                {/* Header — clickable to drill into stock */}
                <div
                  className="p-5 cursor-pointer group"
                  onClick={() => navigate(`/admin/mills/${mill.id}/stock`, { state: { millName: mill.name } })}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 rounded-lg p-2">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">{mill.name}</h3>
                        <StatusBadge status={mill.status} />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors mt-1" />
                  </div>

                  {mill.location && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <MapPin className="w-3 h-3" />{mill.location}
                    </div>
                  )}
                  {mill.contactPhone && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <Phone className="w-3 h-3" />{mill.contactPhone}
                    </div>
                  )}
                  {mill.contactEmail && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <Mail className="w-3 h-3" />{mill.contactEmail}
                    </div>
                  )}
                  {mill.adminUsername && (
                    <p className="text-xs text-slate-400 mt-1">
                      Admin: <span className="font-mono font-medium text-slate-600">{mill.adminUsername}</span>
                    </p>
                  )}

                  {/* Stock summary strip */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {stockLoading ? (
                      <p className="text-xs text-slate-400 text-center py-1">Loading stock...</p>
                    ) : stock ? (
                      <div className="flex gap-2 justify-between">
                        <StockChip label="Paddy" value={stock.paddyOnHand} color="amber" />
                        <StockChip label="In Mill" value={stock.paddyInMill} color="blue" />
                        <StockChip label="Rice" value={stock.riceOnHand} color="emerald" />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 text-center">No stock data</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-5 pb-4 mt-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(mill.id) }}
                    className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${
                      mill.status === 'ACTIVE'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}>
                    {mill.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); resetMutation.mutate(mill.id) }}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                    <RefreshCw className="w-3 h-3" /> Reset Password
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <Modal title="Add New Mill" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: 'Mill Name', required: true },
              { key: 'location', label: 'Location' },
              { key: 'contactPhone', label: 'Contact Phone' },
              { key: 'contactEmail', label: 'Contact Email' },
              { key: 'adminUsername', label: 'Admin Username', required: true },
              { key: 'adminFullName', label: 'Admin Full Name' },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}{required && ' *'}</label>
                <input
                  value={form[key]} required={required}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            ))}
            {createMutation.error && (
              <p className="text-red-600 text-sm">{createMutation.error.response?.data?.error || 'Failed to create mill'}</p>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={createMutation.isPending}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {createMutation.isPending ? 'Creating...' : 'Create Mill'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {createdCreds && (
        <Modal title="Mill Created Successfully" onClose={() => setCreatedCreds(null)}>
          <p className="text-slate-600 mb-2 text-sm">
            Mill <strong>{createdCreds.millName}</strong> created.
            Admin: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-sm">{createdCreds.adminUsername}</code>
          </p>
          <PasswordReveal password={createdCreds.generatedPassword} message={createdCreds.message} />
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
