import { useMemo, useState } from 'react'
import { Button } from '@heroui/react'
import { IndianRupee, ShieldCheck, Users, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getAllPayments, getFarmers, getPurchases } from '../../shared/api/mill'
import DataTable from '../kit/DataTable'
import { ErrorAlert, PageHeader, Section } from '../kit/display'
import FilterBar, { inPeriod } from '../kit/FilterBar'
import StatTile from '../kit/StatTile'
import { date, day, daysAgo, money, num, plural } from '../lib/numbers'
import { useT } from '../i18n'
import PurchaseSheet from './PurchaseSheet'

/** Money: who is owed what (oldest first), and every payment released. Rows open the purchase sheet to pay. */
export default function Money() {
  const { t } = useT()
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('month')
  const [openId, setOpenId] = useState(null)
  const { data: purchases = [], isLoading, error } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const { data: payments = [], isLoading: loadingPayments } = useQuery({ queryKey: ['payments', 'all'], queryFn: getAllPayments })
  const { data: farmers = [] } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })
  const farmerById = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers])

  const dues = useMemo(() => {
    const by = new Map()
    for (const p of purchases) {
      if (!(Number(p.amountDue) > 0)) continue
      const d = by.get(p.farmerId) || { id: p.farmerId, name: p.farmerName, due: 0, count: 0, oldest: p.purchaseDate, oldestId: p.id }
      d.due += Number(p.amountDue); d.count += 1
      if ((p.purchaseDate || '') < (d.oldest || '')) { d.oldest = p.purchaseDate; d.oldestId = p.id }
      by.set(p.farmerId, d)
    }
    const q = search.trim().toLowerCase()
    return [...by.values()].filter(d => !q || d.name?.toLowerCase().includes(q)).sort((a, b) => (a.oldest || '').localeCompare(b.oldest || ''))
  }, [purchases, search])
  const paid = payments.filter(p => inPeriod(p.paymentDate, period) && (!search || p.farmerName?.toLowerCase().includes(search.trim().toLowerCase())))
  const totalDue = dues.reduce((s, d) => s + d.due, 0)
  const open = purchases.find(p => p.id === openId) || null

  // Pay opens the farmer's oldest unpaid purchase (dues are cleared oldest first).
  const payButton = (d) => <Button size="sm" variant="secondary" onPress={() => setOpenId(d.oldestId)} aria-label={`Pay ${d.name}`}><IndianRupee className="size-3.5" />Pay</Button>
  const dueColumns = [
    { key: 'name', header: 'Farmer', cell: (d) => <span className="font-semibold">{d.name}</span>, sortValue: (d) => d.name?.toLowerCase() },
    { key: 'count', header: 'Purchases due', align: 'right', cell: (d) => <span className="v4-num">{num(d.count, 0)}</span> },
    { key: 'oldest', header: 'Oldest', cell: (d) => <span className={daysAgo(d.oldest) > 7 ? 'text-risk' : ''}>{date(d.oldest)} <span className="text-xs text-muted">({num(daysAgo(d.oldest), 0)} d)</span></span>, sortValue: (d) => d.oldest },
    { key: 'verified', header: 'Mobile', cell: (d) => (farmerById.get(d.id)?.phoneVerified ? <span className="text-ok">{t('farmers.verified')}</span> : <span className="text-warn">{t('farmers.unverified')}</span>) },
    { key: 'due', header: 'Due', align: 'right', cell: (d) => <span className="v4-num font-semibold text-risk">{money(d.due)}</span>, sortValue: (d) => d.due },
    { key: 'pay', header: '', align: 'right', pin: true, cell: (d) => payButton(d) },
  ]
  const payColumns = [
    { key: 'paymentDate', header: 'Date', cell: (p) => day(p.paymentDate), sortValue: (p) => p.paymentDate },
    { key: 'farmerName', header: 'Farmer', cell: (p) => <span className="font-semibold">{p.farmerName || '—'}</span> },
    { key: 'purchaseId', header: 'Purchase', cell: (p) => <span className="font-mono text-xs">P-{p.purchaseId}</span> },
    { key: 'paymentMode', header: 'Mode', cell: (p) => <span className="inline-flex items-center gap-1.5">{p.paymentMode.replace('_', ' ')}{p.otpVerifiedAt && <ShieldCheck className="size-3.5 text-ok" aria-label="Confirmed by farmer OTP" />}</span> },
    { key: 'amount', header: 'Amount', align: 'right', cell: (p) => <span className="v4-num font-semibold">{money(p.amount)}</span>, sortValue: (p) => Number(p.amount) },
  ]

  return (
    <>
      <PageHeader title={t('nav.money')} description="Dues to farmers, oldest first, and payments released" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile className="col-span-2 sm:col-span-1" label="Outstanding" value={totalDue} format="money" unit="" icon={Wallet} tone="risk" hint={plural(dues.length, 'farmer')} />
        <StatTile label="Paid in period" value={paid.reduce((s, p) => s + Number(p.amount || 0), 0)} format="money" unit="" icon={IndianRupee} tone="ok" hint={plural(paid.length, 'payment')} />
        <StatTile label="Over 7 days" value={dues.filter(d => daysAgo(d.oldest) > 7).length} format="count" unit="" icon={Users} tone="warn" hint="farmers waiting" />
      </div>
      <FilterBar search={search} onSearch={setSearch} searchLabel="Farmer" period={period} onPeriod={setPeriod} />
      <ErrorAlert error={error} />

      <Section>Dues by farmer</Section>
      <DataTable label="Dues by farmer" rows={dues} columns={dueColumns} loading={isLoading} empty="No dues. Every purchase is paid." minWidth={720}
        onRowClick={(d) => setOpenId(d.oldestId)}
        phoneRow={(d) => (
          <div className="grid gap-1">
            <div className="flex justify-between gap-3"><span className="truncate font-semibold">{d.name}</span><span className="v4-num shrink-0 font-semibold text-risk">{money(d.due)}</span></div>
            <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted">{num(d.count, 0)} due · oldest {date(d.oldest)}</p>{payButton(d)}</div>
          </div>
        )} />

      <Section>Payments</Section>
      <DataTable label="Payments" rows={paid} columns={payColumns} loading={loadingPayments} empty="No payments in this period." minWidth={720}
        onRowClick={(p) => setOpenId(p.purchaseId)}
        phoneRow={(p) => (
          <div className="grid gap-1">
            <div className="flex justify-between gap-3"><span className="truncate font-semibold">{p.farmerName || '—'}</span><span className="v4-num shrink-0 font-semibold">{money(p.amount)}</span></div>
            <p className="text-xs text-muted">{day(p.paymentDate)} · {p.paymentMode.replace('_', ' ')} · P-{p.purchaseId}</p>
          </div>
        )} />

      <PurchaseSheet key={openId || 'none'} purchase={open} farmerVerified={open ? !!farmerById.get(open.farmerId)?.phoneVerified : false} onClose={() => setOpenId(null)} />
    </>
  )
}
