import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getBranding, getMillLogo } from '../../shared/api/mill'
import { useObjectUrl } from '../../shared/utils/useObjectUrl'
import { BrandMark } from './nav'

/** Mill logo + name for mill users; app mark otherwise. */
export default function Brand({ isMillUser, compact }) {
  const { data: branding } = useQuery({ queryKey: ['branding'], queryFn: getBranding, enabled: isMillUser, staleTime: 5 * 60_000 })
  const version = branding?.logoUpdatedAt
  const { data: blob } = useQuery({ queryKey: ['mill-logo', version], queryFn: () => getMillLogo(version), enabled: isMillUser && !!version, staleTime: Infinity })
  const logoUrl = useObjectUrl(blob)
  const title = (isMillUser && branding?.millName) || 'Mill System'
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {logoUrl
        ? <img src={logoUrl} alt={`${title} logo`} className="size-9 shrink-0 rounded-xl object-contain" />
        : (
          <motion.div aria-label="Mill System" whileHover={{ rotate: -8, scale: 1.05 }}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-lg shadow-emerald-600/25">
            <BrandMark className="size-5" />
          </motion.div>
        )}
      {!compact && <span className="truncate font-bold tracking-tight">{title}</span>}
    </div>
  )
}
