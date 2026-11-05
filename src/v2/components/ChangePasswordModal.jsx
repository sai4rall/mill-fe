import { Alert, Button, Group, Modal, PasswordInput, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useChangePassword } from '../../shared/hooks/useChangePassword'
import { PASSWORD_HINT } from '../../shared/utils/passwordPolicy'

export default function ChangePasswordModal({ opened, onClose }) {
  const { values, errors, saving, setField, submit, reset } = useChangePassword({
    onSuccess: () => {
      notifications.show({ color: 'leaf', title: 'Password changed', message: 'Other devices have been signed out.' })
      onClose()
    },
  })
  const close = () => { reset(); onClose() }
  return (
    <Modal opened={opened} onClose={close} title="Change password" centered>
      <form onSubmit={submit} noValidate>
        <Stack gap="sm">
          <PasswordInput label="Current password" autoComplete="current-password" value={values.currentPassword}
            onChange={setField('currentPassword')} error={errors.currentPassword} data-autofocus />
          <PasswordInput label="New password" autoComplete="new-password" description={PASSWORD_HINT}
            value={values.newPassword} onChange={setField('newPassword')} error={errors.newPassword} />
          <PasswordInput label="Confirm new password" autoComplete="new-password" value={values.confirmPassword}
            onChange={setField('confirmPassword')} error={errors.confirmPassword} />
          {errors.form && <Alert color="red" variant="light" role="alert">{errors.form}</Alert>}
          <Text size="xs" c="dimmed">You will stay signed in here; other devices will be signed out.</Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button type="submit" loading={saving}>Change password</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
