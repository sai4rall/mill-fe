import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/v3/ui/alert'
import { errorMessage } from '../lib/format'

/** Shows an API error (or plain children). Renders nothing when there is neither. */
export default function ErrorAlert({ error, children }) {
  if (!error && !children) return null
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle />
      <AlertDescription>{children || errorMessage(error)}</AlertDescription>
    </Alert>
  )
}
