import { Button } from '@/v3/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/v3/ui/input-otp'

/** 6-digit OTP boxes with a resend countdown. */
export default function OtpField({ label = 'Enter the 6-digit OTP', value, onChange, onResend, cooldown, resending, sentTo }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <InputOTP maxLength={6} value={value} onChange={onChange} autoFocus aria-label="OTP" inputMode="numeric" pattern="^[0-9]*$">
          <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} className="size-10 text-base" />)}</InputOTPGroup>
        </InputOTP>
        <Button type="button" variant="link" size="sm" className="px-0" onClick={onResend} disabled={cooldown > 0 || resending}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
        </Button>
      </div>
      {sentTo && <p className="text-xs text-muted-foreground">Sent to +91 {sentTo}. Valid for 5 minutes.</p>}
    </div>
  )
}
