import { useQuery } from '@tanstack/react-query'
import { getBranding } from '../../shared/api/mill'

/** The mill's display name (for receipts). Shares the cached branding query with the header. */
export function useMillName() {
  const { data } = useQuery({ queryKey: ['branding'], queryFn: getBranding, staleTime: 5 * 60_000 })
  return data?.millName || 'Mill'
}
