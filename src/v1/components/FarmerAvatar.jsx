import { useQuery } from '@tanstack/react-query'
import { getFarmerPhoto } from '../../shared/api/mill'
import { useObjectUrl } from '../../shared/utils/useObjectUrl'

// Photo endpoints need the auth header, so the image is fetched as a blob rather than via <img src>.
export default function FarmerAvatar({ farmer, size = 'w-9 h-9' }) {
  const { data: blob } = useQuery({
    queryKey: ['farmer-photo', farmer.id, farmer.photoUpdatedAt],
    queryFn: () => getFarmerPhoto(farmer.id, farmer.photoUpdatedAt),
    enabled: !!farmer.photoUpdatedAt,
    staleTime: Infinity,
  })
  const url = useObjectUrl(blob)

  if (url) return <img src={url} alt={farmer.name} className={`${size} rounded-full object-cover border border-slate-200 shrink-0`} />
  const initials = farmer.name?.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className={`${size} rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-semibold shrink-0`}>
      {initials || '?'}
    </div>
  )
}
