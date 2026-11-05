import { Button, InputOTP } from '@heroui/react'

/** 6-digit OTP boxes with a resend countdown. */
export default function OtpInput({ label = 'Enter the 6-digit OTP', value, onChange, onResend, cooldown, resending, sentTo }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <InputOTP maxLength={6} value={value} onChange={onChange} autoFocus aria-label="OTP" inputMode="numeric">
          <InputOTP.Group>{[0, 1, 2, 3, 4, 5].map(i => <InputOTP.Slot key={i} index={i} />)}</InputOTP.Group>
        </InputOTP>
        <Button size="sm" variant="ghost" onPress={onResend} isDisabled={cooldown > 0 || resending}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
        </Button>
      </div>
      {sentTo && <p className="text-xs text-muted">Sent to +91 {sentTo}. Valid for 5 minutes.</p>}
    </div>
  )
}
