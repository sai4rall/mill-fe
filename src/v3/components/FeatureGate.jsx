import { Lock } from 'lucide-react'
import { useFeatures } from '../../shared/features/useFeatures'
import Loading from './Loading'

export function ModuleNotEnabled({ name }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Lock className="size-7" /></div>
      <h2 className="text-lg font-semibold">{name ? `${name} is not enabled yet` : 'This module is not enabled yet'}</h2>
      <p className="text-sm text-muted-foreground">This module will be enabled in a future release. Please contact your administrator if you need access sooner.</p>
    </div>
  )
}

/** Renders the module only when its feature flag is enabled; otherwise a "not enabled yet" page. */
export default function FeatureGate({ feature, name, children }) {
  const { isLoading, flag } = useFeatures()
  if (isLoading) return <Loading />
  const f = flag(feature)
  if (!f.enabled) return <ModuleNotEnabled name={f.name || name} />
  return children
}
