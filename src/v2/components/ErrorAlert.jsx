import { Alert } from '@mantine/core'
import { AlertCircle } from 'lucide-react'
import { errorMessage } from '../../shared/utils/errors'

export default function ErrorAlert({ error, children, ...props }) {
  if (!error && !children) return null
  return (
    <Alert color="red" variant="light" icon={<AlertCircle size={18} />} {...props}>
      {children || errorMessage(error)}
    </Alert>
  )
}
