import { Lock } from 'lucide-react'

export default function ModuleNotEnabled({ name }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-amber-500" />
        </div>
        <h1 className="text-xl font-semibold text-slate-800">{name ? `${name} is not enabled yet` : 'This module is not enabled yet'}</h1>
        <p className="text-slate-500 text-sm mt-2">
          This module will be enabled in a future release. Please contact your administrator if you need access sooner.
        </p>
      </div>
    </div>
  )
}
