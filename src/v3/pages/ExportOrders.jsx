import { useState } from 'react'
import { Loader2, Package, Plus, Truck, UserPlus } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/v3/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v3/ui/dialog'
import { Input } from '@/v3/ui/input'
import { Progress } from '@/v3/ui/progress'
import { Separator } from '@/v3/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/v3/ui/sheet'
import { Textarea } from '@/v3/ui/textarea'
import { createCustomer, createOrder, createShipment, getCustomers, getOrders, getShipments } from '../../shared/api/mill'
import { todayISO } from '../../shared/utils/dates'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import DateField from '../components/DateField'
import Combobox from '../components/Combobox'
import EmptyState from '../components/EmptyState'
import ErrorAlert from '../components/ErrorAlert'
import Field from '../components/Field'
import StatusBadge from '../components/StatusBadge'
import Loading from '../components/Loading'
import { notify } from '../lib/toast'

const EMPTY_ORDER = { customerId: '', orderDate: '', riceType: '', quantityQuintals: '', pricePerQuintal: '', notes: '' }
const EMPTY_CUSTOMER = { name: '', companyName: '', phone: '', email: '', address: '' }
const emptyShip = () => ({ shipmentDate: todayISO(), quintalsExported: '', vehicleNumber: '', notes: '' })
const customerLabel = (c) => (c.companyName ? `${c.name} (${c.companyName})` : c.name)

export default function ExportOrders({ title = 'Export Orders' }) {
  const qc = useQueryClient()
  const [orderForm, setOrderForm] = useState(null)
  const [customerForm, setCustomerForm] = useState(null)
  const [shipFor, setShipFor] = useState(null)
  const [ship, setShip] = useState(emptyShip)
  const [errs, setErrs] = useState({})

  const { data: orders = [], isLoading } = useQuery({ queryKey: ['orders'], queryFn: getOrders })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const shipOrder = orders.find(o => o.id === shipFor) || null
  const { data: shipments = [] } = useQuery({ queryKey: ['shipments', shipFor], queryFn: () => getShipments(shipFor), enabled: !!shipFor })

  const createOrderM = useMutation({ mutationFn: (d) => createOrder(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setOrderForm(null); notify('Order created') } })
  const createCustomerM = useMutation({ mutationFn: (d) => createCustomer(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setCustomerForm(null); notify('Customer added') } })
  const shipM = useMutation({
    mutationFn: (d) => createShipment(d),
    onSuccess: () => {
      ['orders', 'stock'].forEach(k => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['shipments', shipFor] })
      setShip(emptyShip()); notify('Shipment recorded')
    },
  })

  const columns = [
    { key: 'customerName', header: 'Customer', cell: (o) => <span className="font-medium">{o.customerName}</span> },
    { key: 'orderDate', header: 'Date', className: 'whitespace-nowrap' },
    { key: 'riceType', header: 'Rice type', cell: (o) => <span className="text-muted-foreground">{o.riceType || '—'}</span> },
    {
      key: 'progress', header: 'Progress', className: 'min-w-44',
      cell: (o) => {
        const pct = o.quantityQuintals ? Math.min(100, (Number(o.shippedQuintals || 0) / Number(o.quantityQuintals)) * 100) : 0
        return <div className="grid gap-1.5"><span className="v3-num text-xs text-muted-foreground">{o.shippedQuintals} / {o.quantityQuintals} Qtl</span><Progress value={pct} className="h-1.5" /></div>
      },
    },
    { key: 'remainingQuintals', header: 'Remaining', align: 'right', cell: (o) => <span className="v3-num font-semibold text-amber-700">{o.remainingQuintals} Qtl</span> },
    { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
    {
      key: 'act', header: '', align: 'right',
      cell: (o) => o.status !== 'FULFILLED' && o.status !== 'CANCELLED' && (
        <Button size="sm" variant="outline" aria-label={`Ship ${o.customerName}`} onClick={() => { shipM.reset(); setErrs({}); setShipFor(o.id) }}><Truck />Ship</Button>
      ),
    },
  ]
  const setO = (k) => (e) => setOrderForm(f => ({ ...f, [k]: e.target.value }))
  const setC = (k) => (e) => setCustomerForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="grid gap-6">
      <PageHeader title={title} description="Customer orders and the shipments against them"
        actions={<>
          <Button variant="outline" onClick={() => { createCustomerM.reset(); setCustomerForm({ ...EMPTY_CUSTOMER }) }}><UserPlus />Customer</Button>
          <Button onClick={() => { createOrderM.reset(); setErrs({}); setOrderForm({ ...EMPTY_ORDER, orderDate: todayISO() }) }}><Plus />New order</Button>
        </>} />

      {isLoading ? <Loading /> : orders.length === 0
        ? <EmptyState icon={Package} title="No orders yet">Add a customer, then create their first order.</EmptyState>
        : <DataTable rows={orders} columns={columns} minWidth={900} />}

      <Dialog open={!!orderForm} onOpenChange={(o) => !o && setOrderForm(null)}>
        <DialogContent className="sm:max-w-xl">
          {orderForm && (
            <form className="grid gap-4" noValidate onSubmit={(e) => {
              e.preventDefault()
              const found = {}
              if (!orderForm.customerId) found.customerId = 'Select a customer'
              if (!orderForm.orderDate) found.orderDate = 'Order date is required'
              if (!(Number(orderForm.quantityQuintals) > 0)) found.quantityQuintals = 'Enter the quantity'
              setErrs(found)
              if (Object.keys(found).length) return
              createOrderM.mutate({ ...orderForm, customerId: Number(orderForm.customerId), quantityQuintals: parseFloat(orderForm.quantityQuintals),
                pricePerQuintal: orderForm.pricePerQuintal ? parseFloat(orderForm.pricePerQuintal) : null })
            }}>
              <DialogHeader><DialogTitle>New export order</DialogTitle></DialogHeader>
              <Field id="o-customer" label="Customer" required error={errs.customerId}>
                <Combobox id="o-customer" options={customers.map(c => ({ value: String(c.id), label: customerLabel(c) }))} value={orderForm.customerId}
                  onChange={(v) => setOrderForm(f => ({ ...f, customerId: v }))} placeholder="Select customer" empty="No customers — add one first" invalid={!!errs.customerId} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="o-date" label="Order date" required error={errs.orderDate}><DateField id="o-date" value={orderForm.orderDate} onChange={v => setOrderForm(f => ({ ...f, orderDate: v }))} /></Field>
                <Field id="o-type" label="Rice type"><Input id="o-type" placeholder="e.g. Basmati" value={orderForm.riceType} onChange={setO('riceType')} /></Field>
                <Field id="o-qty" label="Quantity (Qtl)" required error={errs.quantityQuintals}><Input id="o-qty" type="number" step="0.01" min="0.01" value={orderForm.quantityQuintals} onChange={setO('quantityQuintals')} /></Field>
                <Field id="o-price" label="Price per Qtl (₹)"><Input id="o-price" type="number" step="0.01" min="0" value={orderForm.pricePerQuintal} onChange={setO('pricePerQuintal')} /></Field>
              </div>
              <ErrorAlert error={createOrderM.error} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setOrderForm(null)}>Cancel</Button><Button type="submit" disabled={createOrderM.isPending}>{createOrderM.isPending && <Loader2 className="animate-spin" />}Create order</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!customerForm} onOpenChange={(o) => !o && setCustomerForm(null)}>
        <DialogContent className="sm:max-w-xl">
          {customerForm && (
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); createCustomerM.mutate(customerForm) }}>
              <DialogHeader><DialogTitle>Add customer</DialogTitle></DialogHeader>
              <Field id="c-name" label="Name" required><Input id="c-name" required value={customerForm.name} onChange={setC('name')} /></Field>
              <Field id="c-company" label="Company"><Input id="c-company" value={customerForm.companyName} onChange={setC('companyName')} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="c-phone" label="Phone"><Input id="c-phone" value={customerForm.phone} onChange={setC('phone')} /></Field>
                <Field id="c-email" label="Email"><Input id="c-email" type="email" value={customerForm.email} onChange={setC('email')} /></Field>
              </div>
              <Field id="c-address" label="Address"><Textarea id="c-address" rows={2} value={customerForm.address} onChange={setC('address')} /></Field>
              <ErrorAlert error={createCustomerM.error} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setCustomerForm(null)}>Cancel</Button><Button type="submit" disabled={createCustomerM.isPending}>{createCustomerM.isPending && <Loader2 className="animate-spin" />}Save</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={!!shipOrder} onOpenChange={(o) => !o && setShipFor(null)}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          {shipOrder && (
            <>
              <SheetHeader className="border-b"><SheetTitle>Ship — {shipOrder.customerName}</SheetTitle><SheetDescription>{shipOrder.remainingQuintals} Qtl remaining on this order</SheetDescription></SheetHeader>
              <div className="grid content-start gap-5 overflow-y-auto p-4">
                {shipments.length > 0 && (
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Previous shipments</p>
                    {shipments.map(s => (
                      <div key={s.id} className="flex justify-between rounded-lg border px-3 py-2 text-sm">
                        <span className="font-medium">{s.quintalsExported} Qtl <span className="font-normal text-muted-foreground">{s.vehicleNumber}</span></span>
                        <span className="text-xs text-muted-foreground">{s.shipmentDate}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3"><span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">New shipment</span><Separator className="flex-1" /></div>
                <form className="grid gap-4" onSubmit={(e) => {
                  e.preventDefault()
                  if (!ship.shipmentDate) { setErrs({ shipmentDate: 'Shipment date is required' }); return }
                  shipM.mutate({ ...ship, orderId: shipOrder.id, quintalsExported: parseFloat(ship.quintalsExported) })
                }}>
                  <Field id="s-qty" label="Quintals" required><Input id="s-qty" required type="number" step="0.01" min="0.01" value={ship.quintalsExported} onChange={e => setShip(s => ({ ...s, quintalsExported: e.target.value }))} /></Field>
                  <Field id="s-date" label="Shipment date" required error={errs.shipmentDate}><DateField id="s-date" value={ship.shipmentDate} onChange={v => setShip(s => ({ ...s, shipmentDate: v }))} /></Field>
                  <Field id="s-vehicle" label="Vehicle number"><Input id="s-vehicle" value={ship.vehicleNumber} onChange={e => setShip(s => ({ ...s, vehicleNumber: e.target.value.toUpperCase() }))} /></Field>
                  <ErrorAlert error={shipM.error} />
                  <Button type="submit" disabled={shipM.isPending}>{shipM.isPending ? <Loader2 className="animate-spin" /> : <Truck />}Record shipment</Button>
                </form>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
