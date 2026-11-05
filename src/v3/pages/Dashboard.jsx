import { useState } from 'react'
import { Package, ShoppingCart } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/v3/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/v3/ui/chart'
import { getOrders, getPurchases, getStock } from '../../shared/api/mill'
import { useAuth } from '../../shared/context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { StockCards } from '../components/Stock'
import { greeting, qtl } from '../lib/format'

const flowConfig = { paddy: { label: 'Paddy', color: 'var(--chart-2)' }, rice: { label: 'Rice', color: 'var(--chart-1)' } }
const payConfig = { PAID: { label: 'Paid', color: 'var(--chart-1)' }, PARTIAL: { label: 'Partial', color: 'var(--chart-3)' }, PENDING: { label: 'Pending', color: 'var(--chart-2)' } }

function ListCard({ title, description, children }) {
  return (
    <Card className="gap-4">
      <CardHeader><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [now] = useState(() => new Date())
  const { data: stock } = useQuery({ queryKey: ['stock'], queryFn: getStock })
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: getOrders })

  const recent = purchases.slice(0, 5)
  const pending = orders.filter(o => o.status === 'PENDING' || o.status === 'PARTIAL').slice(0, 5)
  const flow = [
    { stage: 'Purchased', paddy: Number(stock?.totalPaddyPurchased || 0) },
    { stage: 'On hand', paddy: Number(stock?.paddyOnHand || 0) },
    { stage: 'In mill', paddy: Number(stock?.paddyInMill || 0) },
    { stage: 'Rice made', rice: Number(stock?.totalRiceProduced || 0) },
    { stage: 'Exported', rice: Number(stock?.totalRiceExported || 0) },
    { stage: 'Rice stock', rice: Number(stock?.riceOnHand || 0) },
  ]
  const pie = Object.keys(payConfig).map(s => ({ status: s, count: purchases.filter(p => p.paymentStatus === s).length })).filter(d => d.count > 0)

  return (
    <div className="grid gap-6">
      <div className="relative overflow-hidden rounded-2xl bg-emerald-950 p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(40rem_20rem_at_100%_0%,rgba(52,211,153,0.4),transparent_60%)]" />
        <div className="relative">
          <p className="text-sm text-emerald-100/80">{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{greeting(now)}, {user?.fullName || user?.username}</h1>
          <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            {[['Paddy on hand', `${qtl(stock?.paddyOnHand)} Qtl`], ['Rice on hand', `${qtl(stock?.riceOnHand)} Qtl`], ['Open orders', pending.length]].map(([l, v]) => (
              <div key={l}><p className="text-xs text-emerald-100/70">{l}</p><p className="v3-num text-2xl font-semibold">{v}</p></div>
            ))}
          </div>
        </div>
      </div>

      <StockCards stock={stock} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Paddy to rice flow</CardTitle><CardDescription>Quintals at each stage</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={flowConfig} className="aspect-auto h-[260px] w-full">
              <BarChart data={flow} margin={{ left: -12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="stage" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="paddy" stackId="q" fill="var(--color-paddy)" radius={6} />
                <Bar dataKey="rice" stackId="q" fill="var(--color-rice)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Purchase payments</CardTitle><CardDescription>By payment status</CardDescription></CardHeader>
          <CardContent>
            {pie.length === 0 ? <EmptyState icon={ShoppingCart} title="No purchases yet" /> : (
              <ChartContainer config={payConfig} className="mx-auto aspect-square h-[240px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                  <Pie data={pie} dataKey="count" nameKey="status" innerRadius={62} strokeWidth={4} paddingAngle={2}>
                    {pie.map(d => <Cell key={d.status} fill={`var(--color-${d.status})`} />)}
                    <Label content={({ viewBox }) => viewBox?.cx != null && (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">{purchases.length}</tspan>
                        <tspan x={viewBox.cx} y={viewBox.cy + 22} className="fill-muted-foreground text-xs">purchases</tspan>
                      </text>
                    )} />
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard title="Recent purchases">
          {recent.length === 0 ? <EmptyState icon={ShoppingCart} title="No purchases yet" /> : (
            <ul className="divide-y">
              {recent.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{p.farmerName}</p><p className="text-xs text-muted-foreground">{p.purchaseDate} · {p.weightQuintals} Qtl</p></div>
                  <StatusBadge status={p.paymentStatus} />
                </li>
              ))}
            </ul>
          )}
        </ListCard>
        <ListCard title="Pending orders">
          {pending.length === 0 ? <EmptyState icon={Package} title="No pending orders" /> : (
            <ul className="divide-y">
              {pending.map(o => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{o.customerName}</p><p className="text-xs text-muted-foreground">{o.orderDate} · {o.quantityQuintals} Qtl ordered</p></div>
                  <div className="flex flex-col items-end gap-1"><StatusBadge status={o.status} /><span className="text-xs text-muted-foreground">{o.remainingQuintals} Qtl left</span></div>
                </li>
              ))}
            </ul>
          )}
        </ListCard>
      </div>
    </div>
  )
}
