import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPurchases, createPurchase, getFarmers, getPayments } from '../../../shared/api/mill'
import { getMoistureTable } from '../../../shared/api/moisture'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import PaymentPanel from './PaymentPanel'
import { lookupDeduction, priceBreakdown } from '../../../shared/utils/moisture'
import { useFeatures } from '../../../shared/features/useFeatures'
import { Plus, IndianRupee, ShieldCheck } from 'lucide-react'
import { todayISO } from '../../../shared/utils/dates'

const EMPTY_FORM = { farmerId: '', purchaseDate: '', weightQuintals: '', pricePerQuintal: '', moisturePct: '', truckNumber: '', notes: '' }
const rupees = (v) => `₹${Number(v).toFixed(2)}`

export default function Purchases() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [paymentFor, setPaymentFor] = useState(null) // purchase id
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: purchases = [], isLoading } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const { data: farmers = [] } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })
  // Moisture % and its price deduction can be switched off per mill (feature flag "moisture_deduction").
  const moistureOn = useFeatures().flag('moisture_deduction').enabled
  const { data: moisture } = useQuery({ queryKey: ['moisture'], queryFn: getMoistureTable, enabled: moistureOn })
  // Always read the purchase from the list so balances refresh after a payment.
  const paymentModal = purchases.find(p => p.id === paymentFor) || null
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', paymentFor],
    queryFn: () => getPayments(paymentFor),
    enabled: !!paymentFor,
  })

  const createMutation = useMutation({
    mutationFn: (data) => createPurchase(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['stock'] })
      setShowCreate(false); setForm(EMPTY_FORM)
    },
  })

  // Preview only — the server looks the deduction up again when saving.
  const deductionPct = moistureOn ? lookupDeduction(moisture?.ranges, form.moisturePct) : 0
  const { gross, deduction, net } = priceBreakdown(form.weightQuintals, form.pricePerQuintal, deductionPct)
  const farmerVerified = (id) => farmers.find(f => f.id === id)?.phoneVerified

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Paddy Purchases</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> Record Purchase
        </button>
      </div>

      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Farmer', 'Date', 'Truck No.', 'Weight (Qtl)', 'Rate/Qtl', ...(moistureOn ? ['Moisture'] : []), 'Total', 'Paid', 'Due', 'Status', 'Actions'].map(h => (
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
                  {moistureOn && <td className="px-4 py-3 text-slate-700 text-sm font-mono">
                    {p.moisturePct == null ? '—' : (
                      <>{Number(p.moisturePct)}%{Number(p.deductionPct) > 0 && <span className="block text-xs text-amber-700">−{Number(p.deductionPct)}%</span>}</>
                    )}
                  </td>}
                  <td className="px-4 py-3 text-slate-800 text-sm font-semibold font-mono">₹{p.totalAmount}</td>
                  <td className="px-4 py-3 text-emerald-600 text-sm font-mono">₹{p.amountPaid}</td>
                  <td className="px-4 py-3 text-red-500 text-sm font-mono">₹{p.amountDue}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.paymentStatus} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setPaymentFor(p.id)} aria-label={`Pay ${p.farmerName}`}
                      className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1.5 rounded font-medium transition-colors">
                      <IndianRupee className="w-3 h-3" /> Pay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <Modal title="Record Paddy Purchase" onClose={() => setShowCreate(false)}>
          <form onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate({ ...form, farmerId: parseInt(form.farmerId), weightQuintals: parseFloat(form.weightQuintals),
              pricePerQuintal: parseFloat(form.pricePerQuintal), moisturePct: moistureOn ? parseFloat(form.moisturePct) : null })
          }} className="space-y-4">
            <div>
              <label htmlFor="purchase-farmer" className="block text-sm font-medium text-slate-700 mb-1">Farmer *</label>
              <select id="purchase-farmer" value={form.farmerId} required onChange={e => setForm(f => ({ ...f, farmerId: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Select farmer...</option>
                {farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="purchase-date" className="block text-sm font-medium text-slate-700 mb-1">Purchase Date *</label>
              <input id="purchase-date" type="date" max={todayISO()} value={form.purchaseDate} required onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="purchase-weight" className="block text-sm font-medium text-slate-700 mb-1">Weight (Quintals) *</label>
                <input id="purchase-weight" type="number" min="0.01" step="0.01" value={form.weightQuintals} required onChange={e => setForm(f => ({ ...f, weightQuintals: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label htmlFor="purchase-price" className="block text-sm font-medium text-slate-700 mb-1">Price per Quintal ₹ *</label>
                <input id="purchase-price" type="number" min="0.01" step="0.01" value={form.pricePerQuintal} required onChange={e => setForm(f => ({ ...f, pricePerQuintal: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            {moistureOn && <div>
              <label htmlFor="purchase-moisture" className="block text-sm font-medium text-slate-700 mb-1">Moisture % *</label>
              <input id="purchase-moisture" type="number" step="0.01" min="0" max="100" value={form.moisturePct} required
                onChange={e => setForm(f => ({ ...f, moisturePct: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>}
            {moistureOn ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm space-y-1" data-testid="price-breakdown">
              <div className="flex justify-between"><span>Gross amount</span><span className="font-mono">{rupees(gross)}</span></div>
              <div className="flex justify-between text-amber-800">
                <span>Moisture deduction ({deductionPct}%)</span><span className="font-mono">−{rupees(deduction)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-emerald-200 pt-1">
                <span>Net payable</span><strong className="text-emerald-700 font-mono">{rupees(net)}</strong>
              </div>
              {moisture?.source === 'NONE' && <p className="text-xs text-slate-500">No moisture ranges are configured, so no deduction applies.</p>}
            </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm" data-testid="price-breakdown">
                Total Amount: <strong className="text-emerald-700 font-mono">{rupees(gross)}</strong>
              </div>
            )}
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
            {createMutation.isError && (
              <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                {createMutation.error?.response?.data?.error || createMutation.error?.message}
              </p>
            )}
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
        <Modal title={`Payments — ${paymentModal.farmerName}`} onClose={() => setPaymentFor(null)}>
          <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm">
            {paymentModal.deductionPct != null && Number(paymentModal.deductionPct) > 0 && (
              <div className="flex justify-between text-amber-800"><span>Moisture {Number(paymentModal.moisturePct)}% deduction:</span>
                <span className="font-mono">−{Number(paymentModal.deductionPct)}% (₹{paymentModal.deductionAmount})</span></div>
            )}
            <div className="flex justify-between"><span className="text-slate-500">Total:</span><span className="font-mono font-semibold">₹{paymentModal.totalAmount}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Paid:</span><span className="font-mono text-emerald-600">₹{paymentModal.amountPaid}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Due:</span><span className="font-mono text-red-500">₹{paymentModal.amountDue}</span></div>
          </div>

          {payments.length > 0 && (
            <div className="mb-4 divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {payments.map(pay => (
                <div key={pay.id} className="px-4 py-2.5 flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">₹{pay.amount}</span>
                    <span className="text-slate-400">{pay.paymentMode}</span>
                    {pay.otpVerifiedAt && <ShieldCheck className="w-4 h-4 text-emerald-600" aria-label="Confirmed by farmer OTP" />}
                  </div>
                  <span className="text-slate-400">{pay.paymentDate}</span>
                </div>
              ))}
            </div>
          )}

          <PaymentPanel key={paymentModal.id} purchase={paymentModal} farmerVerified={!!farmerVerified(paymentModal.farmerId)} />
        </Modal>
      )}
    </div>
  )
}
