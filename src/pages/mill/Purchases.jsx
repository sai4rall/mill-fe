import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPurchases, createPurchase, getFarmers, getPayments, createPayment } from '../../api/mill'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { Plus, IndianRupee } from 'lucide-react'

export default function Purchases() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [paymentModal, setPaymentModal] = useState(null)
  const [form, setForm] = useState({ farmerId: '', purchaseDate: '', weightQuintals: '', pricePerQuintal: '', truckNumber: '', notes: '' })
  const [payForm, setPayForm] = useState({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), paymentMode: 'CASH', referenceNumber: '', notes: '' })

  const { data: purchases = [], isLoading } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const { data: farmers = [] } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', paymentModal?.id],
    queryFn: () => getPayments(paymentModal.id),
    enabled: !!paymentModal,
  })

  const createMutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => { qc.invalidateQueries(['purchases']); qc.invalidateQueries(['stock']); setShowCreate(false) }
  })

  const payMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => { qc.invalidateQueries(['purchases']); qc.invalidateQueries(['payments', paymentModal?.id]) }
  })

  const total = form.weightQuintals && form.pricePerQuintal
    ? (parseFloat(form.weightQuintals) * parseFloat(form.pricePerQuintal)).toFixed(2) : '0.00'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Paddy Purchases</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> Record Purchase
        </button>
      </div>

      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Farmer', 'Date', 'Truck No.', 'Weight (Qtl)', 'Rate/Qtl', 'Total', 'Paid', 'Due', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800 text-sm">{p.farmerName}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{p.purchaseDate}</td>
                  <td className="px-4 py-3 text-slate-700 text-sm font-mono">{p.truckNumber || '—'}</td>
                  <td className="px-4 py-3 text-slate-700 text-sm font-mono">{p.weightQuintals}</td>
                  <td className="px-4 py-3 text-slate-700 text-sm font-mono">₹{p.pricePerQuintal}</td>
                  <td className="px-4 py-3 text-slate-800 text-sm font-semibold font-mono">₹{p.totalAmount}</td>
                  <td className="px-4 py-3 text-emerald-600 text-sm font-mono">₹{p.amountPaid}</td>
                  <td className="px-4 py-3 text-red-500 text-sm font-mono">₹{p.amountDue}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.paymentStatus} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setPaymentModal(p)}
                      className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1.5 rounded font-medium transition-colors">
                      <IndianRupee className="w-3 h-3" /> Pay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <Modal title="Record Paddy Purchase" onClose={() => setShowCreate(false)}>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, farmerId: parseInt(form.farmerId), weightQuintals: parseFloat(form.weightQuintals), pricePerQuintal: parseFloat(form.pricePerQuintal) }) }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Farmer *</label>
              <select value={form.farmerId} required onChange={e => setForm(f => ({ ...f, farmerId: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Select farmer...</option>
                {farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date *</label>
              <input type="date" value={form.purchaseDate} required onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Weight (Quintals) *</label>
                <input type="number" step="0.01" value={form.weightQuintals} required onChange={e => setForm(f => ({ ...f, weightQuintals: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price per Quintal ₹ *</label>
                <input type="number" step="0.01" value={form.pricePerQuintal} required onChange={e => setForm(f => ({ ...f, pricePerQuintal: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm">
              Total Amount: <strong className="text-emerald-700 font-mono">₹{total}</strong>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Truck Number</label>
              <input value={form.truckNumber} onChange={e => setForm(f => ({ ...f, truckNumber: e.target.value.toUpperCase() }))}
                placeholder="e.g. AP07CD1234"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <p className="text-xs text-slate-400 mt-1">Used for GPS truck tracking on the Truck Tracking screen.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={createMutation.isPending}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {createMutation.isPending ? 'Recording...' : 'Record Purchase'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {paymentModal && (
        <Modal title={`Payments — ${paymentModal.farmerName}`} onClose={() => setPaymentModal(null)}>
          <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Total:</span><span className="font-mono font-semibold">₹{paymentModal.totalAmount}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Paid:</span><span className="font-mono text-emerald-600">₹{paymentModal.amountPaid}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Due:</span><span className="font-mono text-red-500">₹{paymentModal.amountDue}</span></div>
          </div>

          {payments.length > 0 && (
            <div className="mb-4 divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {payments.map(pay => (
                <div key={pay.id} className="px-4 py-2.5 flex justify-between text-sm">
                  <div>
                    <span className="font-medium text-slate-700">₹{pay.amount}</span>
                    <span className="text-slate-400 ml-2">{pay.paymentMode}</span>
                  </div>
                  <span className="text-slate-400">{pay.paymentDate}</span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault()
            payMutation.mutate({ ...payForm, purchaseId: paymentModal.id, amount: parseFloat(payForm.amount) })
          }} className="space-y-3 border-t border-slate-200 pt-4">
            <h3 className="font-medium text-slate-700 text-sm">Add Payment</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Amount ₹ *</label>
                <input type="number" step="0.01" value={payForm.amount} required onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
                <input type="date" value={payForm.paymentDate} required onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mode</label>
                <select value={payForm.paymentMode} onChange={e => setPayForm(f => ({ ...f, paymentMode: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  {['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ref No.</label>
                <input value={payForm.referenceNumber} onChange={e => setPayForm(f => ({ ...f, referenceNumber: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <button type="submit" disabled={payMutation.isPending}
              className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {payMutation.isPending ? 'Adding...' : 'Add Payment'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
