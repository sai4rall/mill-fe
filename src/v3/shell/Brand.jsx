import { useQuery } from '@tanstack/react-query'
import { getBranding, getMillLogo } from '../../shared/api/mill'
import { useObjectUrl } from '../../shared/utils/useObjectUrl'
import { BrandMark } from './nav'

/** Mill logo + name for mill users; app mark otherwise. */
export default function Brand({ isMillUser }) {
  const { data: branding } = useQuery({ queryKey: ['branding'], queryFn: getBranding, enabled: isMillUser, staleTime: 5 * 60_000 })
  const version = branding?.logoUpdatedAt
  const { data: blob } = useQuery({ queryKey: ['mill-logo', version], queryFn: () => getMillLogo(version), enabled: isMillUser && !!version, staleTime: Infinity })
  const logoUrl = useObjectUrl(blob)
  const title = (isMillUser && branding?.millName) || 'Mill System'
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {logoUrl
        ? <img src={logoUrl} alt={`${title} logo`} className="size-8 shrink-0 rounded-lg object-contain" />
        : <div aria-label="Mill System" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm"><BrandMark className="size-4" /></div>}
      <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="truncate text-xs text-muted-foreground">Rice Mill Management</span>
      </div>
    </div>
  )
}
