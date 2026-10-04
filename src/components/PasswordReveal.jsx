import { useState } from 'react'
import { Copy, Check, Eye, EyeOff } from 'lucide-react'

export default function PasswordReveal({ password, message }) {
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 my-3">
      <p className="text-amber-800 text-sm font-semibold mb-3">
        {message || 'Save this password — it will not be shown again.'}
      </p>
      <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-2">
        <code className="flex-1 text-slate-800 font-mono text-sm tracking-wider">
          {visible ? password : '•'.repeat(password.length)}
        </code>
        <button onClick={() => setVisible(v => !v)} className="text-slate-500 hover:text-slate-700">
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button onClick={copy} className="text-slate-500 hover:text-emerald-600">
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
