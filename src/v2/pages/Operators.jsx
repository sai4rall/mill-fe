import { useState } from 'react'
import { ActionIcon, Button, Center, Group, Loader, Modal, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Plus, UserCheck, UserX, Users } from 'lucide-react'
import { createOperator, getOperators, resetOperatorPassword, toggleOperatorStatus } from '../../shared/api/mill'
import PageHeader from '../components/PageHeader'
import TableCard from '../components/TableCard'
import EmptyState from '../components/EmptyState'
import ErrorAlert from '../components/ErrorAlert'
import PasswordModal from '../components/PasswordModal'
import StatusBadge from '../components/StatusBadge'
import { errorMessage } from '../../shared/utils/errors'

export default function Operators() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [reveal, setReveal] = useState(null)
  const { data: operators = [], isLoading } = useQuery({ queryKey: ['operators'], queryFn: getOperators })
  const refresh = () => qc.invalidateQueries({ queryKey: ['operators'] })

  const create = useMutation({
    mutationFn: (data) => createOperator(data),
    onSuccess: (op) => { refresh(); setForm(null); setReveal({ title: 'Operator created', username: op.username, password: op.generatedPassword }) },
  })
  const toggle = useMutation({
    mutationFn: (id) => toggleOperatorStatus(id),
    onSuccess: () => { refresh(); notifications.show({ color: 'leaf', message: 'Operator status updated' }) },
    onError: (e) => notifications.show({ color: 'red', message: errorMessage(e) }),
  })
  const reset = useMutation({
    mutationFn: ({ id }) => resetOperatorPassword(id),
    onSuccess: (r, { username }) => setReveal({ title: 'Password reset', username, password: r.generatedPassword, message: r.message }),
    onError: (e) => notifications.show({ color: 'red', message: errorMessage(e) }),
  })

  return (
    <Stack gap="lg">
      <PageHeader title="Operators" description="People who record day-to-day work in your mill"
        actions={<Button leftSection={<Plus size={16} />} onClick={() => { create.reset(); setForm({ username: '', fullName: '' }) }}>Add operator</Button>} />
      {isLoading ? <Center py={80}><Loader /></Center> : operators.length === 0 ? (
        <EmptyState icon={Users} title="No operators yet">Add an operator so your team can record purchases and batches.</EmptyState>
      ) : (
        <TableCard minWidth={520}>
          <Table.Thead><Table.Tr><Table.Th>Username</Table.Th><Table.Th>Full name</Table.Th><Table.Th>Status</Table.Th><Table.Th ta="right">Actions</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {operators.map(op => (
              <Table.Tr key={op.id}>
                <Table.Td ff="monospace" fw={600}>{op.username}</Table.Td>
                <Table.Td>{op.fullName || '—'}</Table.Td>
                <Table.Td><StatusBadge status={op.active ? 'ACTIVE' : 'INACTIVE'} /></Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <Tooltip label={op.active ? 'Deactivate' : 'Activate'}>
                      <ActionIcon variant="light" color={op.active ? 'red' : 'leaf'} onClick={() => toggle.mutate(op.id)}
                        aria-label={`${op.active ? 'Deactivate' : 'Activate'} ${op.username}`}>
                        {op.active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Reset password">
                      <ActionIcon variant="light" color="blue" onClick={() => reset.mutate({ id: op.id, username: op.username })}
                        aria-label={`Reset password for ${op.username}`}><KeyRound size={16} /></ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </TableCard>
      )}

      <Modal opened={!!form} onClose={() => setForm(null)} title="Add operator">
        {form && (
          <Stack component="form" gap="md" onSubmit={(e) => { e.preventDefault(); create.mutate(form) }}>
            <TextInput label="Username" withAsterisk required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <TextInput label="Full name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            <ErrorAlert error={create.error} />
            <Text size="xs" c="dimmed">A password is generated and shown once.</Text>
            <Group justify="flex-end"><Button variant="default" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create operator</Button></Group>
          </Stack>
        )}
      </Modal>
      <PasswordModal opened={!!reveal} onClose={() => setReveal(null)} {...(reveal || {})} />
    </Stack>
  )
}
