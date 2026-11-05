import { Loader2 } from 'lucide-react'
import { Button } from '@/v3/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/v3/ui/dialog'
import { useChangePassword } from '../../shared/hooks/useChangePassword'
import { PASSWORD_HINT } from '../../shared/utils/passwordPolicy'
import { notify } from '../lib/toast'
import ErrorAlert from './ErrorAlert'
import Field from './Field'
import PasswordInput from './PasswordInput'

export default function ChangePasswordDialog({ open, onClose }) {
  const { values, errors, saving, setField, submit, reset } = useChangePassword({
    onSuccess: () => { notify('Password changed. Other devices have been signed out.'); onClose() },
  })
  const close = () => { reset(); onClose() }
  const field = (key, label, autoComplete, hint) => (
    <Field id={`cp-${key}`} label={label} error={errors[key]} hint={hint}>
      <PasswordInput id={`cp-${key}`} label={label} autoComplete={autoComplete} value={values[key]} onChange={setField(key)}
        aria-invalid={!!errors[key] || undefined} />
    </Field>
  )
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>You will stay signed in here; other devices will be signed out.</DialogDescription>
          </DialogHeader>
          {field('currentPassword', 'Current password', 'current-password')}
          {field('newPassword', 'New password', 'new-password', PASSWORD_HINT)}
          {field('confirmPassword', 'Confirm new password', 'new-password')}
          {errors.form && <ErrorAlert>{errors.form}</ErrorAlert>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Change password</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
