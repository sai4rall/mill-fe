import { Group, Stack, Text, Title } from '@mantine/core'

export default function PageHeader({ title, description, actions, icon }) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md" mb="lg">
      <Group gap="sm" wrap="nowrap" align="center">
        {icon}
        <Stack gap={2}>
          <Title order={2} fz={{ base: 22, sm: 26 }}>{title}</Title>
          {description && <Text c="dimmed" size="sm">{description}</Text>}
        </Stack>
      </Group>
      {actions && <Group gap="sm" wrap="wrap">{actions}</Group>}
    </Group>
  )
}
