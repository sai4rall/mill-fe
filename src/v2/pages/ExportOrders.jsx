import { useState } from 'react'
import { Button, Center, Divider, Drawer, Group, Loader, Modal, Progress, Select, SimpleGrid, Stack, Table, Text, TextInput, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, Truck, UserPlus } from 'lucide-react'
import { createCustomer, createOrder, createShipment, getCustomers, getOrders, getShipments } from '../../shared/api/mill'
import PageHeader from '../components/PageHeader'
import TableCard from '../components/TableCard'
import EmptyState from '../components/EmptyState'
import ErrorAlert from '../components/ErrorAlert'
import StatusBadge from '../components/StatusBadge'
import { today } from '../../shared/utils/format'
import { todayISO } from '../../shared/utils/dates'

const EMPTY_ORDER = { customerId: null, orderDate: '', riceType: '', quantityQuintals: '', pricePerQuintal: '', notes: '' }
const EMPTY_CUSTOMER = { name: '', companyName: '', phone: '', email: '', address: '' }

export default function ExportOrders({ title = 'Export Orders' }) {
  const qc = useQueryClient()
  const [orderForm, setOrderForm] = useState(null)
  const [customerForm, setCustomerForm] = useState(null)
  const [shipFor, setShipFor] = useState(null) // order id
  const [ship, setShip] = useState({ shipmentDate: today(), quintalsExported: '', vehicleNumber: '', notes: '' })

  const { data: orders = [], isLoading } = useQuery({ queryKey: ['orders'], queryFn: getOrders })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const shipOrder = orders.find(o => o.id === shipFor) || null
  const { data: shipments = [] } = useQuery({ queryKey: ['shipments', shipFor], queryFn: () => getShipments(shipFor), enabled: !!shipFor })

  const createOrderM = useMutation({
    mutationFn: (d) => createOrder(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setOrderForm(null); notifications.show({ color: 'leaf', message: 'Order created' }) },
  })
  const createCustomerM = useMutation({
    mutationFn: (d) => createCustomer(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setCustomerForm(null); notifications.show({ color: 'leaf', message: 'Customer added' }) },
  })
  const shipM = useMutation({
    mutationFn: (d) => createShipment(d),
    onSuccess: () => {
      ['orders', 'stock'].forEach(k => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['shipments', shipFor] })
      setShip({ shipmentDate: today(), quintalsExported: '', vehicleNumber: '', notes: '' })
      notifications.show({ color: 'leaf', message: 'Shipment recorded' })
    },
  })

  const customerOptions = customers.map(c => ({ value: String(c.id), label: c.companyName ? `${c.name} (${c.companyName})` : c.name }))

  return (
    <Stack gap="lg">
      <PageHeader title={title} description="Customer orders and the shipments against them"
        actions={<>
          <Button variant="default" leftSection={<UserPlus size={16} />} onClick={() => { createCustomerM.reset(); setCustomerForm({ ...EMPTY_CUSTOMER }) }}>Customer</Button>
          <Button leftSection={<Plus size={16} />} onClick={() => { createOrderM.reset(); setOrderForm({ ...EMPTY_ORDER, orderDate: today() }) }}>New order</Button>
        </>} />

      {isLoading ? <Center py={80}><Loader /></Center> : orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet">Add a customer, then create their first order.</EmptyState>
      ) : (
        <TableCard minWidth={860}>
          <Table.Thead><Table.Tr>
            {['Customer', 'Date', 'Rice type', 'Progress', 'Remaining', 'Status', ''].map(h => <Table.Th key={h}>{h}</Table.Th>)}
          </Table.Tr></Table.Thead>
          <Table.Tbody>
            {orders.map(o => {
              const pct = o.quantityQuintals ? Math.min(100, (Number(o.shippedQuintals || 0) / Number(o.quantityQuintals)) * 100) : 0
              return (
                <Table.Tr key={o.id}>
                  <Table.Td fw={600}>{o.customerName}</Table.Td>
                  <Table.Td>{o.orderDate}</Table.Td>
                  <Table.Td c="dimmed">{o.riceType || '—'}</Table.Td>
                  <Table.Td miw={170}>
                    <Text size="xs" c="dimmed" mb={4} className="v2-num">{o.shippedQuintals} / {o.quantityQuintals} Qtl</Text>
                    <Progress value={pct} size="sm" radius="xl" />
                  </Table.Td>
                  <Table.Td className="v2-num" fw={700} c="orange.7">{o.remainingQuintals} Qtl</Table.Td>
                  <Table.Td><StatusBadge status={o.status} /></Table.Td>
                  <Table.Td ta="right">
                    {o.status !== 'FULFILLED' && o.status !== 'CANCELLED' && (
                      <Button size="xs" variant="light" color="blue" leftSection={<Truck size={14} />} aria-label={`Ship ${o.customerName}`}
                        onClick={() => { shipM.reset(); setShipFor(o.id) }}>Ship</Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </TableCard>
      )}

      <Modal opened={!!orderForm} onClose={() => setOrderForm(null)} title="New export order" size="lg">
        {orderForm && (
          <Stack component="form" gap="md" onSubmit={(e) => {
            e.preventDefault()
            createOrderM.mutate({ ...orderForm, customerId: parseInt(orderForm.customerId), quantityQuintals: parseFloat(orderForm.quantityQuintals),
              pricePerQuintal: orderForm.pricePerQuintal ? parseFloat(orderForm.pricePerQuintal) : null })
          }}>
            <Select label="Customer" withAsterisk required searchable placeholder="Select customer" data={customerOptions}
              nothingFoundMessage="No customers — add one first" value={orderForm.customerId} onChange={v => setOrderForm(f => ({ ...f, customerId: v }))} />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput type="date" max={todayISO()} label="Order date" withAsterisk required value={orderForm.orderDate} onChange={e => setOrderForm(f => ({ ...f, orderDate: e.target.value }))} />
              <TextInput label="Rice type" placeholder="e.g. Basmati" value={orderForm.riceType} onChange={e => setOrderForm(f => ({ ...f, riceType: e.target.value }))} />
              <TextInput label="Quantity (Qtl)" withAsterisk required type="number" step="0.01" min="0.01" value={orderForm.quantityQuintals}
                onChange={e => setOrderForm(f => ({ ...f, quantityQuintals: e.target.value }))} />
              <TextInput label="Price per Qtl (₹)" type="number" step="0.01" min="0" value={orderForm.pricePerQuintal}
                onChange={e => setOrderForm(f => ({ ...f, pricePerQuintal: e.target.value }))} />
            </SimpleGrid>
            <ErrorAlert error={createOrderM.error} />
            <Group justify="flex-end"><Button variant="default" onClick={() => setOrderForm(null)}>Cancel</Button><Button type="submit" loading={createOrderM.isPending}>Create order</Button></Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={!!customerForm} onClose={() => setCustomerForm(null)} title="Add customer">
        {customerForm && (
          <Stack component="form" gap="md" onSubmit={(e) => { e.preventDefault(); createCustomerM.mutate(customerForm) }}>
            <TextInput label="Name" withAsterisk required value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} />
            <TextInput label="Company" value={customerForm.companyName} onChange={e => setCustomerForm(f => ({ ...f, companyName: e.target.value }))} />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Phone" value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))} />
              <TextInput label="Email" type="email" value={customerForm.email} onChange={e => setCustomerForm(f => ({ ...f, email: e.target.value }))} />
            </SimpleGrid>
            <Textarea label="Address" autosize minRows={2} value={customerForm.address} onChange={e => setCustomerForm(f => ({ ...f, address: e.target.value }))} />
            <ErrorAlert error={createCustomerM.error} />
            <Group justify="flex-end"><Button variant="default" onClick={() => setCustomerForm(null)}>Cancel</Button><Button type="submit" loading={createCustomerM.isPending}>Save</Button></Group>
          </Stack>
        )}
      </Modal>

      <Drawer opened={!!shipOrder} onClose={() => setShipFor(null)} position="right" size="md" title={shipOrder ? `Ship — ${shipOrder.customerName}` : ''}>
        {shipOrder && (
          <Stack gap="md">
            <Group justify="space-between"><Text size="sm" c="dimmed">Remaining</Text><Text fw={800} c="orange.7" className="v2-num">{shipOrder.remainingQuintals} Qtl</Text></Group>
            {shipments.length > 0 && (
              <Stack gap={6}>
                <Text size="sm" fw={600}>Previous shipments</Text>
                {shipments.map(s => (
                  <Group key={s.id} justify="space-between" p="xs" style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: 8 }}>
                    <Text size="sm" fw={600} className="v2-num">{s.quintalsExported} Qtl <Text span c="dimmed" fw={400}>{s.vehicleNumber}</Text></Text>
                    <Text size="xs" c="dimmed">{s.shipmentDate}</Text>
                  </Group>
                ))}
              </Stack>
            )}
            <Divider label="New shipment" labelPosition="left" />
            <Stack component="form" gap="sm" onSubmit={(e) => {
              e.preventDefault()
              shipM.mutate({ ...ship, orderId: shipOrder.id, quintalsExported: parseFloat(ship.quintalsExported) })
            }}>
              <SimpleGrid cols={2}>
                <TextInput label="Quintals" withAsterisk required type="number" step="0.01" min="0.01" value={ship.quintalsExported}
                  onChange={e => setShip(s => ({ ...s, quintalsExported: e.target.value }))} />
                <TextInput type="date" max={todayISO()} label="Date" withAsterisk required value={ship.shipmentDate} onChange={e => setShip(s => ({ ...s, shipmentDate: e.target.value }))} />
              </SimpleGrid>
              <TextInput label="Vehicle number" value={ship.vehicleNumber} onChange={e => setShip(s => ({ ...s, vehicleNumber: e.target.value.toUpperCase() }))} />
              <ErrorAlert error={shipM.error} />
              <Button type="submit" loading={shipM.isPending} leftSection={<Truck size={16} />}>Record shipment</Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </Stack>
  )
}
