import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { getFeatures } from '../api/features'

// Modules not returned by the API (or when the API fails) are treated as shown + enabled.
// The backend still blocks disabled modules, so failing open here never exposes a disabled module's data.
const DEFAULT_FLAG = { showInMenu: true, enabled: true }

/**
 * Feature flags from GET /api/features, refreshed every minute and on window focus: a mill user's effective
 * flags for their mill, or the global flags for the super admin. The dev admin is never gated.
 */
export function useFeatures() {
  const { user } = useAuth()
  const isMillUser = ['MILL_ADMIN', 'MILL_OPERATOR', 'SUPER_ADMIN'].includes(user?.role)
  const { data, isLoading } = useQuery({
    queryKey: ['features', user?.username, user?.millId],
    queryFn: getFeatures,
    enabled: isMillUser,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  const byKey = Object.fromEntries((data || []).map(f => [f.key, f]))
  return {
    isLoading: isMillUser && isLoading,
    flag: (key) => ({ ...DEFAULT_FLAG, ...byKey[key] }),
  }
}
