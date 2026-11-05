import { Button, Group, PinInput, Stack, Text } from '@mantine/core'

/** 6-digit OTP entry with a resend button that counts down. */
export default function OtpEntry({ sentTo, value, onChange, onResend, cooldown, resending, label = 'Enter the 6-digit OTP' }) {
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>{label}</Text>
      <Group gap="sm" wrap="wrap">
        <PinInput length={6} type="number" oneTimeCode inputMode="numeric" placeholder="" value={value} onChange={onChange}
          aria-label="OTP" getInputProps={(index) => ({ 'aria-label': `OTP digit ${index + 1}` })} />
        <Button variant="subtle" size="compact-sm" onClick={onResend} disabled={cooldown > 0 || resending}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
        </Button>
      </Group>
      {sentTo && <Text size="xs" c="dimmed">Sent to +91 {sentTo}. Valid for 5 minutes.</Text>}
    </Stack>
  )
}
