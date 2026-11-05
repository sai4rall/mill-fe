import { useState } from 'react'
import { Package, ShoppingCart, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { getOrders, getPurchases, getStock } from '../../shared/api/mill'
import { useAuth } from '../../shared/context/AuthContext'
import { EmptyState, NumberTicker, StatusChip } from '../kit/display'
import StatTile from '../kit/StatTile'
import { STOCK_TILES } from '../kit/Stock'
import { cx, greeting } from '../lib/format'
import { hoverLift, rise } from '../lib/motion'

const PAY = [{ id: 'PAID', label: 'Paid', color: '#059669' }, { id: 'PARTIAL', label: 'Partial', color: '#3b82f6' }, { id: 'PENDING', label: 'Pending', color: '#f59e0b' }]

function Tile({ title, subtitle, className, children }) {
  return (
    <motion.section variants={rise} {...hoverLift} className={cx('rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)}>
      <div className="mb-4"><h2 className="font-bold">{title}</h2>{subtitle && <p className="text-xs text-muted">{subtitle}</p>}</div>
      {children}
    </motion.section>
  )
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg"><p className="font-semibold">{label}</p>{payload.map(p => <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(2)} Qtl</p>)}</div>
}

export default function Dashboard() {
  const { user } = useAuth()
  const [now] = useState(() => new Date())
  const { data: stock } = useQuery({ queryKey: ['stock'], queryFn: getStock })
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: getOrders })

  const recent = purchases.slice(0, 5)
  const open = orders.filter(o => o.status === 'PENDING' || o.status === 'PARTIAL')
  const flow = [
    { stage: 'Purchased', Paddy: Number(stock?.totalPaddyPurchased || 0) },
    { stage: 'On hand', Paddy: Number(stock?.paddyOnHand || 0) },
    { stage: 'In mill', Paddy: Number(stock?.paddyInMill || 0) },
    { stage: 'Produced', Rice: Number(stock?.totalRiceProduced || 0) },
    { stage: 'Exported', Rice: Number(stock?.totalRiceExported || 0) },
    { stage: 'Rice stock', Rice: Number(stock?.riceOnHand || 0) },
  ]
  const pie = PAY.map(s => ({ ...s, value: purchases.filter(p => p.paymentStatus === s.id).length })).filter(s => s.value > 0)
  const due = purchases.reduce((t, p) => t + Number(p.amountDue || 0), 0)
  const [paddy, inMill, rice, ...totals] = STOCK_TILES

  return (
    <div className="grid auto-rows-[minmax(140px,auto)] gap-4 md:grid-cols-4">
      {/* Hero */}
      <motion.section variants={rise} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-6 text-white shadow-xl shadow-emerald-900/20 md:col-span-2 md:row-span-2 sm:p-8">
        <div className="v4-sheen pointer-events-none absolute inset-0" />
        <motion.div aria-hidden className="pointer-events-none absolute -right-16 -bottom-16 size-72 rounded-full bg-lime-300/30 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="relative flex h-full flex-col justify-between gap-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur"><Sparkles className="size-3.5" />{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting(now)},<br />{user?.fullName || user?.username}</h1>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div><p className="text-xs text-emerald-100/80">Outstanding to farmers</p><p className="text-2xl font-bold"><NumberTicker value={due} prefix="₹" /></p></div>
            <div><p className="text-xs text-emerald-100/80">Open export orders</p><p className="text-2xl font-bold"><NumberTicker value={open.length} decimals={0} /></p></div>
          </div>
        </div>
      </motion.section>

      <StatTile big label={paddy.label} value={stock?.paddyOnHand} icon={paddy.icon} tone={paddy.tone} />
      <StatTile big label={rice.label} value={stock?.riceOnHand} icon={rice.icon} tone={rice.tone} />
      <StatTile label={inMill.label} value={stock?.paddyInMill} icon={inMill.icon} tone={inMill.tone} />
      <StatTile label={totals[0].label} value={stock?.[totals[0].key]} icon={totals[0].icon} tone={totals[0].tone} />

      <Tile title="Paddy to rice flow" subtitle="Quintals at each stage" className="md:col-span-3 md:row-span-2">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flow} margin={{ left: -16, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted)' }} width={52} />
              <Tooltip cursor={{ fill: 'var(--surface-secondary)' }} content={<ChartTip />} />
              <Bar dataKey="Paddy" stackId="q" fill="#f59e0b" radius={[10, 10, 4, 4]} animationDuration={900} />
              <Bar dataKey="Rice" stackId="q" fill="#059669" radius={[10, 10, 4, 4]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Tile>

      <Tile title="Payments" subtitle="Purchases by status" className="md:row-span-2">
        {pie.length === 0 ? <p className="py-12 text-center text-sm text-muted">No purchases yet</p> : (
          <>
            <div className="relative h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="95%" paddingAngle={3} cornerRadius={8} stroke="none" animationDuration={900}>
                    {pie.map(d => <Cell key={d.id} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold">{purchases.length}</span><span className="text-xs text-muted">purchases</span></div>
            </div>
            <ul className="mt-3 grid gap-1.5">{pie.map(d => <li key={d.id} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: d.color }} />{d.label}</span><span className="font-semibold">{d.value}</span></li>)}</ul>
          </>
        )}
      </Tile>

      <Tile title="Recent purchases" className="md:col-span-2">
        {recent.length === 0 ? <EmptyState icon={ShoppingCart} title="No purchases yet" /> : (
          <ul className="divide-y divide-border">
            {recent.map((p, i) => (
              <motion.li key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{p.farmerName}</p><p className="text-xs text-muted">{p.purchaseDate} · {p.weightQuintals} Qtl</p></div>
                <StatusChip status={p.paymentStatus} />
              </motion.li>
            ))}
          </ul>
        )}
      </Tile>
      <Tile title="Open orders" className="md:col-span-2">
        {open.length === 0 ? <EmptyState icon={Package} title="No pending orders" /> : (
          <ul className="divide-y divide-border">
            {open.slice(0, 5).map((o, i) => (
              <motion.li key={o.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{o.customerName}</p><p className="text-xs text-muted">{o.orderDate} · {o.remainingQuintals} of {o.quantityQuintals} Qtl left</p></div>
                <StatusChip status={o.status} />
              </motion.li>
            ))}
          </ul>
        )}
      </Tile>
      {totals.slice(1).map(t => <StatTile key={t.key} label={t.label} value={stock?.[t.key]} icon={t.icon} tone={t.tone} className="md:col-span-2" />)}
    </div>
  )
}
