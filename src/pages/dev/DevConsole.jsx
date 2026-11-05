import { useState } from 'react'
import { ToggleRight, Image, ShieldCheck } from 'lucide-react'
import FeatureFlagsPanel from './FeatureFlagsPanel'
import MillLogosPanel from './MillLogosPanel'
import SuperAdminsPanel from './SuperAdminsPanel'

const TABS = [
  { id: 'flags', label: 'Feature Flags', icon: ToggleRight, Panel: FeatureFlagsPanel },
  { id: 'logos', label: 'Mill Logos', icon: Image, Panel: MillLogosPanel },
  { id: 'supers', label: 'Super Admins', icon: ShieldCheck, Panel: SuperAdminsPanel },
]

export default function DevConsole() {
  const [tab, setTab] = useState('flags')
  const { Panel } = TABS.find(t => t.id === tab)

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dev Console</h1>
      <div role="tablist" className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      <div role="tabpanel"><Panel /></div>
    </div>
  )
}
