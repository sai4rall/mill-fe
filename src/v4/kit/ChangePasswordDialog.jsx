import { Button } from '@heroui/react'
import { KeyRound } from 'lucide-react'
import { useChangePassword } from '../../shared/hooks/useChangePassword'
import { PASSWORD_HINT } from '../../shared/utils/passwordPolicy'
import { notify } from '../lib/toast'
import { ErrorAlert } from './display'
import { PasswordInput } from './fields'
import { Dialog, SubmitButton } from './overlays'

export default function ChangePasswordDialog({ open, onClose }) {
  const { values, errors, saving, setField, submit, reset } = useChangePassword({
    onSuccess: () => { notify('Password changed. Other devices have been signed out.'); onClose() },
  })
  const close = () => { reset(); onClose() }
  // useChangePassword expects input events; HeroUI fields give plain values.
  const set = (key) => (value) => setField(key)({ target: { value } })
  return (
    <Dialog open={open} onClose={close} onSubmit={submit} title="Change password" icon={<KeyRound className="size-5" />}
      description="You will stay signed in here; other devices will be signed out." size="sm:max-w-md"
      footer={<><Button variant="tertiary" onPress={close}>Cancel</Button><SubmitButton pending={saving}>Change password</SubmitButton></>}>
      <PasswordInput label="Current password" autoComplete="current-password" value={values.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
      <PasswordInput label="New password" autoComplete="new-password" value={values.newPassword} onChange={set('newPassword')} error={errors.newPassword} hint={PASSWORD_HINT} />
      <PasswordInput label="Confirm new password" autoComplete="new-password" value={values.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
      {errors.form && <ErrorAlert>{errors.form}</ErrorAlert>}
    </Dialog>
  )
}
