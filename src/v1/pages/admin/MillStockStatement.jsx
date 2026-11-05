import { useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMillStock, getMillStockStatement } from '../../../shared/api/mills'
import { downloadStockExcel, exportStockPdf } from '../../../shared/utils/stockExport'
import StockCard from '../../components/StockCard'
import { ArrowLeft, Wheat, Factory, Package2, TrendingUp, TrendingDown, BarChart, FileSpreadsheet, FileText, Calendar } from 'lucide-react'
import { todayISO } from '../../../shared/utils/dates'

const QUICK_RANGES = [
  { label: 'Last 2 days', days: 2 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
]

function toISO(date) { return date.toISOString().slice(0, 10) }

function MovementTable({ movements, inLabel, outLabel }) {
  if (!movements?.length) {
    return <p className="text-slate-400 text-sm text-center py-10">No movements in this period.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {['Date', 'Type', 'Description', `${inLabel} (Qtl)`, `${outLabel} (Qtl)`, 'Balance (Qtl)'].map(h => (
              <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide ${h.includes('Qtl') ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {movements.map((m, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{m.date}</td>
              <td className="px-4 py-2.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  m.type === 'PADDY_IN' || m.type === 'RICE_IN'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {m.type.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">{m.description}</td>
              <td className="px-4 py-2.5 text-right text-emerald-600 font-mono font-medium">
                {m.quantityIn != null ? Number(m.quantityIn).toFixed(2) : '—'}
              </td>
              <td className="px-4 py-2.5 text-right text-red-500 font-mono font-medium">
                {m.quantityOut != null ? Number(m.quantityOut).toFixed(2) : '—'}
              </td>
              <td className={`px-4 py-2.5 text-right font-mono font-bold ${Number(m.runningBalance) < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {Number(m.runningBalance).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 border-t-2 border-slate-300">
          <tr>
            <td colSpan={3} className="px-4 py-2.5 text-xs font-bold text-slate-600 uppercase">Total</td>
            <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
              {movements.reduce((s, m) => s + (Number(m.quantityIn) || 0), 0).toFixed(2)}
            </td>
            <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600">
              {movements.reduce((s, m) => s + (Number(m.quantityOut) || 0), 0).toFixed(2)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function MillStockStatement() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const millName = state?.millName || `Mill #${id}`

  const [activeTab, setActiveTab] = useState('summary')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const applyQuickRange = (days) => {
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - days + 1)
    setFromDate(toISO(from))
    setToDate(toISO(to))
  }

  const { data: stock, isLoading: summaryLoading } = useQuery({
    queryKey: ['mill-stock', Number(id)],
    queryFn: () => getMillStock(id),
    refetchInterval: 30000,
  })

  const { data: statement, isLoading: stmtLoading } = useQuery({
    queryKey: ['mill-statement', Number(id), fromDate, toDate],
    queryFn: () => getMillStockStatement(id, fromDate || undefined, toDate || undefined),
    enabled: activeTab === 'statement',
  })

  const handleExcelDownload = () => downloadStockExcel(id, millName, fromDate, toDate)
  const handlePdfExport = () => exportStockPdf({ millName, tab: activeTab, stock, statement, fromDate, toDate })

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{millName}</h1>
            <p className="text-slate-500 text-sm mt-0.5">Stock Management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePdfExport}
            className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button onClick={handleExcelDownload}
            className="flex items-center gap-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
        {[{ key: 'summary', label: 'Stock Summary' }, { key: 'statement', label: 'Stock Statement' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range filter bar — statement tab only */}
      {activeTab === 'statement' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex flex-wrap items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex gap-2 flex-wrap">
            {QUICK_RANGES.map(r => (
              <button key={r.days} onClick={() => applyQuickRange(r.days)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" max={toDate || todayISO()} value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <span className="text-slate-400 text-sm">to</span>
            <input type="date" min={fromDate || undefined} max={todayISO()} value={toDate} onChange={e => setToDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate('') }}
                className="text-xs text-slate-400 hover:text-red-500 underline transition-colors">Clear</button>
            )}
          </div>
          {(fromDate || toDate) && (
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {fromDate || '...'} → {toDate || 'Today'}
            </span>
          )}
        </div>
      )}

      {/* ── SUMMARY TAB ── */}
      {activeTab === 'summary' && (
        summaryLoading
          ? <div className="text-center py-20 text-slate-400">Loading...</div>
          : stock && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <StockCard label="Paddy on Hand"        value={stock.paddyOnHand}         color="amber"   icon={Wheat} />
                <StockCard label="Paddy in Mill"        value={stock.paddyInMill}          color="blue"    icon={Factory} />
                <StockCard label="Rice on Hand"         value={stock.riceOnHand}           color="emerald" icon={Package2} />
                <StockCard label="Total Paddy Purchased" value={stock.totalPaddyPurchased} color="purple"  icon={TrendingUp} />
                <StockCard label="Total Rice Produced"  value={stock.totalRiceProduced}    color="emerald" icon={BarChart} />
                <StockCard label="Total Rice Exported"  value={stock.totalRiceExported}    color="blue"    icon={TrendingDown} />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="font-semibold text-slate-800">Stock Ledger</h2>
                  <span className="text-xs text-slate-400">Auto-refreshes every 30 s</span>
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
                    {[
                      { label: 'Total Paddy Purchased', value: stock.totalPaddyPurchased, desc: 'Cumulative paddy bought from all farmers', bold: false },
                      { label: 'Paddy Used in Batches', value: (parseFloat(stock.totalPaddyPurchased || 0) - parseFloat(stock.paddyOnHand || 0)).toFixed(2), desc: 'Paddy sent to mill (completed + in-progress)', bold: false },
                      { label: 'Paddy on Hand', value: stock.paddyOnHand, desc: 'Purchased paddy not yet sent to the mill', bold: true },
                      { label: 'Paddy Currently in Mill', value: stock.paddyInMill, desc: 'Paddy in IN_PROGRESS batches', bold: false },
                      { label: 'Total Rice Produced', value: stock.totalRiceProduced, desc: 'Actual output from all COMPLETED batches', bold: false },
                      { label: 'Total Rice Exported', value: stock.totalRiceExported, desc: 'Total rice shipped to customers', bold: false },
                      { label: 'Rice on Hand', value: stock.riceOnHand, desc: 'Rice produced − rice exported', bold: true },
                    ].map((row, i) => (
                      <tr key={i} className={`hover:bg-slate-50 ${row.bold ? 'bg-slate-50/60' : ''}`}>
                        <td className={`px-6 py-3 text-sm text-slate-800 ${row.bold ? 'font-semibold' : ''}`}>{row.label}</td>
                        <td className="px-6 py-3 text-sm text-slate-400">{row.desc}</td>
                        <td className={`px-6 py-3 text-right font-mono text-sm text-slate-800 ${row.bold ? 'font-bold' : ''}`}>{Number(row.value || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            </>
          )
      )}

      {/* ── STATEMENT TAB ── */}
      {activeTab === 'statement' && (
        stmtLoading
          ? <div className="text-center py-20 text-slate-400">Loading statement...</div>
          : statement && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
                  <Wheat className="w-4 h-4 text-amber-600" />
                  <h2 className="font-semibold text-amber-800">Paddy Stock Statement</h2>
                  <span className="ml-auto text-xs text-amber-600 font-medium bg-amber-100 px-2 py-0.5 rounded-full">
                    {statement.paddyMovements?.length || 0} entries
                  </span>
                </div>
                <MovementTable movements={statement.paddyMovements} inLabel="Paddy In" outLabel="Paddy Out" />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50 flex items-center gap-2">
                  <Package2 className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-semibold text-emerald-800">Rice Stock Statement</h2>
                  <span className="ml-auto text-xs text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-full">
                    {statement.riceMovements?.length || 0} entries
                  </span>
                </div>
                <MovementTable movements={statement.riceMovements} inLabel="Rice In" outLabel="Rice Out" />
              </div>
            </div>
          )
      )}
    </div>
  )
}
