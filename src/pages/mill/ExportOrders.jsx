import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, createOrder, getCustomers, createCustomer, getShipments, createShipment } from '../../api/mill'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { Plus, Truck } from 'lucide-react'

export default function ExportOrders() {
  const qc = useQueryClient()
  const [showOrder, setShowOrder] = useState(false)
  const [showCustomer, setShowCustomer] = useState(false)
  const [shipModal, setShipModal] = useState(null)
  const [orderForm, setOrderForm] = useState({ customerId: '', orderDate: '', riceType: '', quantityQuintals: '', pricePerQuintal: '', notes: '' })
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', address: '', companyName: '' })
  const [shipForm, setShipForm] = useState({ shipmentDate: new Date().toISOString().slice(0, 10), quintalsExported: '', vehicleNumber: '', notes: '' })

  const { data: orders = [], isLoading } = useQuery({ queryKey: ['orders'], queryFn: getOrders })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments', shipModal?.id],
    queryFn: () => getShipments(shipModal.id),
    enabled: !!shipModal,
  })

  const orderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => { qc.invalidateQueries(['orders']); setShowOrder(false) }
  })

  const customerMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => { qc.invalidateQueries(['customers']); setShowCustomer(false) }
  })

  const shipMutation = useMutation({
    mutationFn: createShipment,
    onSuccess: () => { qc.invalidateQueries(['orders']); qc.invalidateQueries(['stock']); qc.invalidateQueries(['shipments', shipModal?.id]) }
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Export Orders</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCustomer(true)}
            className="border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors">
            + Customer
          </button>
          <button onClick={() => setShowOrder(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors">
            <Plus className="w-4 h-4" /> New Order
          </button>
        </div>
      </div>

      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Customer', 'Date', 'Rice Type', 'Ordered (Qtl)', 'Shipped (Qtl)', 'Remaining (Qtl)', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800 text-sm">{o.customerName}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{o.orderDate}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{o.riceType || '—'}</td>
                  <td className="px-4 py-3 text-slate-700 text-sm font-mono">{o.quantityQuintals}</td>
                  <td className="px-4 py-3 text-emerald-600 text-sm font-mono">{o.shippedQuintals}</td>
                  <td className="px-4 py-3 text-amber-600 text-sm font-mono font-semibold">{o.remainingQuintals}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3">
                    {o.status !== 'FULFILLED' && o.status !== 'CANCELLED' && (
                      <button onClick={() => { setShipModal(o); setShipForm({ shipmentDate: new Date().toISOString().slice(0, 10), quintalsExported: '', vehicleNumber: '', notes: '' }) }}
                        className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1.5 rounded font-medium transition-colors">
                        <Truck className="w-3 h-3" /> Ship
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {showOrder && (
        <Modal title="New Export Order" onClose={() => setShowOrder(false)}>
          <form onSubmit={(e) => { e.preventDefault(); orderMutation.mutate({ ...orderForm, customerId: parseInt(orderForm.customerId), quantityQuintals: parseFloat(orderForm.quantityQuintals), pricePerQuintal: orderForm.pricePerQuintal ? parseFloat(orderForm.pricePerQuintal) : null }) }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
              <select value={orderForm.customerId} required onChange={e => setOrderForm(f => ({ ...f, customerId: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Order Date *</label>
                <input type="date" value={orderForm.orderDate} required onChange={e => setOrderForm(f => ({ ...f, orderDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rice Type</label>
                <input value={orderForm.riceType} onChange={e => setOrderForm(f => ({ ...f, riceType: e.target.value }))} placeholder="e.g. Basmati"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity (Qtl) *</label>
                <input type="number" step="0.01" value={orderForm.quantityQuintals} required onChange={e => setOrderForm(f => ({ ...f, quantityQuintals: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price per Qtl ₹</label>
                <input type="number" step="0.01" value={orderForm.pricePerQuintal} onChange={e => setOrderForm(f => ({ ...f, pricePerQuintal: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowOrder(false)}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={orderMutation.isPending}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {orderMutation.isPending ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showCustomer && (
        <Modal title="Add Customer" onClose={() => setShowCustomer(false)}>
          <form onSubmit={(e) => { e.preventDefault(); customerMutation.mutate(customerForm) }} className="space-y-4">
            {[{ key: 'name', label: 'Name', req: true }, { key: 'companyName', label: 'Company' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'address', label: 'Address' }].map(({ key, label, req }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}{req && ' *'}</label>
                <input value={customerForm[key]} required={req} onChange={e => setCustomerForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCustomer(false)}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={customerMutation.isPending}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {customerMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {shipModal && (
        <Modal title={`Ship — ${shipModal.customerName}`} onClose={() => setShipModal(null)}>
          <p className="text-slate-500 text-sm mb-4">Remaining: <strong className="text-amber-600">{shipModal.remainingQuintals} Qtl</strong></p>
          {shipments.length > 0 && (
            <div className="mb-4 divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-sm">
              {shipments.map(s => (
                <div key={s.id} className="px-4 py-2.5 flex justify-between">
                  <div><span className="font-mono font-medium">{s.quintalsExported} Qtl</span> <span className="text-slate-400 ml-2">{s.vehicleNumber}</span></div>
                  <span className="text-slate-400">{s.shipmentDate}</span>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); shipMutation.mutate({ ...shipForm, orderId: shipModal.id, quintalsExported: parseFloat(shipForm.quintalsExported) }) }} className="space-y-3 border-t border-slate-200 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Quintals to Ship *</label>
                <input type="number" step="0.01" value={shipForm.quintalsExported} required onChange={e => setShipForm(f => ({ ...f, quintalsExported: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Shipment Date *</label>
                <input type="date" value={shipForm.shipmentDate} required onChange={e => setShipForm(f => ({ ...f, shipmentDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle Number</label>
              <input value={shipForm.vehicleNumber} onChange={e => setShipForm(f => ({ ...f, vehicleNumber: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <button type="submit" disabled={shipMutation.isPending}
              className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {shipMutation.isPending ? 'Shipping...' : 'Record Shipment'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
