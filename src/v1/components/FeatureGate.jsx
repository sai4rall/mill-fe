import { useFeatures } from '../../shared/features/useFeatures'
import ModuleNotEnabled from './ModuleNotEnabled'

/** Renders the module only when its feature is enabled; otherwise a "not enabled yet" page (the module never mounts). */
export default function FeatureGate({ feature, name, children }) {
  const { isLoading, flag } = useFeatures()
  if (isLoading) return <p className="text-slate-400 text-center py-20">Loading...</p>
  const f = flag(feature)
  if (!f.enabled) return <ModuleNotEnabled name={f.name || name} />
  return children
}
