import { useState } from 'react'
import {
  ActionIcon, Badge, Button, Card, Center, FileButton, Group, Image, Loader, Modal, SegmentedControl, Select, SimpleGrid, Stack, Switch, Table,
  Tabs, Text, TextInput, ThemeIcon, Tooltip,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Image as ImageIcon, KeyRound, Plus, Power, ShieldCheck, ToggleRight, Trash2, Upload } from 'lucide-react'
import {
  createSuperAdmin, deleteMillLogo, getDevMillLogo, getDevMills, getGlobalFlags, getMillFlags, getSuperAdmins, resetSuperAdminPassword,
  setMillFlag, toggleSuperAdmin, updateGlobalFlag, uploadMillLogo,
} from '../../../shared/api/dev'
import { LOGO_TYPES, logoFileError, validateSuperAdmin } from '../../../shared/utils/devValidation'
import { useObjectUrl } from '../../../shared/utils/useObjectUrl'
import PageHeader from '../../components/PageHeader'
import TableCard from '../../components/TableCard'
import ErrorAlert from '../../components/ErrorAlert'
import PasswordModal from '../../components/PasswordModal'
import StatusBadge from '../../components/StatusBadge'
import { errorMessage } from '../../../shared/utils/errors'

const toChoice = (v) => (v == null ? 'inherit' : v ? 'on' : 'off')
const fromChoice = (c) => (c === 'inherit' ? null : c === 'on')
const toastError = (e) => notifications.show({ color: 'red', message: errorMessage(e) })

function FlagsPanel() {
  const qc = useQueryClient()
  const [scope, setScope] = useState('global')
  const millId = scope === 'global' ? '' : scope
  const { data: mills = [] } = useQuery({ queryKey: ['dev-mills'], queryFn: getDevMills })
  const { data: flags = [], isLoading } = useQuery({ queryKey: ['dev-flags', millId || 'global'], queryFn: () => (millId ? getMillFlags(millId) : getGlobalFlags()) })
  const m = useMutation({
    mutationFn: ({ key, data }) => (millId ? setMillFlag(millId, key, data) : updateGlobalFlag(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['dev-flags'] }),
    onError: toastError,
  })
  const choice = (label, value, global, onChange) => (
    <SegmentedControl size="xs" aria-label={label} value={toChoice(value)} disabled={m.isPending} onChange={(c) => onChange(fromChoice(c))}
      data={[{ value: 'inherit', label: `Inherit (${global ? 'On' : 'Off'})` }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} />
  )

  return (
    <Stack gap="md">
      <Group gap="sm" align="flex-end" wrap="wrap">
        <Select label="Apply to" w={{ base: '100%', sm: 300 }} allowDeselect={false} value={scope}
          onChange={(v) => setScope(v || 'global')}
          data={[{ value: 'global', label: 'All mills (global defaults)' }, ...mills.map(x => ({ value: String(x.millId), label: x.millName }))]} />
        <Text size="xs" c="dimmed" maw={420}>{millId ? '“Inherit” uses the global default. Overrides apply to this mill only.' : 'Applies to every mill without its own override.'}</Text>
      </Group>
      {isLoading ? <Center py={40}><Loader /></Center> : (
        <TableCard minWidth={millId ? 820 : 480}>
          <Table.Thead><Table.Tr><Table.Th>Module</Table.Th><Table.Th>Show in menu</Table.Th><Table.Th>Enabled</Table.Th>{millId && <Table.Th>Effective</Table.Th>}</Table.Tr></Table.Thead>
          <Table.Tbody>
            {flags.map(f => (
              <Table.Tr key={f.key}>
                <Table.Td><Text fw={600} size="sm">{f.name}</Text><Text size="xs" c="dimmed" ff="monospace">{f.key}</Text></Table.Td>
                {millId ? (
                  <>
                    <Table.Td>{choice(`${f.name} show in menu`, f.overrideShowInMenu, f.globalShowInMenu, v => m.mutate({ key: f.key, data: { showInMenu: v, enabled: f.overrideEnabled } }))}</Table.Td>
                    <Table.Td>{choice(`${f.name} enabled`, f.overrideEnabled, f.globalEnabled, v => m.mutate({ key: f.key, data: { showInMenu: f.overrideShowInMenu, enabled: v } }))}</Table.Td>
                    <Table.Td><Group gap={4}><Badge color={f.showInMenu ? 'leaf' : 'gray'}>{f.showInMenu ? 'In menu' : 'Hidden'}</Badge><Badge color={f.enabled ? 'leaf' : 'gray'}>{f.enabled ? 'Enabled' : 'Not enabled'}</Badge></Group></Table.Td>
                  </>
                ) : (
                  <>
                    <Table.Td><Switch aria-label={`${f.name} show in menu`} checked={f.showInMenu} disabled={m.isPending} onChange={e => m.mutate({ key: f.key, data: { showInMenu: e.target.checked } })} /></Table.Td>
                    <Table.Td><Switch aria-label={`${f.name} enabled`} checked={f.enabled} disabled={m.isPending} onChange={e => m.mutate({ key: f.key, data: { enabled: e.target.checked } })} /></Table.Td>
                  </>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </TableCard>
      )}
    </Stack>
  )
}

function LogoCard({ mill }) {
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const { data: blob } = useQuery({
    queryKey: ['dev-mill-logo', mill.millId, mill.logoUpdatedAt], queryFn: () => getDevMillLogo(mill.millId, mill.logoUpdatedAt),
    enabled: !!mill.logoUpdatedAt, staleTime: Infinity,
  })
  const url = useObjectUrl(blob)
  const refresh = () => qc.invalidateQueries({ queryKey: ['dev-mills'] })
  const upload = useMutation({ mutationFn: (f) => uploadMillLogo(mill.millId, f), onSuccess: () => { setError(''); refresh(); notifications.show({ color: 'leaf', message: `Logo updated for ${mill.millName}` }) }, onError: e => setError(errorMessage(e)) })
  const remove = useMutation({ mutationFn: () => deleteMillLogo(mill.millId), onSuccess: () => { setError(''); refresh() }, onError: e => setError(errorMessage(e)) })
  const pick = (file) => { if (!file) return; const p = logoFileError(file); if (p) { setError(p); return } upload.mutate(file) }

  return (
    <Card padding="md" data-testid={`mill-logo-${mill.millId}`}>
      <Group wrap="nowrap" align="flex-start">
        <Center w={84} h={84} style={{ borderRadius: 12, border: '1px solid var(--mantine-color-gray-2)', background: 'var(--mantine-color-gray-0)', flexShrink: 0 }}>
          {url ? <Image src={url} alt={`${mill.millName} logo`} mah={76} maw={76} fit="contain" /> : <Building2 size={30} color="var(--mantine-color-gray-4)" aria-label="No logo" />}
        </Center>
        <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
          <Text fw={700} truncate="end">{mill.millName}</Text>
          <Group gap={6}><Text size="xs" c="dimmed">{mill.location || '—'}</Text><StatusBadge status={mill.status} /></Group>
          <Group gap="xs">
            <FileButton onChange={pick} accept={LOGO_TYPES.join(',')} inputProps={{ 'aria-label': `${mill.millName} logo file` }}>
              {(props) => <Button {...props} size="xs" variant="light" leftSection={<Upload size={14} />} loading={upload.isPending}>{mill.logoUpdatedAt ? 'Replace logo' : 'Upload logo'}</Button>}
            </FileButton>
            {mill.logoUpdatedAt && (
              <Tooltip label="Remove logo"><ActionIcon variant="subtle" color="red" onClick={() => remove.mutate()} aria-label={`Remove ${mill.millName} logo`}><Trash2 size={16} /></ActionIcon></Tooltip>
            )}
          </Group>
          {error && <Text size="xs" c="red" role="alert">{error}</Text>}
        </Stack>
      </Group>
    </Card>
  )
}

function LogosPanel() {
  const { data: mills = [], isLoading } = useQuery({ queryKey: ['dev-mills'], queryFn: getDevMills })
  if (isLoading) return <Center py={40}><Loader /></Center>
  if (!mills.length) return <Text c="dimmed" ta="center" py="xl">No mills yet. Super admins create mills.</Text>
  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">PNG, JPEG or WebP, up to 1 MB. Shown at the top left for the mill's users after login.</Text>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">{mills.map(m => <LogoCard key={m.millId} mill={m} />)}</SimpleGrid>
    </Stack>
  )
}

function SuperAdminsPanel() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [reveal, setReveal] = useState(null)
  const { data: admins = [], isLoading } = useQuery({ queryKey: ['dev-super-admins'], queryFn: getSuperAdmins })
  const refresh = () => qc.invalidateQueries({ queryKey: ['dev-super-admins'] })
  const create = useMutation({
    mutationFn: (d) => createSuperAdmin(d),
    onSuccess: (c) => { setForm(null); refresh(); setReveal({ title: 'Super admin created', username: c.username, password: c.generatedPassword }) },
  })
  const toggle = useMutation({ mutationFn: (id) => toggleSuperAdmin(id), onSuccess: refresh, onError: toastError })
  const reset = useMutation({
    mutationFn: ({ id }) => resetSuperAdminPassword(id),
    onSuccess: ({ generatedPassword }, { username }) => setReveal({ title: 'Password reset', username, password: generatedPassword }),
    onError: toastError,
  })
  const submit = (e) => {
    e.preventDefault()
    const found = validateSuperAdmin(form); setErrors(found)
    if (!Object.keys(found).length) create.mutate({ username: form.username.trim(), fullName: form.fullName.trim() || null })
  }

  return (
    <Stack gap="md">
      <Group justify="flex-end"><Button leftSection={<Plus size={16} />} onClick={() => { setErrors({}); create.reset(); setForm({ username: '', fullName: '' }) }}>Add super admin</Button></Group>
      {isLoading ? <Center py={40}><Loader /></Center> : (
        <TableCard minWidth={560}>
          <Table.Thead><Table.Tr><Table.Th>Username</Table.Th><Table.Th>Full name</Table.Th><Table.Th>Status</Table.Th><Table.Th ta="right">Actions</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {admins.map(a => (
              <Table.Tr key={a.id}>
                <Table.Td ff="monospace" fw={600}>{a.username}</Table.Td>
                <Table.Td>{a.fullName || '—'}</Table.Td>
                <Table.Td><StatusBadge status={a.active ? 'ACTIVE' : 'INACTIVE'} /></Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <Button size="xs" variant="light" color={a.active ? 'red' : 'leaf'} leftSection={<Power size={14} />}
                      aria-label={`${a.active ? 'Disable' : 'Enable'} ${a.username}`} onClick={() => toggle.mutate(a.id)}>{a.active ? 'Disable' : 'Enable'}</Button>
                    <Button size="xs" variant="default" leftSection={<KeyRound size={14} />} aria-label={`Reset password for ${a.username}`}
                      onClick={() => reset.mutate({ id: a.id, username: a.username })}>Reset</Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </TableCard>
      )}
      <Modal opened={!!form} onClose={() => setForm(null)} title="Add super admin">
        {form && (
          <Stack component="form" gap="md" onSubmit={submit} noValidate>
            <TextInput label="Username" withAsterisk maxLength={50} autoComplete="off" value={form.username} error={errors.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <TextInput label="Full name" maxLength={100} value={form.fullName} error={errors.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            <ErrorAlert error={create.error} />
            <Text size="xs" c="dimmed">A password is generated and shown once after creating.</Text>
            <Group justify="flex-end"><Button variant="default" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create</Button></Group>
          </Stack>
        )}
      </Modal>
      <PasswordModal opened={!!reveal} onClose={() => setReveal(null)} {...(reveal || {})} />
    </Stack>
  )
}

export default function DevConsole() {
  return (
    <Stack gap="lg">
      <PageHeader title="Dev Console" description="Feature flags, mill branding and super admin accounts"
        icon={<ThemeIcon size={44} radius="md" variant="light" color="orange"><ShieldCheck size={22} /></ThemeIcon>} />
      <Tabs defaultValue="flags" keepMounted={false} variant="pills" radius="md">
        <Tabs.List mb="md" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
          <Tabs.Tab value="flags" leftSection={<ToggleRight size={16} />}>Feature Flags</Tabs.Tab>
          <Tabs.Tab value="logos" leftSection={<ImageIcon size={16} />}>Mill Logos</Tabs.Tab>
          <Tabs.Tab value="supers" leftSection={<ShieldCheck size={16} />}>Super Admins</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="flags"><FlagsPanel /></Tabs.Panel>
        <Tabs.Panel value="logos"><LogosPanel /></Tabs.Panel>
        <Tabs.Panel value="supers"><SuperAdminsPanel /></Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
