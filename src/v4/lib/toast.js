import { toast } from '@heroui/react'

/** notify('Saved') or notify(message, 'error'). Backed by HeroUI's toast queue. */
export function notify(message, kind = 'success') {
  toast(message, { variant: kind === 'error' ? 'danger' : 'success', timeout: 4000 })
}
