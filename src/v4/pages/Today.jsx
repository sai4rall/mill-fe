import { useMemo, useState } from 'react'
import { Button } from '@heroui/react'
import { AlertTriangle, ArrowRight, Factory, IndianRupee, Package, Plus, ShoppingCart, Smartphone, Wheat } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getAllPayments, getBatches, getFarmers, getOrders, getPurchases, getStock } from '../../shared/api/mill'
import { useAuth } from '../../shared/context/AuthContext'
import { EmptyState, StatusChip } from '../kit/display'
import StatTile from '../kit/StatTile'
import { cx, greeting } from '../lib/format'
import { compact, date, day, daysAgo, money, num, plural, qty } from '../lib/numbers'
import { v4 } from '../lib/paths'
import { useT } from '../i18n'
import { useRecordPurchase } from '../shell/RecordPurchase'

const WINDOWS = [{ id: 'today', days: 1, label: 'filter.today' }, { id: 'week', days: 7, label: 'filter.week' }, { id: 'month', days: 30, label: 'filter.month' }]
const sum = (rows, k) => rows.reduce((t, r) => t + Number(r[k] || 0), 0)
const within = (iso, from, to) => { const a = daysAgo(iso); return a >= from && a <= to }
const change = (now, before) => (before > 0 ? ((now - before) / before) * 100 : null)

function Card({ title, action, className, children }) {
  return (
    <section className={cx('min-w-0 rounded-card border border-border bg-surface p-4 shadow-e1 sm:p-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-semibold">{title}</h2>{action}</div>
      {children}
    </section>
  )
}

const SeeAll = ({ to, children = 'See all' }) => (
  <Link to={v4(to)} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">{children}<ArrowRight className="size-3.5" /></Link>
)

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-field border border-border bg-surface px-3 py-2 text-xs shadow-e2">
      <p className="font-semibold">{label}</p>
      {payload.map(p => <p key={p.dataKey} className="v4-num">{p.name}: {qty(p.value)}</p>)}
    </div>
  )
}

/** Paddy bought per day. Axis ticks are compact (1.2 K) and the axis sizes to them, so nothing clips. */
function DailyChart({ series }) {
  if (!series.some(d => d.Paddy > 0)) return <p className="py-12 text-center text-sm text-muted">No purchases in this period.</p>
  const widest = Math.max(...series.map(d => compact(d.Paddy).length))
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
          <YAxis tickLine={false} axisLine={false} width={Math.max(32, widest * 8 + 8)} tickFormatter={compact} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
          <Tooltip cursor={{ fill: 'var(--surface-secondary)' }} content={<ChartTip />} />
          <Bar dataKey="Paddy" name="Paddy bought" fill="var(--paddy)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Attention({ items }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">Nothing needs attention. All caught up.</p>
  return (
    <ul className="divide-y divide-border">
      {items.map(i => {
        const Icon = i.icon
        return (
          <li key={i.id}>
            <Link to={v4(i.to)} className="flex items-center gap-3 py-3 hover:text-accent">
              <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-field', i.tone === 'risk' ? 'bg-risk-soft text-risk' : 'bg-warn-soft text-warn')}><Icon className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{i.title}</span><span className="block text-xs text-muted">{i.detail}</span></span>
              <ArrowRight className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Greeting({ name, children }) {
  const [now] = useState(() => new Date())
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm text-muted">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{greeting(now)}, {name}</h1>
      </div>
      {children}
    </div>
  )
}

function PurchaseList({ rows }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map(p => (
        <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{p.farmerName}</p><p className="v4-num text-xs text-muted">{day(p.purchaseDate)} · {qty(p.weightQuintals)}</p></div>
          <div className="text-right"><p className="v4-num text-sm font-semibold">{money(p.totalAmount)}</p><StatusChip status={p.paymentStatus} /></div>
        </li>
      ))}
    </ul>
  )
}

/** Operators: record the next weighment and see today's entries. */
function OperatorToday({ name }) {
  const { t } = useT()
  const record = useRecordPurchase()
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const today = purchases.filter(p => daysAgo(p.purchaseDate) === 0)
  return (
    <>
      <Greeting name={name}>{record.enabled && <Button size="lg" onPress={record.open}><Plus className="size-5" />{t('record.title')}</Button>}</Greeting>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatTile label="Purchases today" value={today.length} format="count" unit="" icon={ShoppingCart} tone="paddy" />
        <StatTile label="Paddy today" value={sum(today, 'weightQuintals')} icon={Wheat} tone="paddy" />
      </div>
      <Card title={t('today.entries')} action={<SeeAll to="/purchases" />}>
        {today.length ? <PurchaseList rows={today} /> : <p className="py-6 text-center text-sm text-muted">{t('today.noEntries')}</p>}
      </Card>
    </>
  )
}

/** Mill admins: the period at a glance, what needs attention, stock, the trend and the latest activity. */
function AdminToday({ name }) {
  const { t } = useT()
  const [win, setWin] = useState('today')
  const { data: stock } = useQuery({ queryKey: ['stock'], queryFn: getStock })
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const { data: payments = [] } = useQuery({ queryKey: ['payments', 'all'], queryFn: getAllPayments })
  const { data: batches = [] } = useQuery({ queryKey: ['batches'], queryFn: getBatches })
  const { data: farmers = [] } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: getOrders })

  const n = WINDOWS.find(w => w.id === win).days
  const cur = purchases.filter(p => within(p.purchaseDate, 0, n - 1))
  const prev = purchases.filter(p => within(p.purchaseDate, n, 2 * n - 1))
  const paidCur = payments.filter(p => within(p.paymentDate, 0, n - 1))
  const paidPrev = payments.filter(p => within(p.paymentDate, n, 2 * n - 1))
  const outstanding = sum(purchases, 'amountDue')
  const vsLabel = win === 'today' ? 'vs yesterday' : `vs previous ${n} days`

  const series = useMemo(() => {
    const days = Math.max(n, 7)
    return Array.from({ length: days }, (_, i) => {
      const ago = days - 1 - i
      const d = new Date(); d.setDate(d.getDate() - ago)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return { label: day(iso), Paddy: sum(purchases.filter(p => p.purchaseDate === iso), 'weightQuintals') }
    })
  }, [purchases, n])

  const attention = useMemo(() => {
    const items = []
    const old = purchases.filter(p => Number(p.amountDue) > 0 && daysAgo(p.purchaseDate) > 7)
    if (old.length) items.push({ id: 'unpaid', icon: IndianRupee, tone: 'risk', to: '/money', title: `${plural(old.length, 'purchase')} unpaid for over 7 days`, detail: `${money(sum(old, 'amountDue'))} due · oldest ${date(old.map(p => p.purchaseDate).sort()[0])}` })
    const slow = batches.filter(b => b.status === 'IN_PROGRESS' && daysAgo(b.batchDate) > 2)
    if (slow.length) items.push({ id: 'batches', icon: Factory, tone: 'warn', to: '/batches', title: `${plural(slow.length, 'batch', 'batches')} running for more than 2 days`, detail: slow.slice(0, 3).map(b => `Batch #${b.id} · ${qty(b.paddyInputQuintals)}`).join(', ') })
    const owed = new Set(purchases.filter(p => Number(p.amountDue) > 0).map(p => p.farmerId))
    const unverified = farmers.filter(f => !f.phoneVerified && owed.has(f.id))
    if (unverified.length) items.push({ id: 'mobiles', icon: Smartphone, tone: 'warn', to: '/farmers', title: `${plural(unverified.length, 'farmer')} with dues ${unverified.length === 1 ? 'has' : 'have'} no verified mobile`, detail: 'Payments need OTP on a verified number. ' + unverified.slice(0, 3).map(f => f.name).join(', ') })
    const openOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PARTIAL')
    const needed = openOrders.reduce((t, o) => t + Number(o.quantityQuintals || 0) - Number(o.shippedQuintals || 0), 0)
    const rice = Number(stock?.riceOnHand || 0)
    if (openOrders.length && needed > rice) items.push({ id: 'orders', icon: AlertTriangle, tone: 'risk', to: '/orders', title: 'Open orders need more rice than is on hand', detail: `${qty(needed)} to ship · ${qty(rice)} on hand · short by ${qty(needed - rice)}` })
    return items
  }, [purchases, batches, farmers, orders, stock])

  const activity = [
    ...purchases.slice(0, 6).map(p => ({ key: `p${p.id}`, when: p.purchaseDate, id: p.id, text: `Bought ${qty(p.weightQuintals)} from ${p.farmerName}`, value: money(p.totalAmount) })),
    ...payments.slice(0, 6).map(p => ({ key: `y${p.id}`, when: p.paymentDate, id: p.id, text: `Paid ${p.farmerName || 'farmer'} · ${p.paymentMode.replace('_', ' ')}`, value: money(p.amount) })),
  ].sort((a, b) => (b.when || '').localeCompare(a.when || '') || b.id - a.id).slice(0, 6)

  return (
    <>
      <Greeting name={name}>
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Period" className="flex gap-1 rounded-field border border-border bg-surface p-0.5">
            {WINDOWS.map(w => (
              <button key={w.id} type="button" role="radio" aria-checked={win === w.id} onClick={() => setWin(w.id)}
                className={cx('rounded-[5px] px-3 py-1.5 text-sm font-medium', win === w.id ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground')}>{t(w.label)}</button>
            ))}
          </div>
        </div>
      </Greeting>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Paddy bought" value={sum(cur, 'weightQuintals')} icon={Wheat} tone="paddy" delta={change(sum(cur, 'weightQuintals'), sum(prev, 'weightQuintals'))} hint={`${plural(cur.length, 'purchase')} · ${vsLabel}`} />
        <StatTile label="Purchase value" value={sum(cur, 'totalAmount')} format="money" unit="" icon={ShoppingCart} tone="neutral" delta={change(sum(cur, 'totalAmount'), sum(prev, 'totalAmount'))} hint={vsLabel} />
        <StatTile label="Paid to farmers" value={sum(paidCur, 'amount')} format="money" unit="" icon={IndianRupee} tone="ok" delta={change(sum(paidCur, 'amount'), sum(paidPrev, 'amount'))} hint={vsLabel} />
        <StatTile label="Outstanding (all time)" value={outstanding} format="money" unit="" icon={IndianRupee} tone="risk" hint={`${plural(purchases.filter(p => Number(p.amountDue) > 0).length, 'purchase')} due`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
        <Card title="Needs attention">{<Attention items={attention} />}</Card>
        <Card title="Stock now" action={<SeeAll to="/stock">Ledger</SeeAll>}>
          <dl className="grid gap-2 text-sm">
            {[['Paddy on hand', stock?.paddyOnHand, 'text-paddy'], ['Paddy in mill', stock?.paddyInMill, ''], ['Rice on hand', stock?.riceOnHand, 'text-rice'], ['Open orders', orders.filter(o => o.status === 'PENDING' || o.status === 'PARTIAL').length, '']].map(([k, v, c], i) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className={cx('v4-num font-semibold', c)}>{i === 3 ? num(v, 0) : qty(v)}</dd></div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={win === 'month' ? 'Paddy bought, last 30 days' : 'Paddy bought, last 7 days'}><DailyChart series={series} /></Card>
        <Card title="Latest activity" action={<SeeAll to="/purchases" />}>
          {activity.length === 0 ? <EmptyState icon={Package} title="No activity yet" /> : (
            <ul className="divide-y divide-border">
              {activity.map(a => (
                <li key={a.key} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0"><p className="truncate text-sm">{a.text}</p><p className="text-xs text-muted">{day(a.when)}</p></div>
                  <span className="v4-num shrink-0 text-sm font-semibold">{a.value}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

export default function Today() {
  const { user } = useAuth()
  const name = user?.fullName || user?.username
  return user?.role === 'MILL_ADMIN' ? <AdminToday name={name} /> : <OperatorToday name={name} />
}
