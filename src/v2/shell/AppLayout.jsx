import { AppShell, Avatar, Badge, Burger, Group, Menu, NavLink, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useEffect } from 'react'
import { NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, KeyRound, LogOut, MonitorSmartphone } from 'lucide-react'
import { useAuth } from '../../shared/context/AuthContext'
import { useFeatures } from '../../shared/features/useFeatures'
import Brand from './Brand'
import ChangePasswordModal from '../components/ChangePasswordModal'
import { visibleNav } from './nav'
import { v2 } from '../lib/paths'

const ROLE_COLOR = { DEV_ADMIN: 'orange', SUPER_ADMIN: 'grape', MILL_ADMIN: 'leaf', MILL_OPERATOR: 'blue' }
const initials = (s = '') => s.split(/[\s_]+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const { flag } = useFeatures()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [opened, { toggle, close }] = useDisclosure(false)
  useEffect(() => { close() }, [pathname, close])

  const isMillUser = user?.role === 'MILL_ADMIN' || user?.role === 'MILL_OPERATOR'
  const groups = visibleNav(user, flag)
  const handleLogout = () => { logout(); navigate(v2('/login')) }
  const [pwOpen, pw] = useDisclosure(false)
  const displayName = user?.fullName || user?.username

  return (
    <AppShell className="v2-root" header={{ height: 64 }} padding={{ base: 'md', sm: 'lg', lg: 'xl' }}
      navbar={{ width: 264, breakpoint: 'sm', collapsed: { mobile: !opened } }}>
      <ChangePasswordModal opened={pwOpen} onClose={pw.close} />
      <AppShell.Header px="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label={opened ? 'Close menu' : 'Open menu'} />
            <Brand isMillUser={isMillUser} />
          </Group>
          <Menu position="bottom-end" width={220} shadow="md">
            <Menu.Target>
              <UnstyledButton aria-label="Account menu">
                <Group gap={8} wrap="nowrap">
                  <Avatar radius="xl" color={ROLE_COLOR[user?.role] || 'leaf'} variant="light" size={36}>{initials(displayName)}</Avatar>
                  <Stack gap={0} visibleFrom="sm">
                    <Text size="sm" fw={600} lh={1.2} truncate="end" maw={160}>{displayName}</Text>
                    <Text size="xs" c="dimmed" lh={1.2}>{user?.role?.replaceAll('_', ' ').toLowerCase()}</Text>
                  </Stack>
                  <ChevronDown size={16} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{displayName}</Menu.Label>
              <Menu.Item leftSection={<KeyRound size={16} />} onClick={pw.open}>Change password</Menu.Item>
              <Menu.Item component="a" href="/" leftSection={<MonitorSmartphone size={16} />}>Classic UI</Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<LogOut size={16} />} onClick={handleLogout}>Logout</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" style={{ borderRight: '1px solid var(--mantine-color-gray-2)' }}>
        <AppShell.Section grow component={ScrollArea} type="scroll">
          <nav aria-label="Main navigation">
            <Stack gap="md">
              {groups.map(g => (
                <div key={g.group}>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.6} px="sm" mb={4}>{g.group}</Text>
                  {g.items.map(({ to, label, icon: Icon, feature, end }) => (
                    <NavLink key={to} component={RouterNavLink} to={to} end={end} label={label}
                      leftSection={<Icon size={18} />}
                      rightSection={feature && !flag(feature).enabled ? <Badge size="xs" color="yellow">Soon</Badge> : null}
                      active={end ? pathname === to : pathname.startsWith(to)}
                      variant="light" style={{ borderRadius: 8 }} fw={500} />
                  ))}
                </div>
              ))}
            </Stack>
          </nav>
        </AppShell.Section>
        <AppShell.Section pt="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          <Group gap="xs" px="sm" py={6}>
            <Badge color={ROLE_COLOR[user?.role] || 'leaf'}>{user?.role?.replaceAll('_', ' ')}</Badge>
          </Group>
          <NavLink label="Logout" leftSection={<LogOut size={18} />} onClick={handleLogout} c="red.7" style={{ borderRadius: 8 }} />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
