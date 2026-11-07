import { useMemo, useState } from 'react'
import { Button } from '@heroui/react'
import { IndianRupee, Plus, ShoppingCart } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getFarmers, getPurchases } from '../../shared/api/mill'
import { useFeatures } from '../../shared/features/useFeatures'
import DataTable from '../kit/DataTable'
import { EmptyState, ErrorAlert, PageHeader, StatusChip } from '../kit/display'
import FilterBar, { inPeriod } from '../kit/FilterBar'
import StatTile from '../kit/StatTile'
import { day, money, num, plural, qty } from '../lib/numbers'
import { usePref } from '../lib/prefs'
import { useT } from '../i18n'
import { useRecordPurchase } from '../shell/RecordPurchase'
import { partyTypeLabel } from '../../shared/utils/partyTypes'
import PurchaseSheet from './PurchaseSheet'

const VIEW = { search: '', status: 'all', period: 'all', sort: 'newest' }
const SORTS = {
  newest: (a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || '') || b.id - a.id,
  oldest: (a, b) => (a.purchaseDate || '').localeCompare(b.purchaseDate || '') || a.id - b.id,
  dueHigh: (a, b) => Number(b.amountDue || 0) - Number(a.amountDue || 0),
}

export default function Purchases() {
  const { t } = useT()
  const record = useRecordPurchase()
  const [openId, setOpenId] = useState(null)
  const [stored, setView] = usePref('purchases.view', VIEW)
  const view = { ...VIEW, ...stored }
  const moistureOn = useFeatures().flag('moisture_deduction').enabled

  const { data: purchases = [], isLoading, error } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const { data: farmers = [] } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })
  const open = purchases.find(p => p.id === openId) || null
  const farmerVerified = (id) => !!farmers.find(f => f.id === id)?.phoneVerified
  const patch = (k) => (v) => setView(s => ({ ...s, [k]: v }))

  // Search and period narrow the set; status counts are taken after them so the pills tell the truth.
  const scoped = useMemo(() => {
    const q = view.search.trim().toLowerCase()
    return purchases.filter(p => inPeriod(p.purchaseDate, view.period)
      && (!q || p.farmerName?.toLowerCase().includes(q) || p.truckNumber?.toLowerCase().includes(q) || `p-${p.id}` === q))
  }, [purchases, view.search, view.period])
  const rows = useMemo(() => scoped.filter(p => view.status === 'all' || p.paymentStatus === view.status).sort(SORTS[view.sort] || SORTS.newest),
    [scoped, view.status, view.sort])
  const count = (s) => scoped.filter(p => p.paymentStatus === s).length
  const totals = rows.reduce((a, p) => ({ weight: a.weight + Number(p.weightQuintals || 0), value: a.value + Number(p.totalAmount || 0), due: a.due + Number(p.amountDue || 0) }), { weight: 0, value: 0, due: 0 })
  const dirty = JSON.stringify(view) !== JSON.stringify(VIEW)

  const payButton = (p) => (Number(p.amountDue) > 0
    ? <Button size="sm" variant="secondary" onPress={() => setOpenId(p.id)} aria-label={`Pay ${p.farmerName}`}><IndianRupee className="size-3.5" />Pay</Button>
    : null)

  const columns = [
    { key: 'farmerName', header: 'Farmer / agent / supplier', sortValue: (p) => p.farmerName?.toLowerCase(),
      cell: (p) => <span className="font-semibold">{p.farmerName}{p.farmerType && p.farmerType !== 'FARMER' && <span className="ml-1.5 text-xs font-normal text-muted">{partyTypeLabel(p.farmerType)}</span>}</span> },
    { key: 'purchaseDate', header: 'Date', className: 'whitespace-nowrap', cell: (p) => day(p.purchaseDate), sortValue: (p) => p.purchaseDate },
    { key: 'truckNumber', header: 'Truck', cell: (p) => <span className="font-mono text-xs">{p.truckNumber || '—'}</span> },
    { key: 'weightQuintals', header: 'Weight', align: 'right', cell: (p) => <span className="v4-num">{qty(p.weightQuintals)}</span>, sortValue: (p) => Number(p.weightQuintals) },
    { key: 'pricePerQuintal', header: 'Rate', align: 'right', cell: (p) => <span className="v4-num">{money(p.pricePerQuintal)}</span> },
    ...(moistureOn ? [{ key: 'moisturePct', header: 'Moisture', align: 'right', cell: (p) => (p.moisturePct == null ? '—' : <span className="v4-num">{num(p.moisturePct)}%{Number(p.deductionPct) > 0 && <span className="block text-xs text-warn">−{num(p.deductionPct)}%</span>}</span>) }] : []),
    { key: 'totalAmount', header: 'Total', align: 'right', cell: (p) => <span className="v4-num font-semibold">{money(p.totalAmount)}</span>, sortValue: (p) => Number(p.totalAmount) },
    { key: 'amountDue', header: 'Due', align: 'right', cell: (p) => <span className={Number(p.amountDue) > 0 ? 'v4-num text-risk' : 'v4-num text-muted'}>{money(p.amountDue)}</span>, sortValue: (p) => Number(p.amountDue) },
    { key: 'paymentStatus', header: 'Status', cell: (p) => <StatusChip status={p.paymentStatus} /> },
    { key: 'pay', header: '', align: 'right', pin: true, cell: payButton },
  ]

  // Phone: two lines — who and how much; when, how heavy and what is still owed.
  const phoneRow = (p) => (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3"><span className="truncate font-semibold">{p.farmerName}</span><span className="v4-num shrink-0 font-semibold">{money(p.totalAmount)}</span></div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span className="v4-num truncate">{day(p.purchaseDate)} · {qty(p.weightQuintals)}{p.truckNumber ? ` · ${p.truckNumber}` : ''}</span>
        {Number(p.amountDue) > 0 ? <span className="v4-num shrink-0 font-semibold text-risk">{t('purchases.due')} {money(p.amountDue)}</span> : <StatusChip status={p.paymentStatus} />}
      </div>
      {Number(p.amountDue) > 0 && <div className="flex justify-end pt-1">{payButton(p)}</div>}
    </div>
  )

  return (
    <>
      <PageHeader title={t('purchases.title')} description={t('purchases.subtitle')}
        actions={record.enabled && <Button onPress={record.open}><Plus className="size-4" />{t('record.title')}</Button>} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile className="col-span-2 sm:col-span-1" label="Paddy bought" value={totals.weight} icon={ShoppingCart} tone="paddy" hint={plural(rows.length, 'purchase')} />
        <StatTile label="Value" value={totals.value} format="money" unit="" icon={IndianRupee} tone="neutral" />
        <StatTile label="Outstanding" value={totals.due} format="money" unit="" icon={IndianRupee} tone="risk" />
      </div>

      <FilterBar search={view.search} onSearch={patch('search')} period={view.period} onPeriod={patch('period')}
        status={view.status} onStatus={patch('status')}
        statuses={[{ id: 'all', label: t('filter.all'), count: scoped.length }, ...['PENDING', 'PARTIAL', 'PAID'].map(s => ({ id: s, label: t(`status.${s}`), count: count(s) }))]}
        sorts={[{ id: 'newest', label: t('filter.newest') }, { id: 'oldest', label: t('filter.oldest') }, { id: 'dueHigh', label: t('filter.dueHigh') }]}
        sort={view.sort} onSort={patch('sort')} dirty={dirty} onClear={() => setView(VIEW)} />

      <ErrorAlert error={error} />
      {!isLoading && purchases.length === 0
        ? <EmptyState icon={ShoppingCart} title="No purchases yet" action={record.enabled && <Button onPress={record.open}><Plus className="size-4" />{t('record.title')}</Button>}>Record the first paddy purchase from a registered farmer.</EmptyState>
        : <DataTable label="Purchases" rows={rows} columns={columns} loading={isLoading} minWidth={moistureOn ? 1000 : 900}
            empty={t('purchases.empty')} onRowClick={(p) => setOpenId(p.id)} phoneRow={phoneRow} />}

      <PurchaseSheet key={openId || 'none'} purchase={open} farmerVerified={open ? farmerVerified(open.farmerId) : false} onClose={() => setOpenId(null)} />
    </>
  )
}
