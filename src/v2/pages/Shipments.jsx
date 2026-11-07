import { Center, Loader, SimpleGrid, Stack, Table, Text, Card } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Truck } from 'lucide-react'
import { getAllShipments } from '../../shared/api/mill'
import { shipmentTotals } from '../../shared/utils/gps'
import PageHeader from '../components/PageHeader'
import TableCard from '../components/TableCard'
import EmptyState from '../components/EmptyState'

/** Every shipment of the mill, newest first. Shipments are recorded from Export Orders. */
export default function Shipments() {
  const { data: shipments = [], isLoading } = useQuery({ queryKey: ['shipments-all'], queryFn: getAllShipments })
  const totals = shipmentTotals(shipments)
  return (
    <Stack gap="lg">
      <PageHeader title="Shipments" description="Rice dispatched against export orders. Record new shipments from Export Orders." />
      <SimpleGrid cols={{ base: 2, sm: 2 }} maw={480}>
        <Card padding="md"><Text size="xs" c="dimmed" fw={600} tt="uppercase">Shipments</Text><Text fz={24} fw={800}>{totals.count}</Text></Card>
        <Card padding="md"><Text size="xs" c="dimmed" fw={600} tt="uppercase">Exported</Text><Text fz={24} fw={800} className="v2-num">{totals.quintals.toFixed(2)} Qtl</Text></Card>
      </SimpleGrid>
      {isLoading ? <Center py={80}><Loader /></Center> : shipments.length === 0 ? (
        <EmptyState icon={Truck} title="No shipments yet">Shipments appear here once you record them against an export order.</EmptyState>
      ) : (
        <TableCard minWidth={680}>
          <Table.Thead><Table.Tr>{['Date', 'Customer', 'Rice type', 'Quintals', 'Vehicle', 'Notes'].map(h => <Table.Th key={h}>{h}</Table.Th>)}</Table.Tr></Table.Thead>
          <Table.Tbody>
            {shipments.map(s => (
              <Table.Tr key={s.id}>
                <Table.Td>{s.shipmentDate}</Table.Td>
                <Table.Td fw={600}>{s.customerName || '—'}</Table.Td>
                <Table.Td c="dimmed">{s.riceType || '—'}</Table.Td>
                <Table.Td className="v2-num" fw={700}>{s.quintalsExported} Qtl</Table.Td>
                <Table.Td ff="monospace" fz="sm">{s.vehicleNumber || '—'}</Table.Td>
                <Table.Td c="dimmed">{s.notes || '—'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </TableCard>
      )}
    </Stack>
  )
}
