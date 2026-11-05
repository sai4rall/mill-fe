import { Stack, Text, ThemeIcon } from '@mantine/core'

export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <Stack align="center" gap="xs" py={48} px="md" ta="center">
      {Icon && (
        <ThemeIcon variant="light" size={56} radius="xl" color="leaf">
          <Icon size={26} />
        </ThemeIcon>
      )}
      <Text fw={600}>{title}</Text>
      {children && <Text size="sm" c="dimmed" maw={360}>{children}</Text>}
      {action}
    </Stack>
  )
}
