import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFarmers, createFarmer, updateFarmer, deleteFarmer } from '../../api/mill'
import Modal from '../../components/Modal'
import { Plus, Pencil, Trash2, User } from 'lucide-react'

const EMPTY = { name: '', phone: '', address: '', bankAccount: '', bankName: '', ifscCode: '' }

export default function Farmers() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const { data: farmers = [], isLoading } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })

  const saveMutation = useMutation({
    mutationFn: modal?.id ? d => updateFarmer(modal.id, d) : createFarmer,
    onSuccess: () => { qc.invalidateQueries(['farmers']); setModal(null) }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFarmer,
    onSuccess: () => qc.invalidateQueries(['farmers'])
  })

  const openCreate = () => { setForm(EMPTY); setModal({}) }
  const openEdit = (f) => {
    setForm({ name: f.name, phone: f.phone || '', address: f.address || '', bankAccount: f.bankAccount || '', bankName: f.bankName || '', ifscCode: f.ifscCode || '' })
    setModal({ id: f.id })
  }

  const handleSubmit = (e) => { e.preventDefault(); saveMutation.mutate(form) }

  const fields = [
    { key: 'name', label: 'Full Name', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'bankAccount', label: 'Bank Account No.' },
    { key: 'bankName', label: 'Bank Name' },
    { key: 'ifscCode', label: 'IFSC Code' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Farmers</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Farmer
        </button>
      </div>

      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {farmers.length === 0 ? (
            <div className="text-center py-16">
              <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">No farmers added yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Name', 'Phone', 'Bank Account', 'Bank Name', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {farmers.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800 text-sm">{f.name}</td>
                    <td className="px-5 py-3 text-slate-500 text-sm">{f.phone || '—'}</td>
                    <td className="px-5 py-3 text-slate-500 text-sm font-mono">{f.bankAccount || '—'}</td>
                    <td className="px-5 py-3 text-slate-500 text-sm">{f.bankName || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(f)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm('Delete this farmer?')) deleteMutation.mutate(f.id) }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Edit Farmer' : 'Add Farmer'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}{required && ' *'}</label>
                <input value={form[key]} required={required}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saveMutation.isPending}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
