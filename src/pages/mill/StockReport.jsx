import { useQuery } from '@tanstack/react-query'
import { getStock } from '../../api/mill'
import StockCard from '../../components/StockCard'
import { Wheat, Factory, Package2, TrendingUp, TrendingDown, BarChart } from 'lucide-react'

export default function StockReport() {
  const { data: stock, isLoading } = useQuery({ queryKey: ['stock'], queryFn: getStock, refetchInterval: 30000 })

  const rows = [
    { label: 'Total Paddy Purchased', value: stock?.totalPaddyPurchased, desc: 'Cumulative paddy bought from all farmers' },
    { label: 'Paddy Used in Batches', value: (parseFloat(stock?.totalPaddyPurchased || 0) - parseFloat(stock?.paddyOnHand || 0)).toFixed(2), desc: 'Paddy sent to mill (completed + in-progress)' },
    { label: 'Paddy on Hand', value: stock?.paddyOnHand, desc: 'Purchased paddy not yet sent to mill' },
    { label: 'Paddy Currently in Mill', value: stock?.paddyInMill, desc: 'In in-progress batches' },
    { label: 'Total Rice Produced', value: stock?.totalRiceProduced, desc: 'From completed mill batches' },
    { label: 'Total Rice Exported', value: stock?.totalRiceExported, desc: 'Total shipped to customers' },
    { label: 'Rice on Hand', value: stock?.riceOnHand, desc: 'Produced − exported' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Stock Report</h1>

      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <StockCard label="Paddy on Hand" value={stock?.paddyOnHand} color="amber" icon={Wheat} />
            <StockCard label="Paddy in Mill" value={stock?.paddyInMill} color="blue" icon={Factory} />
            <StockCard label="Rice on Hand" value={stock?.riceOnHand} color="emerald" icon={Package2} />
            <StockCard label="Total Paddy Purchased" value={stock?.totalPaddyPurchased} color="purple" icon={TrendingUp} />
            <StockCard label="Total Rice Produced" value={stock?.totalRiceProduced} color="emerald" icon={BarChart} />
            <StockCard label="Total Rice Exported" value={stock?.totalRiceExported} color="blue" icon={TrendingDown} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Stock Ledger</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Line Item</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Quantity (Qtl)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.label} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800 text-sm">{r.label}</td>
                    <td className="px-6 py-3 text-slate-400 text-sm">{r.desc}</td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-slate-800 text-sm">{Number(r.value || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
