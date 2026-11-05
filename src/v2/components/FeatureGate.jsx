import { Center, Loader, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { Lock } from 'lucide-react'
import { useFeatures } from '../../shared/features/useFeatures'

export function ModuleNotEnabled({ name }) {
  return (
    <Center py={80}>
      <Stack align="center" gap="sm" maw={420} ta="center">
        <ThemeIcon size={64} radius="xl" variant="light" color="yellow"><Lock size={30} /></ThemeIcon>
        <Title order={3}>{name ? `${name} is not enabled yet` : 'This module is not enabled yet'}</Title>
        <Text c="dimmed" size="sm">
          This module will be enabled in a future release. Please contact your administrator if you need access sooner.
        </Text>
      </Stack>
    </Center>
  )
}

/** Renders the module only when its feature flag is enabled; otherwise a "not enabled yet" page. */
export default function FeatureGate({ feature, name, children }) {
  const { isLoading, flag } = useFeatures()
  if (isLoading) return <Center py={80}><Loader /></Center>
  const f = flag(feature)
  if (!f.enabled) return <ModuleNotEnabled name={f.name || name} />
  return children
}
