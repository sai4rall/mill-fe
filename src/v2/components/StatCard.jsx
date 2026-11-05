import { Card, Group, Text, ThemeIcon } from '@mantine/core'

export default function StatCard({ label, value, unit = 'Qtl', icon: Icon, color = 'leaf', hint }) {
  return (
    <Card padding="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={0.4}>{label}</Text>
          <Group gap={6} align="baseline" mt={6}>
            <Text fz={28} fw={800} className="v2-num" lh={1}>{Number(value || 0).toFixed(2)}</Text>
            {unit && <Text size="sm" c="dimmed" fw={500}>{unit}</Text>}
          </Group>
          {hint && <Text size="xs" c="dimmed" mt={6}>{hint}</Text>}
        </div>
        {Icon && (
          <ThemeIcon variant="light" color={color} size={44} radius="md">
            <Icon size={22} />
          </ThemeIcon>
        )}
      </Group>
    </Card>
  )
}
