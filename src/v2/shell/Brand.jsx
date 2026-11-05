import { Group, Image, Text, ThemeIcon } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Sprout } from 'lucide-react'
import { getBranding, getMillLogo } from '../../shared/api/mill'
import { useObjectUrl } from '../../shared/utils/useObjectUrl'

/** Mill logo + name for mill users; app mark otherwise. */
export default function Brand({ isMillUser }) {
  const { data: branding } = useQuery({ queryKey: ['branding'], queryFn: getBranding, enabled: isMillUser, staleTime: 5 * 60_000 })
  const version = branding?.logoUpdatedAt
  const { data: blob } = useQuery({
    queryKey: ['mill-logo', version], queryFn: () => getMillLogo(version), enabled: isMillUser && !!version, staleTime: Infinity,
  })
  const logoUrl = useObjectUrl(blob)
  const title = (isMillUser && branding?.millName) || 'Mill System'
  return (
    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
      {logoUrl
        ? <Image src={logoUrl} alt={`${title} logo`} h={36} w={36} fit="contain" radius="md" />
        : <ThemeIcon size={36} radius="md" variant="gradient" aria-label="Mill System"><Sprout size={20} /></ThemeIcon>}
      <div style={{ minWidth: 0 }}>
        <Text fw={800} size="md" truncate="end" lh={1.1}>{title}</Text>
        <Text size="xs" c="dimmed" lh={1.1}>Rice Mill Management</Text>
      </div>
    </Group>
  )
}
