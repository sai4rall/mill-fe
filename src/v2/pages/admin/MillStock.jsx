import { useState } from 'react'
import { Badge, Button, Card, Center, Group, Loader, SegmentedControl, Stack, Table, Text, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, FileText, Package2, Wheat } from 'lucide-react'
import { getMillStock, getMillStockStatement } from '../../../shared/api/mills'
import { downloadStockExcel, exportStockPdf } from '../../../shared/utils/stockExport'
import PageHeader from '../../components/PageHeader'
import TableCard from '../../components/TableCard'
import { StockCards, StockLedger } from '../../components/Stock'
import { v2 } from '../../lib/paths'
import { todayISO } from '../../../shared/utils/dates'

const RANGES = [{ label: 'Last 2 days', days: 2 }, { label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }]
// Local-date YYYY-MM-DD (toISOString would shift to UTC and can give yesterday's date in India before 05:30).
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function lastDays(days) {
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - days + 1)
  return [iso(from), iso(to)]
}

function Movements({ title, icon: Icon, color, movements = [], inLabel, outLabel }) {
  const sum = (k) => movements.reduce((s, m) => s + (Number(m[k]) || 0), 0).toFixed(2)
  return (
    <TableCard minWidth={760} header={
      <Group p="md" gap="xs" bg={`${color}.0`} style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Icon size={16} /><Text fw={700}>{title}</Text><Badge ml="auto" color={color}>{movements.length} entries</Badge>
      </Group>
    }>
      <Table.Thead><Table.Tr>
        <Table.Th>Date</Table.Th><Table.Th>Type</Table.Th><Table.Th>Description</Table.Th>
        <Table.Th ta="right">{inLabel} (Qtl)</Table.Th><Table.Th ta="right">{outLabel} (Qtl)</Table.Th><Table.Th ta="right">Balance</Table.Th>
      </Table.Tr></Table.Thead>
      <Table.Tbody>
        {movements.length === 0 && <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed" size="sm" py="md">No movements in this period.</Text></Table.Td></Table.Tr>}
        {movements.map((m, i) => (
          <Table.Tr key={i}>
            <Table.Td style={{ whiteSpace: 'nowrap' }}>{m.date}</Table.Td>
            <Table.Td><Badge color={m.type.endsWith('_IN') ? 'leaf' : 'red'}>{m.type.replace('_', ' ')}</Badge></Table.Td>
            <Table.Td maw={320}><Text size="sm" truncate="end">{m.description}</Text></Table.Td>
            <Table.Td ta="right" c="leaf.7" className="v2-num">{m.quantityIn != null ? Number(m.quantityIn).toFixed(2) : '—'}</Table.Td>
            <Table.Td ta="right" c="red.6" className="v2-num">{m.quantityOut != null ? Number(m.quantityOut).toFixed(2) : '—'}</Table.Td>
            <Table.Td ta="right" fw={700} c={Number(m.runningBalance) < 0 ? 'red.7' : undefined} className="v2-num">{Number(m.runningBalance).toFixed(2)}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
      {movements.length > 0 && (
        <Table.Tfoot><Table.Tr>
          <Table.Th colSpan={3}>Total</Table.Th>
          <Table.Th ta="right" c="leaf.7" className="v2-num">{sum('quantityIn')}</Table.Th>
          <Table.Th ta="right" c="red.6" className="v2-num">{sum('quantityOut')}</Table.Th><Table.Th />
        </Table.Tr></Table.Tfoot>
      )}
    </TableCard>
  )
}

export default function MillStock() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const millName = state?.millName || `Mill #${id}`
  const [tab, setTab] = useState('summary')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const { data: stock, isLoading } = useQuery({ queryKey: ['mill-stock', Number(id)], queryFn: () => getMillStock(id), refetchInterval: 30000 })
  const { data: statement, isLoading: stLoading } = useQuery({
    queryKey: ['mill-statement', Number(id), fromDate, toDate],
    queryFn: () => getMillStockStatement(id, fromDate || undefined, toDate || undefined), enabled: tab === 'statement',
  })
  const quick = (days) => { const [f, t] = lastDays(days); setFromDate(f); setToDate(t) }
  const excel = () => downloadStockExcel(id, millName, fromDate, toDate).catch(e => notifications.show({ color: 'red', message: e.message }))

  return (
    <Stack gap="lg">
      <Button variant="subtle" color="gray" leftSection={<ArrowLeft size={16} />} w="fit-content" onClick={() => navigate(v2('/admin'))}>All mills</Button>
      <PageHeader title={millName} description="Stock management"
        actions={<>
          <Button variant="light" color="red" leftSection={<FileText size={16} />} onClick={() => exportStockPdf({ millName, tab, stock, statement, fromDate, toDate })}>Export PDF</Button>
          <Button variant="light" leftSection={<FileSpreadsheet size={16} />} onClick={excel}>Export Excel</Button>
        </>} />
      <SegmentedControl value={tab} onChange={setTab} w="fit-content" radius="md"
        data={[{ value: 'summary', label: 'Stock summary' }, { value: 'statement', label: 'Stock statement' }]} />

      {tab === 'summary' && (isLoading ? <Center py={80}><Loader /></Center> : stock && (
        <><StockCards stock={stock} /><StockLedger stock={stock} note="Auto-refreshes every 30 s" /></>
      ))}

      {tab === 'statement' && (
        <>
          <Card padding="md">
            <Group gap="sm" wrap="wrap" align="flex-end">
              {RANGES.map(r => <Button key={r.days} size="xs" variant="default" onClick={() => quick(r.days)}>{r.label}</Button>)}
              <TextInput type="date" size="xs" max={toDate || todayISO()} label="From" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              <TextInput type="date" size="xs" min={fromDate || undefined} max={todayISO()} label="To" value={toDate} onChange={e => setToDate(e.target.value)} />
              {(fromDate || toDate) && <Button size="xs" variant="subtle" color="gray" onClick={() => { setFromDate(''); setToDate('') }}>Clear</Button>}
              {(fromDate || toDate) && <Badge size="lg" variant="light">{fromDate || '…'} → {toDate || 'Today'}</Badge>}
            </Group>
          </Card>
          {stLoading ? <Center py={80}><Loader /></Center> : statement && (
            <Stack gap="lg">
              <Movements title="Paddy stock statement" icon={Wheat} color="yellow" movements={statement.paddyMovements} inLabel="Paddy in" outLabel="Paddy out" />
              <Movements title="Rice stock statement" icon={Package2} color="leaf" movements={statement.riceMovements} inLabel="Rice in" outLabel="Rice out" />
            </Stack>
          )}
        </>
      )}
    </Stack>
  )
}
