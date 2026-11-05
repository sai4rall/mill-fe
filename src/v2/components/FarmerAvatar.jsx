import { Avatar } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { getFarmerPhoto } from '../../shared/api/mill'
import { useObjectUrl } from '../../shared/utils/useObjectUrl'

const initials = (name = '') => name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

export default function FarmerAvatar({ farmer, size = 36 }) {
  const { data: blob } = useQuery({
    queryKey: ['farmer-photo', farmer.id, farmer.photoUpdatedAt],
    queryFn: () => getFarmerPhoto(farmer.id, farmer.photoUpdatedAt),
    enabled: !!farmer.photoUpdatedAt,
    staleTime: Infinity,
  })
  const url = useObjectUrl(blob)
  return (
    <Avatar src={url} alt={farmer.name} size={size} radius="xl" color="leaf" variant="light">
      {initials(farmer.name)}
    </Avatar>
  )
}
