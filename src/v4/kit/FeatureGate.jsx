import { Lock } from 'lucide-react'
import { motion } from 'motion/react'
import { useFeatures } from '../../shared/features/useFeatures'
import { rise } from '../lib/motion'
import { Loading } from './display'

export function ModuleNotEnabled({ name }) {
  return (
    <motion.div variants={rise} initial="initial" animate="animate" className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-card bg-warning-soft text-warning-soft-foreground"><Lock className="size-7" /></div>
      <h2 className="text-xl font-bold">{name ? `${name} is not enabled yet` : 'This module is not enabled yet'}</h2>
      <p className="text-sm text-muted">This module will be enabled in a future release. Please contact your administrator if you need access sooner.</p>
    </motion.div>
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
