import { Loader2 } from 'lucide-react'

export default function Loading({ className = 'py-16' }) {
  return <div className={`flex justify-center ${className}`} role="status" aria-label="Loading"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
}
