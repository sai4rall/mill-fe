import { useQuery } from '@tanstack/react-query'
import { getStock, getPurchases, getOrders } from '../../../shared/api/mill'
import StockCard from '../../components/StockCard'
import StatusBadge from '../../components/StatusBadge'
import { Wheat, Factory, Package2, TrendingUp, TrendingDown, BarChart } from 'lucide-react'

export default function Dashboard() {
  const { data: stock } = useQuery({ queryKey: ['stock'], queryFn: getStock })
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: getOrders })

  const recentPurchases = purchases.slice(0, 5)
  const pendingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PARTIAL').slice(0, 5)

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StockCard label="Paddy on Hand" value={stock?.paddyOnHand} color="amber" icon={Wheat} />
        <StockCard label="Paddy in Mill" value={stock?.paddyInMill} color="blue" icon={Factory} />
        <StockCard label="Rice on Hand" value={stock?.riceOnHand} color="emerald" icon={Package2} />
        <StockCard label="Total Paddy Purchased" value={stock?.totalPaddyPurchased} color="purple" icon={TrendingUp} />
        <StockCard label="Total Rice Produced" value={stock?.totalRiceProduced} color="emerald" icon={BarChart} />
        <StockCard label="Total Rice Exported" value={stock?.totalRiceExported} color="blue" icon={TrendingDown} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Recent Purchases</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentPurchases.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-8">No purchases yet</p>
            )}
            {recentPurchases.map(p => (
              <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700 text-sm">{p.farmerName}</p>
                  <p className="text-xs text-slate-400">{p.purchaseDate} · {p.weightQuintals} Qtl</p>
                </div>
                <StatusBadge status={p.paymentStatus} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Pending Orders</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingOrders.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-8">No pending orders</p>
            )}
            {pendingOrders.map(o => (
              <div key={o.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700 text-sm">{o.customerName}</p>
                  <p className="text-xs text-slate-400">{o.orderDate} · {o.quantityQuintals} Qtl ordered</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={o.status} />
                  <p className="text-xs text-slate-400 mt-1">{o.remainingQuintals} Qtl remaining</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
