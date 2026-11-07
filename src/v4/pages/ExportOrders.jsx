import { useState } from 'react'
import { Button } from '@heroui/react'
import { Package, Plus, Truck, UserPlus } from 'lucide-react'
import { motion } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCustomer, createOrder, createShipment, getCustomers, getOrders, getShipments } from '../../shared/api/mill'
import { todayISO } from '../../shared/utils/dates'
import { EmptyState, ErrorAlert, Loading, PageHeader, Section, StatusChip } from '../kit/display'
import { ComboInput, DateInput, TextAreaInput, TextInput } from '../kit/fields'
import { Panel, SubmitButton } from '../kit/overlays'
import { date, num, qty } from '../lib/numbers'
import { notify } from '../lib/toast'

const EMPTY_ORDER = { customerId: '', orderDate: '', riceType: '', quantityQuintals: '', pricePerQuintal: '', notes: '' }
const EMPTY_CUSTOMER = { name: '', companyName: '', phone: '', email: '', address: '' }
const emptyShip = () => ({ shipmentDate: todayISO(), quintalsExported: '', vehicleNumber: '', notes: '' })
const customerLabel = (c) => (c.companyName ? `${c.name} (${c.companyName})` : c.name)

/** Ring that fills to `pct`. */
function Ring({ pct }) {
  const r = 26, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-label={`${Math.round(pct)}% shipped`}>
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-surface-secondary" />
      <motion.circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-ok"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
    </svg>
  )
}

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
  const setO = (k) => (v) => setOrderForm(f => ({ ...f, [k]: v }))
  const setC = (k) => (v) => setCustomerForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <PageHeader title={title} description="Customer orders and the shipments against them"
        actions={<>
          <Button variant="secondary" onPress={() => { createCustomerM.reset(); setCustomerForm({ ...EMPTY_CUSTOMER }) }}><UserPlus className="size-4" />Customer</Button>
          <Button onPress={() => { createOrderM.reset(); setErrs({}); setOrderForm({ ...EMPTY_ORDER, orderDate: todayISO() }) }}><Plus className="size-4" />New order</Button>
        </>} />

      {isLoading ? <Loading /> : orders.length === 0
        ? <EmptyState icon={Package} title="No orders yet">Add a customer, then create their first order.</EmptyState>
        : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orders.map(o => {
              const pct = o.quantityQuintals ? Math.min(100, (Number(o.shippedQuintals || 0) / Number(o.quantityQuintals)) * 100) : 0
              const shippable = o.status !== 'FULFILLED' && o.status !== 'CANCELLED'
              return (
                <article key={o.id} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-e1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate font-bold">{o.customerName}</p><p className="text-xs text-muted">{date(o.orderDate)}{o.riceType ? ` · ${o.riceType}` : ''}</p></div>
                    <StatusChip status={o.status} />
                  </div>
                  <div className="flex items-center gap-4">
                    <Ring pct={pct} />
                    <div className="grid gap-0.5 text-sm">
                      <p><span className="v4-num font-bold">{num(o.shippedQuintals)}</span><span className="text-muted"> / {qty(o.quantityQuintals)} shipped</span></p>
                      <p className="text-warn"><span className="v4-num font-semibold">{qty(o.remainingQuintals)}</span> remaining</p>
                    </div>
                  </div>
                  {shippable && <Button variant="secondary" className="mt-auto" onPress={() => { shipM.reset(); setErrs({}); setShipFor(o.id) }} aria-label={`Ship ${o.customerName}`}><Truck className="size-4" />Record shipment</Button>}
                </article>
              )
            })}
          </div>
        )}

      <Panel open={!!orderForm} onClose={() => setOrderForm(null)} title="New export order" width="sm:w-[34rem]"
        onSubmit={(e) => {
          e.preventDefault()
          const found = {}
          if (!orderForm.customerId) found.customerId = 'Select a customer'
          if (!orderForm.orderDate) found.orderDate = 'Order date is required'
          if (!(Number(orderForm.quantityQuintals) > 0)) found.quantityQuintals = 'Enter the quantity'
          setErrs(found)
          if (Object.keys(found).length) return
          createOrderM.mutate({ ...orderForm, customerId: Number(orderForm.customerId), quantityQuintals: parseFloat(orderForm.quantityQuintals), pricePerQuintal: orderForm.pricePerQuintal ? parseFloat(orderForm.pricePerQuintal) : null })
        }}
        footer={<><Button variant="tertiary" onPress={() => setOrderForm(null)}>Cancel</Button><SubmitButton pending={createOrderM.isPending}>Create order</SubmitButton></>}>
        {orderForm && (
          <>
            <ComboInput label="Customer" required options={customers.map(c => ({ value: String(c.id), label: customerLabel(c) }))} value={orderForm.customerId} onChange={setO('customerId')}
              error={errs.customerId} empty="No customers — add one first" />
            <div className="grid gap-4 sm:grid-cols-2">
              <DateInput label="Order date" required value={orderForm.orderDate} onChange={setO('orderDate')} error={errs.orderDate} />
              <TextInput label="Rice type" placeholder="e.g. Basmati" value={orderForm.riceType} onChange={setO('riceType')} />
              <TextInput label="Quantity (Qtl)" required type="number" step="0.01" min="0.01" value={orderForm.quantityQuintals} onChange={setO('quantityQuintals')} error={errs.quantityQuintals} />
              <TextInput label="Price per Qtl (₹)" type="number" step="0.01" min="0" value={orderForm.pricePerQuintal} onChange={setO('pricePerQuintal')} />
            </div>
            <ErrorAlert error={createOrderM.error} />
          </>
        )}
      </Panel>

      <Panel open={!!customerForm} onClose={() => setCustomerForm(null)} title="Add customer" width="sm:w-[34rem]"
        onSubmit={(e) => { e.preventDefault(); if (!customerForm.name.trim()) { setErrs({ name: 'Name is required' }); return } createCustomerM.mutate(customerForm) }}
        footer={<><Button variant="tertiary" onPress={() => setCustomerForm(null)}>Cancel</Button><SubmitButton pending={createCustomerM.isPending}>Save</SubmitButton></>}>
        {customerForm && (
          <>
            <TextInput label="Name" required value={customerForm.name} onChange={setC('name')} error={errs.name} />
            <TextInput label="Company" value={customerForm.companyName} onChange={setC('companyName')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Phone" value={customerForm.phone} onChange={setC('phone')} />
              <TextInput label="Email" type="email" value={customerForm.email} onChange={setC('email')} />
            </div>
            <TextAreaInput label="Address" value={customerForm.address} onChange={setC('address')} />
            <ErrorAlert error={createCustomerM.error} />
          </>
        )}
      </Panel>

      <Panel open={!!shipOrder} onClose={() => setShipFor(null)} title={shipOrder ? `Ship — ${shipOrder.customerName}` : ''} width="sm:w-[28rem]"
        description={shipOrder ? `${shipOrder.remainingQuintals} Qtl remaining on this order` : ''}
        onSubmit={(e) => {
          e.preventDefault()
          if (!ship.shipmentDate) { setErrs({ shipmentDate: 'Shipment date is required' }); return }
          if (!(Number(ship.quintalsExported) > 0)) { setErrs({ quintalsExported: 'Enter the quintals' }); return }
          shipM.mutate({ ...ship, orderId: shipOrder.id, quintalsExported: parseFloat(ship.quintalsExported) })
        }}>
        {shipOrder && (
          <>
            {shipments.length > 0 && (
              <div className="grid gap-2">
                <p className="text-sm font-semibold">Previous shipments</p>
                {shipments.map(s => (
                  <div key={s.id} className="flex justify-between rounded-field border border-border px-3 py-2 text-sm">
                    <span className="font-semibold">{qty(s.quintalsExported)} <span className="font-normal text-muted">{s.vehicleNumber}</span></span>
                    <span className="text-xs text-muted">{date(s.shipmentDate)}</span>
                  </div>
                ))}
              </div>
            )}
            <Section>New shipment</Section>
            <TextInput label="Quintals" required type="number" step="0.01" min="0.01" value={ship.quintalsExported} onChange={v => setShip(s => ({ ...s, quintalsExported: v }))} error={errs.quintalsExported} />
            <DateInput label="Shipment date" required value={ship.shipmentDate} onChange={v => setShip(s => ({ ...s, shipmentDate: v }))} error={errs.shipmentDate} />
            <TextInput label="Vehicle number" value={ship.vehicleNumber} onChange={v => setShip(s => ({ ...s, vehicleNumber: v.toUpperCase() }))} />
            <ErrorAlert error={shipM.error} />
            <SubmitButton pending={shipM.isPending} fullWidth><Truck className="size-4" />Record shipment</SubmitButton>
          </>
        )}
      </Panel>
    </>
  )
}
