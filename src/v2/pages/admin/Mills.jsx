import { useState } from 'react'
import { Badge, Button, Card, Center, Group, Loader, Modal, SimpleGrid, Stack, Text, TextInput, ThemeIcon, UnstyledButton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, KeyRound, Mail, MapPin, Phone, Plus, Power } from 'lucide-react'
import { createMill, getMillStock, getMills, resetMillPassword, toggleMillStatus } from '../../../shared/api/mills'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import ErrorAlert from '../../components/ErrorAlert'
import PasswordModal from '../../components/PasswordModal'
import StatusBadge from '../../components/StatusBadge'
import { errorMessage } from '../../../shared/utils/errors'
import { v2 } from '../../lib/paths'

const EMPTY = { name: '', location: '', contactPhone: '', contactEmail: '', adminUsername: '', adminFullName: '' }
const FIELDS = [
  ['name', 'Mill name', true], ['location', 'Location'], ['contactPhone', 'Contact phone'], ['contactEmail', 'Contact email'],
  ['adminUsername', 'Admin username', true], ['adminFullName', 'Admin full name'],
]

function Chip({ label, value, color }) {
  return (
    <Stack gap={0} align="center" p={6} style={{ flex: 1, borderRadius: 10, background: `var(--mantine-color-${color}-0)` }}>
      <Text size="xs" c={`${color}.8`} fw={600}>{label}</Text>
      <Text fw={800} className="v2-num" c={`${color}.9`}>{Number(value || 0).toFixed(1)}</Text>
      <Text size="10px" c="dimmed">Qtl</Text>
    </Stack>
  )
}

export default function Mills() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [reveal, setReveal] = useState(null)
  const { data: mills = [], isLoading } = useQuery({ queryKey: ['mills'], queryFn: getMills })
  const stocks = useQueries({ queries: mills.map(m => ({ queryKey: ['mill-stock', m.id], queryFn: () => getMillStock(m.id), staleTime: 30000 })) })

  const create = useMutation({
    mutationFn: (d) => createMill(d),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['mills'] }); setForm(null)
      setReveal({ title: 'Mill created', username: r.adminUsername, password: r.generatedPassword, message: r.message })
    },
  })
  const toggle = useMutation({
    mutationFn: (id) => toggleMillStatus(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mills'] }); notifications.show({ color: 'leaf', message: 'Mill status updated' }) },
    onError: (e) => notifications.show({ color: 'red', message: errorMessage(e) }),
  })
  const reset = useMutation({
    mutationFn: ({ id }) => resetMillPassword(id),
    onSuccess: (r, { username }) => setReveal({ title: 'Password reset', username, password: r.generatedPassword, message: r.message }),
    onError: (e) => notifications.show({ color: 'red', message: errorMessage(e) }),
  })

  return (
    <Stack gap="lg">
      <PageHeader title="Mills" description="All rice mills on the platform"
        actions={<Button leftSection={<Plus size={16} />} onClick={() => { create.reset(); setForm({ ...EMPTY }) }}>Add mill</Button>} />
      {isLoading ? <Center py={80}><Loader /></Center> : mills.length === 0 ? (
        <EmptyState icon={Building2} title="No mills yet">Add the first mill; its admin login is created for you.</EmptyState>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
          {mills.map((m, i) => {
            const stock = stocks[i]?.data
            return (
              <Card key={m.id} padding="lg" style={{ display: 'flex', flexDirection: 'column' }}>
                <UnstyledButton onClick={() => navigate(v2(`/admin/mills/${m.id}/stock`), { state: { millName: m.name } })} aria-label={`Open stock for ${m.name}`}>
                  <Group justify="space-between" wrap="nowrap" mb="sm">
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <ThemeIcon variant="light" size={42} radius="md"><Building2 size={20} /></ThemeIcon>
                      <div style={{ minWidth: 0 }}><Text fw={700} truncate="end">{m.name}</Text><StatusBadge status={m.status} /></div>
                    </Group>
                    <ChevronRight size={18} color="var(--mantine-color-gray-5)" />
                  </Group>
                  <Stack gap={4}>
                    {m.location && <Group gap={6}><MapPin size={14} /><Text size="xs" c="dimmed">{m.location}</Text></Group>}
                    {m.contactPhone && <Group gap={6}><Phone size={14} /><Text size="xs" c="dimmed">{m.contactPhone}</Text></Group>}
                    {m.contactEmail && <Group gap={6}><Mail size={14} /><Text size="xs" c="dimmed">{m.contactEmail}</Text></Group>}
                    {m.adminUsername && <Text size="xs" c="dimmed">Admin: <Badge size="xs" variant="outline" color="gray">{m.adminUsername}</Badge></Text>}
                  </Stack>
                  <Group gap="xs" mt="md" grow>
                    {stocks[i]?.isLoading ? <Center><Loader size="xs" /></Center> : stock ? (
                      <><Chip label="Paddy" value={stock.paddyOnHand} color="yellow" /><Chip label="In mill" value={stock.paddyInMill} color="blue" /><Chip label="Rice" value={stock.riceOnHand} color="leaf" /></>
                    ) : <Text size="xs" c="dimmed" ta="center">No stock data</Text>}
                  </Group>
                </UnstyledButton>
                <Group grow mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)', marginTop: 'auto' }}>
                  <Button size="xs" variant="light" color={m.status === 'ACTIVE' ? 'red' : 'leaf'} leftSection={<Power size={14} />}
                    onClick={() => toggle.mutate(m.id)}>{m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button>
                  <Button size="xs" variant="default" leftSection={<KeyRound size={14} />}
                    onClick={() => reset.mutate({ id: m.id, username: m.adminUsername })}>Reset password</Button>
                </Group>
              </Card>
            )
          })}
        </SimpleGrid>
      )}

      <Modal opened={!!form} onClose={() => setForm(null)} title="Add mill" size="lg">
        {form && (
          <Stack component="form" gap="md" onSubmit={(e) => { e.preventDefault(); create.mutate(form) }}>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {FIELDS.map(([key, label, req]) => (
                <TextInput key={key} label={label} withAsterisk={!!req} required={!!req} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              ))}
            </SimpleGrid>
            <ErrorAlert error={create.error} />
            <Text size="xs" c="dimmed">The mill admin's password is generated and shown once.</Text>
            <Group justify="flex-end"><Button variant="default" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create mill</Button></Group>
          </Stack>
        )}
      </Modal>
      <PasswordModal opened={!!reveal} onClose={() => setReveal(null)} {...(reveal || {})} />
    </Stack>
  )
}
