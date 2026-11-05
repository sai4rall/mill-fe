import { Badge } from '@mantine/core'

const COLORS = {
  PENDING: 'yellow', PARTIAL: 'blue', PAID: 'leaf', FULFILLED: 'leaf', CANCELLED: 'red',
  IN_PROGRESS: 'blue', COMPLETED: 'leaf', ACTIVE: 'leaf', INACTIVE: 'gray',
}

export default function StatusBadge({ status }) {
  if (!status) return null
  return <Badge color={COLORS[status] || 'gray'}>{status.replaceAll('_', ' ')}</Badge>
}
