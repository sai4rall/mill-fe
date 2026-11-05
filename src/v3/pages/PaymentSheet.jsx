import { useState } from 'react'
import { AlertTriangle, Loader2, Send, ShieldCheck } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '@/v3/ui/alert'
import { Button } from '@/v3/ui/button'
import { Input } from '@/v3/ui/input'
import { Progress } from '@/v3/ui/progress'
import { Separator } from '@/v3/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/v3/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/v3/ui/tooltip'
import { createPayment, getPayments, sendPaymentOtp } from '../../shared/api/mill'
import { isFutureDate, todayISO } from '../../shared/utils/dates'
import DateField from '../components/DateField'
import ErrorAlert from '../components/ErrorAlert'
import Field from '../components/Field'
import OtpField from '../components/OtpField'
import SelectField from '../components/SelectField'
import { errorMessage, rupees, useCountdown } from '../lib/format'
import { notify } from '../lib/toast'

const MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'].map(m => ({ value: m, label: m.replace('_', ' ') }))

function Line({ label, value, className }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className={`v3-num font-medium ${className || ''}`}>{value}</span></div>
}

/**
 * Release a payment: the farmer gets an OTP for this exact amount on their verified mobile and reads it out.
 * Changing the amount invalidates the OTP.
 */
export default function PaymentSheet({ purchase, farmerVerified, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ amount: '', paymentDate: todayISO(), paymentMode: 'CASH', referenceNumber: '' })
  const [formError, setFormError] = useState('')
  const [otp, setOtp] = useState({ sentFor: null, phone: '', code: '' })
  const [cooldown, startCooldown] = useCountdown()
  const { data: payments = [] } = useQuery({ queryKey: ['payments', purchase?.id], queryFn: () => getPayments(purchase.id), enabled: !!purchase })

  const amount = Number(form.amount)
  const due = Number(purchase?.amountDue || 0)
  const total = Number(purchase?.totalAmount || 0)
  const otpActive = otp.sentFor !== null && otp.sentFor === amount

  const send = useMutation({
    mutationFn: () => sendPaymentOtp(purchase.id, amount),
    onSuccess: (r) => { setOtp({ sentFor: amount, phone: r.phone, code: '' }); startCooldown(30) },
  })
  const pay = useMutation({
    mutationFn: () => createPayment({ ...form, amount, purchaseId: purchase.id, otp: otp.code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['payments', purchase.id] })
      setForm(f => ({ ...f, amount: '', referenceNumber: '' }))
      setOtp({ sentFor: null, phone: '', code: '' })
      notify(`Payment of ${rupees(amount)} released to ${purchase.farmerName}`)
    },
  })

  const check = () => {
    if (!form.amount || !(amount > 0)) return 'Enter an amount greater than 0'
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount)) return 'Amount can have at most 2 decimals'
    if (amount > due) return `Amount exceeds the outstanding balance of ₹${due.toFixed(2)}`
    if (!form.paymentDate) return 'Payment date is required'
    if (isFutureDate(form.paymentDate)) return 'Payment date cannot be in the future'
    return ''
  }
  const requestOtp = () => { const p = check(); setFormError(p); if (!p) send.mutate() }
  const setField = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (k === 'amount') { send.reset(); pay.reset() } }
  const apiError = (send.isError && send.error) || (pay.isError && pay.error)

  return (
    <Sheet open={!!purchase} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {purchase && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>Payments — {purchase.farmerName}</SheetTitle>
              <SheetDescription>{purchase.purchaseDate} · {purchase.weightQuintals} Qtl</SheetDescription>
            </SheetHeader>
            <div className="grid content-start gap-5 overflow-y-auto p-4">
              <div className="grid gap-2 rounded-xl border bg-muted/40 p-4">
                {Number(purchase.deductionPct) > 0 && (
                  <Line label={`Moisture ${Number(purchase.moisturePct)}% deduction`} value={`−${Number(purchase.deductionPct)}% (${rupees(purchase.deductionAmount)})`} className="text-amber-700" />
                )}
                <Line label="Total" value={rupees(total)} />
                <Line label="Paid" value={rupees(purchase.amountPaid)} className="text-emerald-700" />
                <Line label="Due" value={rupees(due)} className="text-base font-semibold text-rose-600" />
                <Progress value={total ? (Number(purchase.amountPaid) / total) * 100 : 0} className="mt-1 h-1.5" aria-label="Paid so far" />
              </div>

              {payments.length > 0 && (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Payment history</p>
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="v3-num text-sm font-semibold">{rupees(p.amount)}</span>
                        <span className="text-xs text-muted-foreground">{p.paymentMode.replace('_', ' ')}</span>
                        {p.otpVerifiedAt && (
                          <Tooltip><TooltipTrigger asChild><ShieldCheck className="size-4 text-emerald-600" aria-label="Confirmed by farmer OTP" /></TooltipTrigger><TooltipContent>Confirmed by farmer OTP</TooltipContent></Tooltip>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{p.paymentDate}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3"><span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Release payment</span><Separator className="flex-1" /></div>
              {due <= 0 ? (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800"><ShieldCheck /><AlertDescription className="text-emerald-800">This purchase is fully paid.</AlertDescription></Alert>
              ) : !farmerVerified ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-800"><AlertTriangle /><AlertDescription className="text-amber-800">The farmer's mobile number is not verified. Verify it on the Farmers screen before releasing payments.</AlertDescription></Alert>
              ) : (
                <form noValidate className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (otpActive) pay.mutate(); else requestOtp() }}>
                  <div className="grid grid-cols-2 gap-3">
                    <Field id="pay-amount" label="Amount (₹)" required>
                      <Input id="pay-amount" inputMode="decimal" value={form.amount} onChange={e => setField('amount', e.target.value.trim())} />
                    </Field>
                    <Field id="pay-date" label="Payment date" required>
                      <DateField id="pay-date" value={form.paymentDate} onChange={v => setField('paymentDate', v)} />
                    </Field>
                    <Field id="pay-mode" label="Mode">
                      <SelectField id="pay-mode" options={MODES} value={form.paymentMode} onChange={v => setField('paymentMode', v)} />
                    </Field>
                    <Field id="pay-ref" label="Reference no.">
                      <Input id="pay-ref" value={form.referenceNumber} onChange={e => setField('referenceNumber', e.target.value)} />
                    </Field>
                  </div>
                  {formError && <p className="text-xs text-destructive" role="alert">{formError}</p>}
                  {otpActive ? (
                    <div className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <p className="text-sm">OTP for <b>{rupees(amount)}</b> sent to the farmer's mobile <span className="font-mono">+91 {otp.phone}</span>. Ask the farmer for it once they have received the payment.</p>
                      <OtpField label="Farmer's OTP" value={otp.code} cooldown={cooldown} resending={send.isPending} onResend={requestOtp} onChange={(code) => setOtp(o => ({ ...o, code }))} />
                      <Button type="submit" disabled={otp.code.length !== 6 || pay.isPending}>{pay.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}Confirm OTP & release payment</Button>
                    </div>
                  ) : (
                    <Button type="submit" disabled={send.isPending}>{send.isPending ? <Loader2 className="animate-spin" /> : <Send />}Send OTP to farmer</Button>
                  )}
                  {apiError && <ErrorAlert>{errorMessage(apiError)}</ErrorAlert>}
                </form>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
