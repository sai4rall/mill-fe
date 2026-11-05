import { useQuery } from '@tanstack/react-query'
import { Factory } from 'lucide-react'
import { getBranding, getMillLogo } from '../api/mill'
import { useObjectUrl } from '../utils/useObjectUrl'

/**
 * Top-left brand. Mill users see their mill's uploaded logo and name; everyone else (and mills
 * without a logo) see the default app mark.
 */
export default function MillBrand({ isMillUser }) {
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: getBranding,
    enabled: isMillUser,
    staleTime: 5 * 60_000,
  })
  const version = branding?.logoUpdatedAt
  const { data: blob } = useQuery({
    queryKey: ['mill-logo', version],
    queryFn: () => getMillLogo(version),
    enabled: isMillUser && !!version,
    staleTime: Infinity,
  })
  const logoUrl = useObjectUrl(blob)
  const title = (isMillUser && branding?.millName) || 'Mill System'

  return (
    <div className="flex items-center gap-2 min-w-0">
      {logoUrl
        ? <img src={logoUrl} alt={`${title} logo`} className="h-10 w-10 object-contain rounded shrink-0" />
        : <Factory aria-label="Mill System" className="w-6 h-6 text-emerald-600 shrink-0" />}
      <span className="font-bold text-slate-800 text-lg truncate" title={title}>{title}</span>
    </div>
  )
}
