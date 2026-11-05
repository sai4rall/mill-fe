import { useState } from 'react'
import { Button, Center, Group, Loader, Modal, SimpleGrid, Stack, Table, Text, TextInput, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Factory, Plus } from 'lucide-react'
import { completeBatch, createBatch, getBatches } from '../../shared/api/mill'
import PageHeader from '../components/PageHeader'
import TableCard from '../components/TableCard'
import EmptyState from '../components/EmptyState'
import ErrorAlert from '../components/ErrorAlert'
import StatusBadge from '../components/StatusBadge'
import { today } from '../../shared/utils/format'
import { todayISO } from '../../shared/utils/dates'

const EMPTY = { batchDate: '', paddyInputQuintals: '', expectedRiceQuintals: '', notes: '' }

export default function MillOperations() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [completing, setCompleting] = useState(null)
  const [done, setDone] = useState({ actualRiceQuintals: '', notes: '' })
  const { data: batches = [], isLoading } = useQuery({ queryKey: ['batches'], queryFn: getBatches })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['batches'] }); qc.invalidateQueries({ queryKey: ['stock'] }) }

  const create = useMutation({
    mutationFn: (d) => createBatch(d),
    onSuccess: () => { refresh(); setForm(null); notifications.show({ color: 'leaf', message: 'Batch started' }) },
  })
  const complete = useMutation({
    mutationFn: ({ id, data }) => completeBatch(id, data),
    onSuccess: () => { refresh(); setCompleting(null); notifications.show({ color: 'leaf', message: 'Batch completed' }) },
  })

  return (
    <Stack gap="lg">
      <PageHeader title="Mill Operations" description="Paddy-to-rice processing batches"
        actions={<Button leftSection={<Plus size={16} />} onClick={() => { create.reset(); setForm({ ...EMPTY, batchDate: today() }) }}>Start batch</Button>} />
      {isLoading ? <Center py={80}><Loader /></Center> : batches.length === 0 ? (
        <EmptyState icon={Factory} title="No batches yet">Start a batch when paddy goes into the mill.</EmptyState>
      ) : (
        <TableCard minWidth={760}>
          <Table.Thead><Table.Tr>
            {['Date', 'Paddy input', 'Expected rice', 'Actual rice', 'Conversion', 'Status', ''].map(h => <Table.Th key={h}>{h}</Table.Th>)}
          </Table.Tr></Table.Thead>
          <Table.Tbody>
            {batches.map(b => (
              <Table.Tr key={b.id}>
                <Table.Td>{b.batchDate}</Table.Td>
                <Table.Td className="v2-num">{b.paddyInputQuintals} Qtl</Table.Td>
                <Table.Td className="v2-num" c="dimmed">{b.expectedRiceQuintals ? `${b.expectedRiceQuintals} Qtl` : '—'}</Table.Td>
                <Table.Td className="v2-num" fw={700} c="leaf.7">{b.actualRiceQuintals ? `${b.actualRiceQuintals} Qtl` : '—'}</Table.Td>
                <Table.Td className="v2-num">{b.conversionRate ? `${b.conversionRate}%` : '—'}</Table.Td>
                <Table.Td><StatusBadge status={b.status} /></Table.Td>
                <Table.Td ta="right">
                  {b.status === 'IN_PROGRESS' && (
                    <Button size="xs" variant="light" leftSection={<CheckCircle2 size={14} />}
                      onClick={() => { complete.reset(); setCompleting(b); setDone({ actualRiceQuintals: '', notes: '' }) }}>Complete</Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </TableCard>
      )}

      <Modal opened={!!form} onClose={() => setForm(null)} title="Start mill batch">
        {form && (
          <Stack component="form" gap="md" onSubmit={(e) => {
            e.preventDefault()
            create.mutate({ ...form, purchaseEntries: [], paddyInputQuintals: parseFloat(form.paddyInputQuintals),
              expectedRiceQuintals: form.expectedRiceQuintals ? parseFloat(form.expectedRiceQuintals) : null })
          }}>
            <TextInput type="date" max={todayISO()} label="Batch date" withAsterisk required value={form.batchDate} onChange={e => setForm(f => ({ ...f, batchDate: e.target.value }))} />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Paddy input (Qtl)" withAsterisk required type="number" step="0.01" min="0.01" value={form.paddyInputQuintals}
                onChange={e => setForm(f => ({ ...f, paddyInputQuintals: e.target.value }))} />
              <TextInput label="Expected rice (Qtl)" type="number" step="0.01" min="0" value={form.expectedRiceQuintals}
                onChange={e => setForm(f => ({ ...f, expectedRiceQuintals: e.target.value }))} />
            </SimpleGrid>
            <Textarea label="Notes" autosize minRows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <ErrorAlert error={create.error} />
            <Group justify="flex-end"><Button variant="default" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" loading={create.isPending}>Start batch</Button></Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={!!completing} onClose={() => setCompleting(null)} title="Complete batch">
        {completing && (
          <Stack component="form" gap="md" onSubmit={(e) => {
            e.preventDefault()
            complete.mutate({ id: completing.id, data: { actualRiceQuintals: parseFloat(done.actualRiceQuintals), notes: done.notes } })
          }}>
            <Text size="sm" c="dimmed">Paddy input: <b>{completing.paddyInputQuintals} Qtl</b></Text>
            <TextInput label="Actual rice output (Qtl)" withAsterisk required type="number" step="0.01" min="0" value={done.actualRiceQuintals}
              onChange={e => setDone(d => ({ ...d, actualRiceQuintals: e.target.value }))} />
            <Textarea label="Notes" autosize minRows={2} value={done.notes} onChange={e => setDone(d => ({ ...d, notes: e.target.value }))} />
            <ErrorAlert error={complete.error} />
            <Group justify="flex-end"><Button variant="default" onClick={() => setCompleting(null)}>Cancel</Button><Button type="submit" loading={complete.isPending}>Mark complete</Button></Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  )
}
