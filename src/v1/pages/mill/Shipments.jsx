import { useQuery } from '@tanstack/react-query'
import { Truck } from 'lucide-react'
import { getAllShipments } from '../../../shared/api/mill'
import { shipmentTotals } from '../../../shared/utils/gps'

/** Every shipment of the mill, newest first. Shipments are recorded from Export Orders. */
export default function Shipments() {
  const { data: shipments = [], isLoading } = useQuery({ queryKey: ['shipments-all'], queryFn: getAllShipments })
  const totals = shipmentTotals(shipments)
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-100 rounded-lg p-2"><Truck className="w-5 h-5 text-emerald-600" /></div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Shipments</h1>
          <p className="text-sm text-slate-500">{totals.count} shipments · {totals.quintals.toFixed(2)} Qtl exported. Record new ones from Export Orders.</p>
        </div>
      </div>
      {isLoading ? <p className="text-slate-400">Loading…</p> : shipments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">No shipments yet</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>{['Date', 'Customer', 'Rice type', 'Quintals', 'Vehicle', 'Notes'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shipments.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{s.shipmentDate}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{s.customerName || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.riceType || '—'}</td>
                  <td className="px-4 py-3 font-semibold">{s.quintalsExported} Qtl</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.vehicleNumber || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
