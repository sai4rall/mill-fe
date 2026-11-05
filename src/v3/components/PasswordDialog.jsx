import { useState } from 'react'
import { Check, Copy, Eye, EyeOff, KeyRound } from 'lucide-react'
import { Alert, AlertDescription } from '@/v3/ui/alert'
import { Button } from '@/v3/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v3/ui/dialog'

/** Shows a one-time generated password with copy and reveal. */
export default function PasswordDialog({ open, onClose, title = 'Password', username, password, message }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(password || ''); setCopied(true) } catch { /* clipboard blocked */ } }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {username && <p className="text-sm">Username: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{username}</code></p>}
        <Alert className="border-amber-200 bg-amber-50 text-amber-800"><KeyRound /><AlertDescription className="text-amber-800">{message || 'Save this password now — it will not be shown again.'}</AlertDescription></Alert>
        <div className="flex items-center gap-2 rounded-lg border p-2 pl-3">
          <span className="flex-1 font-mono font-semibold tracking-wider" aria-label="Generated password">{visible ? password : '•'.repeat(password?.length || 0)}</span>
          <Button type="button" variant="ghost" size="icon" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
            {visible ? <EyeOff /> : <Eye />}
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy password">{copied ? <Check className="text-primary" /> : <Copy />}</Button>
        </div>
        <DialogFooter><Button className="w-full" onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
