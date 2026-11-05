import { useQuery } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from '@/v3/ui/avatar'
import { cn } from '@/v3/lib/utils'
import { getFarmerPhoto } from '../../shared/api/mill'
import { useObjectUrl } from '../../shared/utils/useObjectUrl'

// Photo endpoints need the auth header, so the image is fetched as a blob.
export default function FarmerAvatar({ farmer, className = 'size-9' }) {
  const { data: blob } = useQuery({
    queryKey: ['farmer-photo', farmer.id, farmer.photoUpdatedAt],
    queryFn: () => getFarmerPhoto(farmer.id, farmer.photoUpdatedAt),
    enabled: !!farmer.photoUpdatedAt, staleTime: Infinity,
  })
  const url = useObjectUrl(blob)
  const initials = farmer.name?.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <Avatar className={cn('shrink-0', className)}>
      {url && <AvatarImage src={url} alt={farmer.name} className="object-cover" />}
      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">{initials || '?'}</AvatarFallback>
    </Avatar>
  )
}
