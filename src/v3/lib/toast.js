import { toast } from 'sonner'

/** `const notify = useToast(); notify('Saved')` or `notify(message, 'error')`. Backed by sonner. */
export const useToast = () => notify
export function notify(message, kind = 'success') {
  if (kind === 'error') toast.error(message)
  else toast.success(message)
}
