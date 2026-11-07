import { useState } from 'react'
import { Alert, Button } from '@heroui/react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { Dialog } from './overlays'

/** Shows a one-time generated password with copy and reveal. */
export default function PasswordReveal({ open, onClose, title = 'Password', username, password, message }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(password || ''); setCopied(true) } catch { /* clipboard blocked */ } }
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm:max-w-md" footer={<Button fullWidth onPress={onClose}>Done</Button>}>
      {username && <p className="text-sm">Username: <code className="rounded-field bg-surface-secondary px-1.5 py-0.5 font-mono">{username}</code></p>}
      <Alert status="warning"><Alert.Indicator /><Alert.Content><Alert.Description>{message || 'Save this password now — it will not be shown again.'}</Alert.Description></Alert.Content></Alert>
      <div className="flex items-center gap-2 rounded-card border border-border p-2 pl-4">
        <span className="flex-1 font-mono font-semibold tracking-wider" aria-label="Generated password">{visible ? password : '•'.repeat(password?.length || 0)}</span>
        <Button isIconOnly size="sm" variant="ghost" onPress={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
        <Button isIconOnly size="sm" variant="secondary" onPress={copy} aria-label="Copy password">{copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}</Button>
      </div>
    </Dialog>
  )
}
