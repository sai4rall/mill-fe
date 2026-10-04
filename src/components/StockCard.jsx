export default function StockCard({ label, value, unit = 'Qtl', color = 'emerald', icon: Icon }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{label}</span>
        {Icon && <Icon className="w-5 h-5 opacity-60" />}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold">{Number(value || 0).toFixed(2)}</span>
        <span className="text-sm font-medium mb-1 opacity-70">{unit}</span>
      </div>
    </div>
  )
}
