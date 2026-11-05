import { useState } from 'react'
import { IndianRupee, Loader2, Plus, ShoppingCart } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/v3/ui/button'
import { Card } from '@/v3/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/v3/ui/dialog'
import { Input } from '@/v3/ui/input'
import { Textarea } from '@/v3/ui/textarea'
import { createPurchase, getFarmers, getPurchases } from '../../shared/api/mill'
import { getMoistureTable } from '../../shared/api/moisture'
import { lookupDeduction, priceBreakdown } from '../../shared/utils/moisture'
import { isFutureDate, todayISO } from '../../shared/utils/dates'
import { useFeatures } from '../../shared/features/useFeatures'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import DateField from '../components/DateField'
import Combobox from '../components/Combobox'
import EmptyState from '../components/EmptyState'
import ErrorAlert from '../components/ErrorAlert'
import Field from '../components/Field'
import StatusBadge from '../components/StatusBadge'
import Loading from '../components/Loading'
import PaymentSheet from './PaymentSheet'
import { rupees } from '../lib/format'
import { notify } from '../lib/toast'

const EMPTY = { farmerId: '', purchaseDate: '', weightQuintals: '', pricePerQuintal: '', moisturePct: '', truckNumber: '', notes: '' }

function Summary({ label, value, className }) {
  return <Card className="gap-1 p-5"><p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p><p className={`v3-num text-2xl font-semibold tracking-tight ${className || ''}`}>{value}</p></Card>
}

export default function Purchases() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [formErrors, setFormErrors] = useState({})
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
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.farmerId) errs.farmerId = 'Select a farmer'
    if (!form.purchaseDate) errs.purchaseDate = 'Purchase date is required'
    else if (isFutureDate(form.purchaseDate)) errs.purchaseDate = 'Purchase date cannot be in the future'
    if (!(Number(form.weightQuintals) > 0)) errs.weightQuintals = 'Enter the weight'
    if (!(Number(form.pricePerQuintal) > 0)) errs.pricePerQuintal = 'Enter the price'
    if (moistureOn && form.moisturePct === '') errs.moisturePct = 'Enter the moisture %'
    setFormErrors(errs)
    if (Object.keys(errs).length) return
    create.mutate({ ...form, farmerId: Number(form.farmerId), weightQuintals: parseFloat(form.weightQuintals),
      pricePerQuintal: parseFloat(form.pricePerQuintal), moisturePct: moistureOn ? parseFloat(form.moisturePct) : null })
  }

  const columns = [
    { key: 'farmerName', header: 'Farmer', cell: (p) => <span className="font-medium">{p.farmerName}</span> },
    { key: 'purchaseDate', header: 'Date', className: 'whitespace-nowrap' },
    { key: 'truckNumber', header: 'Truck', cell: (p) => <span className="font-mono text-xs">{p.truckNumber || '—'}</span> },
    { key: 'weightQuintals', header: 'Weight', align: 'right', cell: (p) => <span className="v3-num">{p.weightQuintals} Qtl</span> },
    { key: 'pricePerQuintal', header: 'Rate', align: 'right', cell: (p) => <span className="v3-num">{rupees(p.pricePerQuintal)}</span> },
    ...(moistureOn ? [{
      key: 'moisturePct', header: 'Moisture', align: 'right',
      cell: (p) => (p.moisturePct == null ? '—' : <span className="v3-num">{Number(p.moisturePct)}%{Number(p.deductionPct) > 0 && <span className="block text-xs text-amber-700">−{Number(p.deductionPct)}%</span>}</span>),
    }] : []),
    { key: 'totalAmount', header: 'Total', align: 'right', cell: (p) => <span className="v3-num font-semibold">{rupees(p.totalAmount)}</span> },
    { key: 'amountPaid', header: 'Paid', align: 'right', cell: (p) => <span className="v3-num text-emerald-700">{rupees(p.amountPaid)}</span> },
    { key: 'amountDue', header: 'Due', align: 'right', cell: (p) => <span className="v3-num text-rose-600">{rupees(p.amountDue)}</span> },
    { key: 'paymentStatus', header: 'Status', cell: (p) => <StatusBadge status={p.paymentStatus} /> },
    { key: 'pay', header: '', align: 'right', cell: (p) => <Button size="sm" variant="outline" onClick={() => setPayFor(p.id)} aria-label={`Pay ${p.farmerName}`}><IndianRupee />Pay</Button> },
  ]

  return (
    <div className="grid gap-6">
      <PageHeader title="Paddy Purchases" description="Paddy bought from farmers and payments released"
        actions={<Button onClick={() => { create.reset(); setFormErrors({}); setForm({ ...EMPTY, purchaseDate: todayISO() }) }}><Plus />Record purchase</Button>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Purchases" value={purchases.length} />
        <Summary label="Total value" value={rupees(totals.value)} />
        <Summary label="Outstanding" value={rupees(totals.due)} className="text-rose-600" />
      </div>

      {isLoading ? <Loading /> : purchases.length === 0
        ? <EmptyState icon={ShoppingCart} title="No purchases yet">Record the first paddy purchase from a registered farmer.</EmptyState>
        : <DataTable rows={purchases} columns={columns} minWidth={moistureOn ? 1080 : 980} />}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-xl">
          {form && (
            <form onSubmit={submit} noValidate className="grid gap-4">
              <DialogHeader><DialogTitle>Record paddy purchase</DialogTitle><DialogDescription>Price is calculated from weight, rate and moisture.</DialogDescription></DialogHeader>
              <Field id="p-farmer" label="Farmer" required error={formErrors.farmerId}>
                <Combobox id="p-farmer" options={farmers.map(f => ({ value: String(f.id), label: f.name }))} value={form.farmerId} invalid={!!formErrors.farmerId}
                  onChange={(v) => setForm(f => ({ ...f, farmerId: v }))} placeholder="Select farmer" searchPlaceholder="Search farmers…" empty="No farmers found" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="p-date" label="Purchase date" required error={formErrors.purchaseDate}>
                  <DateField id="p-date" value={form.purchaseDate} invalid={!!formErrors.purchaseDate} onChange={(v) => setForm(f => ({ ...f, purchaseDate: v }))} />
                </Field>
                <Field id="p-truck" label="Truck number" hint="Used for GPS truck tracking">
                  <Input id="p-truck" className="font-mono" placeholder="e.g. AP07CD1234" value={form.truckNumber} onChange={e => setForm(f => ({ ...f, truckNumber: e.target.value.toUpperCase() }))} />
                </Field>
                <Field id="p-weight" label="Weight (Qtl)" required error={formErrors.weightQuintals}>
                  <Input id="p-weight" type="number" step="0.01" min="0.01" value={form.weightQuintals} onChange={set('weightQuintals')} aria-invalid={!!formErrors.weightQuintals || undefined} />
                </Field>
                <Field id="p-price" label="Price per Qtl (₹)" required error={formErrors.pricePerQuintal}>
                  <Input id="p-price" type="number" step="0.01" min="0.01" value={form.pricePerQuintal} onChange={set('pricePerQuintal')} aria-invalid={!!formErrors.pricePerQuintal || undefined} />
                </Field>
                {moistureOn && (
                  <Field id="p-moisture" label="Moisture %" required error={formErrors.moisturePct}>
                    <Input id="p-moisture" type="number" step="0.01" min="0" max="100" value={form.moisturePct} onChange={set('moisturePct')} aria-invalid={!!formErrors.moisturePct || undefined} />
                  </Field>
                )}
              </div>
              <div className="grid gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm" data-testid="price-breakdown">
                {moistureOn ? (
                  <>
                    <div className="flex justify-between"><span>Gross amount</span><span className="v3-num">{rupees(gross)}</span></div>
                    <div className="flex justify-between text-amber-700"><span>Moisture deduction ({deductionPct}%)</span><span className="v3-num">−{rupees(deduction)}</span></div>
                    <div className="mt-1 flex justify-between border-t border-emerald-200 pt-2 font-semibold"><span>Net payable</span><span className="v3-num text-base text-emerald-800">{rupees(net)}</span></div>
                    {moisture?.source === 'NONE' && <p className="text-xs text-muted-foreground">No moisture ranges are configured, so no deduction applies.</p>}
                  </>
                ) : (
                  <div className="flex justify-between font-semibold"><span>Total amount</span><span className="v3-num text-base text-emerald-800">{rupees(gross)}</span></div>
                )}
              </div>
              <Field id="p-notes" label="Notes"><Textarea id="p-notes" rows={2} value={form.notes} onChange={set('notes')} /></Field>
              <ErrorAlert error={create.error} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="animate-spin" />}Record purchase</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <PaymentSheet key={payFor || 'none'} purchase={payPurchase} farmerVerified={payPurchase ? farmerVerified(payPurchase.farmerId) : false} onClose={() => setPayFor(null)} />
    </div>
  )
}
