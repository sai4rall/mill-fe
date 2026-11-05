import { useState } from 'react'
import { Button } from '@heroui/react'
import { IndianRupee, Plus, ShoppingCart } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPurchase, getFarmers, getPurchases } from '../../shared/api/mill'
import { getMoistureTable } from '../../shared/api/moisture'
import { lookupDeduction, priceBreakdown } from '../../shared/utils/moisture'
import { isFutureDate, todayISO } from '../../shared/utils/dates'
import { useFeatures } from '../../shared/features/useFeatures'
import DataTable from '../kit/DataTable'
import { EmptyState, ErrorAlert, Loading, NumberTicker, PageHeader, StatusChip } from '../kit/display'
import { ComboInput, DateInput, TextAreaInput, TextInput } from '../kit/fields'
import { Dialog, SubmitButton } from '../kit/overlays'
import StatTile from '../kit/StatTile'
import PaymentPanel from './PaymentPanel'
import { rupees } from '../lib/format'
import { notify } from '../lib/toast'

const EMPTY = { farmerId: '', purchaseDate: '', weightQuintals: '', pricePerQuintal: '', moisturePct: '', truckNumber: '', notes: '' }

export default function Purchases() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [errs, setErrs] = useState({})
  const [payFor, setPayFor] = useState(null)
  const moistureOn = useFeatures().flag('moisture_deduction').enabled

  const { data: purchases = [], isLoading } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const { data: farmers = [] } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })
  const { data: moisture } = useQuery({ queryKey: ['moisture'], queryFn: getMoistureTable, enabled: moistureOn })
  const payPurchase = purchases.find(p => p.id === payFor) || null
  const farmerVerified = (id) => !!farmers.find(f => f.id === id)?.phoneVerified

  const create = useMutation({
    mutationFn: (d) => createPurchase(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['stock'] }); setForm(null); notify('Purchase recorded') },
  })

  const deductionPct = moistureOn && form ? lookupDeduction(moisture?.ranges, form.moisturePct) : 0
  const { gross, deduction, net } = form ? priceBreakdown(form.weightQuintals, form.pricePerQuintal, deductionPct) : { gross: 0, deduction: 0, net: 0 }
  const totals = purchases.reduce((t, p) => ({ value: t.value + Number(p.totalAmount || 0), due: t.due + Number(p.amountDue || 0) }), { value: 0, due: 0 })
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    const found = {}
    if (!form.farmerId) found.farmerId = 'Select a farmer'
    if (!form.purchaseDate) found.purchaseDate = 'Purchase date is required'
    else if (isFutureDate(form.purchaseDate)) found.purchaseDate = 'Purchase date cannot be in the future'
    if (!(Number(form.weightQuintals) > 0)) found.weightQuintals = 'Enter the weight'
    if (!(Number(form.pricePerQuintal) > 0)) found.pricePerQuintal = 'Enter the price'
    if (moistureOn && form.moisturePct === '') found.moisturePct = 'Enter the moisture %'
    setErrs(found)
    if (Object.keys(found).length) return
    create.mutate({ ...form, farmerId: Number(form.farmerId), weightQuintals: parseFloat(form.weightQuintals),
      pricePerQuintal: parseFloat(form.pricePerQuintal), moisturePct: moistureOn ? parseFloat(form.moisturePct) : null })
  }

  const columns = [
    { key: 'farmerName', header: 'Farmer', cell: (p) => <span className="font-semibold">{p.farmerName}</span> },
    { key: 'purchaseDate', header: 'Date', className: 'whitespace-nowrap' },
    { key: 'truckNumber', header: 'Truck', cell: (p) => <span className="font-mono text-xs">{p.truckNumber || '—'}</span> },
    { key: 'weightQuintals', header: 'Weight', align: 'right', cell: (p) => <span className="v4-num">{p.weightQuintals} Qtl</span> },
    { key: 'pricePerQuintal', header: 'Rate', align: 'right', cell: (p) => <span className="v4-num">{rupees(p.pricePerQuintal)}</span> },
    ...(moistureOn ? [{ key: 'moisturePct', header: 'Moisture', align: 'right', cell: (p) => (p.moisturePct == null ? '—' : <span className="v4-num">{Number(p.moisturePct)}%{Number(p.deductionPct) > 0 && <span className="block text-xs text-warning">−{Number(p.deductionPct)}%</span>}</span>) }] : []),
    { key: 'totalAmount', header: 'Total', align: 'right', cell: (p) => <span className="v4-num font-bold">{rupees(p.totalAmount)}</span> },
    { key: 'amountDue', header: 'Due', align: 'right', cell: (p) => <span className="v4-num text-danger">{rupees(p.amountDue)}</span> },
    { key: 'paymentStatus', header: 'Status', cell: (p) => <StatusChip status={p.paymentStatus} /> },
    { key: 'pay', header: '', align: 'right', cell: (p) => <Button size="sm" variant="secondary" onPress={() => setPayFor(p.id)} aria-label={`Pay ${p.farmerName}`}><IndianRupee className="size-3.5" />Pay</Button> },
  ]

  return (
    <>
      <PageHeader title="Purchases" description="Paddy bought from farmers and payments released"
        actions={<Button onPress={() => { create.reset(); setErrs({}); setForm({ ...EMPTY, purchaseDate: todayISO() }) }}><Plus className="size-4" />Record purchase</Button>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Purchases" value={purchases.length} decimals={0} unit="" icon={ShoppingCart} tone="emerald" />
        <StatTile label="Total value" value={totals.value} prefix="₹" unit="" icon={IndianRupee} tone="violet" />
        <StatTile label="Outstanding" value={totals.due} prefix="₹" unit="" icon={IndianRupee} tone="rose" />
      </div>

      {isLoading ? <Loading /> : purchases.length === 0
        ? <EmptyState icon={ShoppingCart} title="No purchases yet">Record the first paddy purchase from a registered farmer.</EmptyState>
        : <DataTable label="Purchases" rows={purchases} columns={columns} minWidth={moistureOn ? 1000 : 900} />}

      <Dialog open={!!form} onClose={() => setForm(null)} onSubmit={submit} title="Record paddy purchase" icon={<ShoppingCart className="size-5" />}
        description="Price is calculated from weight, rate and moisture." size="sm:max-w-xl"
        footer={<><Button variant="tertiary" onPress={() => setForm(null)}>Cancel</Button><SubmitButton pending={create.isPending}>Record purchase</SubmitButton></>}>
        {form && (
          <>
            <ComboInput label="Farmer" required options={farmers.map(f => ({ value: String(f.id), label: f.name }))} value={form.farmerId}
              onChange={set('farmerId')} placeholder="Search farmers…" error={errs.farmerId} empty="No farmers found" />
            <div className="grid gap-4 sm:grid-cols-2">
              <DateInput label="Purchase date" required value={form.purchaseDate} onChange={set('purchaseDate')} error={errs.purchaseDate} />
              <TextInput label="Truck number" placeholder="e.g. AP07CD1234" hint="Used for GPS truck tracking" inputClassName="font-mono" value={form.truckNumber} onChange={v => set('truckNumber')(v.toUpperCase())} />
              <TextInput label="Weight (Qtl)" required type="number" step="0.01" min="0.01" value={form.weightQuintals} onChange={set('weightQuintals')} error={errs.weightQuintals} />
              <TextInput label="Price per Qtl (₹)" required type="number" step="0.01" min="0.01" value={form.pricePerQuintal} onChange={set('pricePerQuintal')} error={errs.pricePerQuintal} />
              {moistureOn && <TextInput label="Moisture %" required type="number" step="0.01" min="0" max="100" value={form.moisturePct} onChange={set('moisturePct')} error={errs.moisturePct} />}
            </div>
            <div className="grid gap-1.5 rounded-2xl border border-success/25 bg-success-soft/40 p-4 text-sm" data-testid="price-breakdown">
              {moistureOn ? (
                <>
                  <div className="flex justify-between"><span>Gross amount</span><NumberTicker value={gross} prefix="₹" /></div>
                  <div className="flex justify-between text-warning"><span>Moisture deduction ({deductionPct}%)</span><span>−<NumberTicker value={deduction} prefix="₹" /></span></div>
                  <div className="mt-1 flex justify-between border-t border-success/25 pt-2 font-bold"><span>Net payable</span><NumberTicker value={net} prefix="₹" className="text-base text-success" /></div>
                  {moisture?.source === 'NONE' && <p className="text-xs text-muted">No moisture ranges are configured, so no deduction applies.</p>}
                </>
              ) : <div className="flex justify-between font-bold"><span>Total amount</span><NumberTicker value={gross} prefix="₹" className="text-base text-success" /></div>}
            </div>
            <TextAreaInput label="Notes" value={form.notes} onChange={set('notes')} />
            <ErrorAlert error={create.error} />
          </>
        )}
      </Dialog>

      <PaymentPanel key={payFor || 'none'} purchase={payPurchase} farmerVerified={payPurchase ? farmerVerified(payPurchase.farmerId) : false} onClose={() => setPayFor(null)} />
    </>
  )
}
