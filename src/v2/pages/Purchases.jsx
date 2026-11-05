import { useState } from 'react'
import { Button, Card, Center, Group, Loader, Modal, Select, SimpleGrid, Stack, Table, Text, TextInput, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IndianRupee, Plus, ShoppingCart } from 'lucide-react'
import { createPurchase, getFarmers, getPurchases } from '../../shared/api/mill'
import { getMoistureTable } from '../../shared/api/moisture'
import { lookupDeduction, priceBreakdown } from '../../shared/utils/moisture'
import { useFeatures } from '../../shared/features/useFeatures'
import PageHeader from '../components/PageHeader'
import TableCard from '../components/TableCard'
import EmptyState from '../components/EmptyState'
import ErrorAlert from '../components/ErrorAlert'
import StatusBadge from '../components/StatusBadge'
import PaymentDrawer from './PaymentDrawer'
import { rupees } from '../../shared/utils/format'
import { todayISO } from '../../shared/utils/dates'

const EMPTY = { farmerId: null, purchaseDate: '', weightQuintals: '', pricePerQuintal: '', moisturePct: '', truckNumber: '', notes: '' }

export default function Purchases() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [payFor, setPayFor] = useState(null)
  const moistureOn = useFeatures().flag('moisture_deduction').enabled

  const { data: purchases = [], isLoading } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const { data: farmers = [] } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })
  const { data: moisture } = useQuery({ queryKey: ['moisture'], queryFn: getMoistureTable, enabled: moistureOn })
  const payPurchase = purchases.find(p => p.id === payFor) || null
  const farmerVerified = (id) => !!farmers.find(f => f.id === id)?.phoneVerified

  const create = useMutation({
    mutationFn: (d) => createPurchase(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['stock'] })
      setForm(null); notifications.show({ color: 'leaf', message: 'Purchase recorded' })
    },
  })

  const deductionPct = moistureOn && form ? lookupDeduction(moisture?.ranges, form.moisturePct) : 0
  const { gross, deduction, net } = form ? priceBreakdown(form.weightQuintals, form.pricePerQuintal, deductionPct) : { gross: 0, deduction: 0, net: 0 }
  const totals = purchases.reduce((t, p) => ({ value: t.value + Number(p.totalAmount || 0), due: t.due + Number(p.amountDue || 0) }), { value: 0, due: 0 })

  return (
    <Stack gap="lg">
      <PageHeader title="Paddy Purchases" description="Paddy bought from farmers and payments released"
        actions={<Button leftSection={<Plus size={16} />} onClick={() => { create.reset(); setForm({ ...EMPTY }) }}>Record purchase</Button>} />

      <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
        <Card padding="md"><Text size="xs" c="dimmed" fw={600} tt="uppercase">Purchases</Text><Text fz={24} fw={800}>{purchases.length}</Text></Card>
        <Card padding="md"><Text size="xs" c="dimmed" fw={600} tt="uppercase">Total value</Text><Text fz={24} fw={800} className="v2-num">{rupees(totals.value)}</Text></Card>
        <Card padding="md"><Text size="xs" c="dimmed" fw={600} tt="uppercase">Outstanding</Text><Text fz={24} fw={800} c="red.7" className="v2-num">{rupees(totals.due)}</Text></Card>
      </SimpleGrid>

      {isLoading ? <Center py={80}><Loader /></Center> : purchases.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No purchases yet">Record the first paddy purchase from a registered farmer.</EmptyState>
      ) : (
        <TableCard minWidth={moistureOn ? 1000 : 900}>
          <Table.Thead><Table.Tr>
            {['Farmer', 'Date', 'Truck', 'Weight', 'Rate', ...(moistureOn ? ['Moisture'] : []), 'Total', 'Paid', 'Due', 'Status', ''].map(h => <Table.Th key={h}>{h}</Table.Th>)}
          </Table.Tr></Table.Thead>
          <Table.Tbody>
            {purchases.map(p => (
              <Table.Tr key={p.id}>
                <Table.Td fw={600}>{p.farmerName}</Table.Td>
                <Table.Td>{p.purchaseDate}</Table.Td>
                <Table.Td ff="monospace" fz="sm">{p.truckNumber || '—'}</Table.Td>
                <Table.Td className="v2-num">{p.weightQuintals} Qtl</Table.Td>
                <Table.Td className="v2-num">{rupees(p.pricePerQuintal)}</Table.Td>
                {moistureOn && (
                  <Table.Td className="v2-num">
                    {p.moisturePct == null ? '—' : (<>{Number(p.moisturePct)}%{Number(p.deductionPct) > 0 && <Text size="xs" c="orange.8">−{Number(p.deductionPct)}%</Text>}</>)}
                  </Table.Td>
                )}
                <Table.Td className="v2-num" fw={700}>{rupees(p.totalAmount)}</Table.Td>
                <Table.Td className="v2-num" c="leaf.7">{rupees(p.amountPaid)}</Table.Td>
                <Table.Td className="v2-num" c="red.7">{rupees(p.amountDue)}</Table.Td>
                <Table.Td><StatusBadge status={p.paymentStatus} /></Table.Td>
                <Table.Td ta="right">
                  <Button size="xs" variant="light" leftSection={<IndianRupee size={14} />} onClick={() => setPayFor(p.id)} aria-label={`Pay ${p.farmerName}`}>Pay</Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </TableCard>
      )}

      <Modal opened={!!form} onClose={() => setForm(null)} title="Record paddy purchase" size="lg">
        {form && (
          <Stack component="form" gap="md" onSubmit={(e) => {
            e.preventDefault()
            create.mutate({ ...form, farmerId: parseInt(form.farmerId), weightQuintals: parseFloat(form.weightQuintals),
              pricePerQuintal: parseFloat(form.pricePerQuintal), moisturePct: moistureOn ? parseFloat(form.moisturePct) : null })
          }}>
            <Select label="Farmer" withAsterisk required searchable placeholder="Select farmer" nothingFoundMessage="No farmers found"
              data={farmers.map(f => ({ value: String(f.id), label: f.name }))} value={form.farmerId}
              onChange={v => setForm(f => ({ ...f, farmerId: v }))} />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput type="date" max={todayISO()} label="Purchase date" withAsterisk required value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
              <TextInput label="Truck number" placeholder="e.g. AP07CD1234" ff="monospace" value={form.truckNumber}
                onChange={e => setForm(f => ({ ...f, truckNumber: e.target.value.toUpperCase() }))} description="Used for GPS truck tracking" />
              <TextInput label="Weight (Qtl)" withAsterisk required type="number" step="0.01" min="0.01" value={form.weightQuintals}
                onChange={e => setForm(f => ({ ...f, weightQuintals: e.target.value }))} />
              <TextInput label="Price per Qtl (₹)" withAsterisk required type="number" step="0.01" min="0.01" value={form.pricePerQuintal}
                onChange={e => setForm(f => ({ ...f, pricePerQuintal: e.target.value }))} />
              {moistureOn && (
                <TextInput label="Moisture %" withAsterisk required type="number" step="0.01" min="0" max="100" value={form.moisturePct}
                  onChange={e => setForm(f => ({ ...f, moisturePct: e.target.value }))} />
              )}
            </SimpleGrid>
            <Stack gap={4} p="md" bg="leaf.0" style={{ borderRadius: 12, border: '1px solid var(--mantine-color-leaf-2)' }} data-testid="price-breakdown">
              {moistureOn ? (
                <>
                  <Group justify="space-between"><Text size="sm">Gross amount</Text><Text size="sm" className="v2-num">{rupees(gross)}</Text></Group>
                  <Group justify="space-between"><Text size="sm" c="orange.8">Moisture deduction ({deductionPct}%)</Text><Text size="sm" c="orange.8" className="v2-num">−{rupees(deduction)}</Text></Group>
                  <Group justify="space-between" pt={4} style={{ borderTop: '1px solid var(--mantine-color-leaf-2)' }}>
                    <Text fw={700}>Net payable</Text><Text fw={800} c="leaf.8" className="v2-num">{rupees(net)}</Text>
                  </Group>
                  {moisture?.source === 'NONE' && <Text size="xs" c="dimmed">No moisture ranges are configured, so no deduction applies.</Text>}
                </>
              ) : (
                <Group justify="space-between"><Text fw={700}>Total amount</Text><Text fw={800} c="leaf.8" className="v2-num">{rupees(gross)}</Text></Group>
              )}
            </Stack>
            <Textarea label="Notes" autosize minRows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <ErrorAlert error={create.error} />
            <Group justify="flex-end"><Button variant="default" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" loading={create.isPending}>Record purchase</Button></Group>
          </Stack>
        )}
      </Modal>

      <PaymentDrawer key={payFor || 'none'} purchase={payPurchase} farmerVerified={payPurchase ? farmerVerified(payPurchase.farmerId) : false}
        onClose={() => setPayFor(null)} />
    </Stack>
  )
}
