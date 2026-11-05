import { Card, Grid, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { BarChart, DonutChart } from '@mantine/charts'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Factory, Package2, TrendingDown, TrendingUp, Wheat, BarChart3, ShoppingCart, Package } from 'lucide-react'
import { getOrders, getPurchases, getStock } from '../../shared/api/mill'
import { useAuth } from '../../shared/context/AuthContext'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { greeting, qtl } from '../../shared/utils/format'

export default function Dashboard() {
  const { user } = useAuth()
  const [now] = useState(() => new Date())
  const { data: stock } = useQuery({ queryKey: ['stock'], queryFn: getStock })
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: getOrders })

  const recent = purchases.slice(0, 5)
  const pending = orders.filter(o => o.status === 'PENDING' || o.status === 'PARTIAL').slice(0, 5)
  const flow = [
    { stage: 'Purchased', Paddy: Number(stock?.totalPaddyPurchased || 0) },
    { stage: 'On hand', Paddy: Number(stock?.paddyOnHand || 0) },
    { stage: 'In mill', Paddy: Number(stock?.paddyInMill || 0) },
    { stage: 'Rice made', Rice: Number(stock?.totalRiceProduced || 0) },
    { stage: 'Exported', Rice: Number(stock?.totalRiceExported || 0) },
    { stage: 'Rice stock', Rice: Number(stock?.riceOnHand || 0) },
  ]
  const byStatus = ['PAID', 'PARTIAL', 'PENDING'].map(s => ({ status: s, count: purchases.filter(p => p.paymentStatus === s).length }))
  const donut = [
    { name: 'Paid', value: byStatus[0].count, color: 'leaf.6' },
    { name: 'Partial', value: byStatus[1].count, color: 'blue.5' },
    { name: 'Pending', value: byStatus[2].count, color: 'yellow.5' },
  ].filter(d => d.value > 0)

  return (
    <Stack gap="lg">
      <Card className="v2-hero" radius="lg" padding="xl" withBorder={false} shadow="sm">
        <Text size="sm" opacity={0.9}>{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <Title order={2} c="white" mt={4}>{greeting(now)}, {user?.fullName || user?.username}</Title>
        <Group gap="xl" mt="md" wrap="wrap">
          <div><Text size="xs" opacity={0.85}>Paddy on hand</Text><Text fz={24} fw={800} className="v2-num">{qtl(stock?.paddyOnHand)} Qtl</Text></div>
          <div><Text size="xs" opacity={0.85}>Rice on hand</Text><Text fz={24} fw={800} className="v2-num">{qtl(stock?.riceOnHand)} Qtl</Text></div>
          <div><Text size="xs" opacity={0.85}>Open orders</Text><Text fz={24} fw={800}>{pending.length}</Text></div>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }} spacing="md">
        <StatCard label="Paddy on Hand" value={stock?.paddyOnHand} icon={Wheat} color="yellow" />
        <StatCard label="Paddy in Mill" value={stock?.paddyInMill} icon={Factory} color="blue" />
        <StatCard label="Rice on Hand" value={stock?.riceOnHand} icon={Package2} color="leaf" />
        <StatCard label="Total Paddy Purchased" value={stock?.totalPaddyPurchased} icon={TrendingUp} color="grape" />
        <StatCard label="Total Rice Produced" value={stock?.totalRiceProduced} icon={BarChart3} color="teal" />
        <StatCard label="Total Rice Exported" value={stock?.totalRiceExported} icon={TrendingDown} color="cyan" />
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
        <Card h="100%">
          <Text fw={700} mb="md">Paddy to rice flow (Qtl)</Text>
          <BarChart h={260} data={flow} dataKey="stage" withLegend
            series={[{ name: 'Paddy', color: 'yellow.5' }, { name: 'Rice', color: 'leaf.6' }]}
            valueFormatter={(v) => v.toFixed(2)} tickLine="y" />
        </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
        <Card h="100%">
          <Text fw={700} mb="md">Purchase payments</Text>
          {donut.length === 0
            ? <EmptyState icon={ShoppingCart} title="No purchases yet" />
            : <Stack align="center"><DonutChart data={donut} withLabels withTooltip size={180} thickness={26} chartLabel={`${purchases.length} total`} /></Stack>}
        </Card>
        </Grid.Col>
      </Grid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Card>
          <Text fw={700} mb="sm">Recent purchases</Text>
          {recent.length === 0 ? <EmptyState icon={ShoppingCart} title="No purchases yet" /> : (
            <Stack gap={0}>
              {recent.map(p => (
                <Group key={p.id} justify="space-between" py="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-1)' }} wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={600} size="sm" truncate="end">{p.farmerName}</Text>
                    <Text size="xs" c="dimmed">{p.purchaseDate} · {p.weightQuintals} Qtl</Text>
                  </div>
                  <StatusBadge status={p.paymentStatus} />
                </Group>
              ))}
            </Stack>
          )}
        </Card>
        <Card>
          <Text fw={700} mb="sm">Pending orders</Text>
          {pending.length === 0 ? <EmptyState icon={Package} title="No pending orders" /> : (
            <Stack gap={0}>
              {pending.map(o => (
                <Group key={o.id} justify="space-between" py="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-1)' }} wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={600} size="sm" truncate="end">{o.customerName}</Text>
                    <Text size="xs" c="dimmed">{o.orderDate} · {o.quantityQuintals} Qtl ordered</Text>
                  </div>
                  <Stack gap={2} align="flex-end">
                    <StatusBadge status={o.status} />
                    <Text size="xs" c="dimmed">{o.remainingQuintals} Qtl left</Text>
                  </Stack>
                </Group>
              ))}
            </Stack>
          )}
        </Card>
      </SimpleGrid>
    </Stack>
  )
}
