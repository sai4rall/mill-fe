import { useState } from 'react'
import { Anchor, Box, Button, Group, List, Paper, PasswordInput, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Lock, Sprout, User } from 'lucide-react'
import { useAuth } from '../../shared/context/AuthContext'
import ErrorAlert from '../components/ErrorAlert'
import { v2HomeFor } from '../lib/paths'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(form.username.trim(), form.password)
      navigate(v2HomeFor(data.role))
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} mih="100dvh" className="v2-root">
      <Box className="v2-login-art" visibleFrom="md" p={56} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Group gap="sm">
          <ThemeIcon size={44} radius="md" color="white" variant="white"><Sprout size={24} color="#0c9356" /></ThemeIcon>
          <Text c="white" fw={800} fz={22}>Mill System</Text>
        </Group>
        <Stack gap="lg" maw={460}>
          <Title order={1} c="white" fz={40} lh={1.15}>From paddy to export, all in one place.</Title>
          <List spacing="sm" c="white" icon={<CheckCircle2 size={20} />} styles={{ item: { color: 'white' } }}>
            <List.Item>Farmer registration with verified mobiles</List.Item>
            <List.Item>Moisture-based pricing and OTP-confirmed payments</List.Item>
            <List.Item>Live stock, mill batches and export orders</List.Item>
          </List>
        </Stack>
        <Text c="white" opacity={0.8} size="sm">Rice Mill Management · v2</Text>
      </Box>

      <Stack justify="center" align="center" p={{ base: 'md', sm: 'xl' }} bg="white">
        <Paper w="100%" maw={400} p={{ base: 'lg', sm: 'xl' }} radius="lg" shadow="sm" withBorder>
          <Stack gap="lg" component="form" onSubmit={submit}>
            <Stack gap={4}>
              <Group gap="xs" hiddenFrom="md">
                <ThemeIcon variant="gradient" radius="md"><Sprout size={18} /></ThemeIcon>
                <Text fw={800}>Mill System</Text>
              </Group>
              <Title order={2}>Welcome back</Title>
              <Text c="dimmed" size="sm">Sign in to manage your mill.</Text>
            </Stack>
            <TextInput label="Username" placeholder="Enter username" leftSection={<User size={16} />} required autoComplete="username"
              value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <PasswordInput label="Password" placeholder="Enter password" leftSection={<Lock size={16} />} required autoComplete="current-password"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            {error && <ErrorAlert>{error}</ErrorAlert>}
            <Button type="submit" size="md" loading={loading} fullWidth variant="gradient">Sign in</Button>
            <Text size="xs" c="dimmed" ta="center">
              Prefer the old look? <Anchor href="/login" size="xs">Use the classic UI</Anchor>
            </Text>
          </Stack>
        </Paper>
      </Stack>
    </SimpleGrid>
  )
}
