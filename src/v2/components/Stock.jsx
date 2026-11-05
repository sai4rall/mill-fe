import { Group, SimpleGrid, Table, Text } from '@mantine/core'
import { BarChart3, Factory, Package2, TrendingDown, TrendingUp, Wheat } from 'lucide-react'
import StatCard from './StatCard'
import TableCard from './TableCard'
import { qtl } from '../../shared/utils/format'
import { ledgerRows } from '../../shared/utils/stockLedger'

export function StockCards({ stock }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }} spacing="md">
      <StatCard label="Paddy on Hand" value={stock?.paddyOnHand} icon={Wheat} color="yellow" />
      <StatCard label="Paddy in Mill" value={stock?.paddyInMill} icon={Factory} color="blue" />
      <StatCard label="Rice on Hand" value={stock?.riceOnHand} icon={Package2} color="leaf" />
      <StatCard label="Total Paddy Purchased" value={stock?.totalPaddyPurchased} icon={TrendingUp} color="grape" />
      <StatCard label="Total Rice Produced" value={stock?.totalRiceProduced} icon={BarChart3} color="teal" />
      <StatCard label="Total Rice Exported" value={stock?.totalRiceExported} icon={TrendingDown} color="cyan" />
    </SimpleGrid>
  )
}

export function StockLedger({ stock, note }) {
  return (
    <TableCard minWidth={560} header={
      <Group justify="space-between" p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Text fw={700}>Stock ledger</Text>
        {note && <Text size="xs" c="dimmed">{note}</Text>}
      </Group>
    }>
      <Table.Thead><Table.Tr><Table.Th>Line item</Table.Th><Table.Th>Description</Table.Th><Table.Th ta="right">Quantity (Qtl)</Table.Th></Table.Tr></Table.Thead>
      <Table.Tbody>
        {ledgerRows(stock).map(r => (
          <Table.Tr key={r.label} bg={r.bold ? 'leaf.0' : undefined}>
            <Table.Td fw={r.bold ? 700 : 500}>{r.label}</Table.Td>
            <Table.Td c="dimmed" fz="sm">{r.desc}</Table.Td>
            <Table.Td ta="right" fw={r.bold ? 800 : 600} className="v2-num">{qtl(r.value)}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </TableCard>
  )
}
