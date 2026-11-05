import { useState } from 'react'
import { Alert, Button, ProgressBar } from '@heroui/react'
import { Send, ShieldCheck } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPayment, getPayments, sendPaymentOtp } from '../../shared/api/mill'
import { isFutureDate, todayISO } from '../../shared/utils/dates'
import { ErrorAlert, Section } from '../kit/display'
import { DateInput, SelectInput, TextInput } from '../kit/fields'
import { Panel } from '../kit/overlays'
import OtpInput from '../kit/OtpInput'
import { errorMessage, rupees, useCountdown } from '../lib/format'
import { notify } from '../lib/toast'

const MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'].map(m => ({ value: m, label: m.replace('_', ' ') }))

function Line({ label, value, className }) {
  return <div className="flex justify-between text-sm"><span className="text-muted">{label}</span><span className={`v4-num font-semibold ${className || ''}`}>{value}</span></div>
}

/**
 * Release a payment: the farmer gets an OTP for this exact amount on their verified mobile and reads it out.
 * Changing the amount invalidates the OTP.
 */
export default function PaymentPanel({ purchase, farmerVerified, onClose }) {
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

  const send = useMutation({ mutationFn: () => sendPaymentOtp(purchase.id, amount), onSuccess: (r) => { setOtp({ sentFor: amount, phone: r.phone, code: '' }); startCooldown(30) } })
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
    <Panel open={!!purchase} onClose={onClose} title={purchase ? `Payments — ${purchase.farmerName}` : ''} width="sm:w-[28rem]"
      description={purchase ? `${purchase.purchaseDate} · ${purchase.weightQuintals} Qtl` : ''}
      onSubmit={(e) => { e.preventDefault(); if (otpActive) pay.mutate(); else requestOtp() }}>
      {purchase && (
        <>
          <div className="grid gap-2 rounded-2xl border border-border bg-surface-secondary/50 p-4">
            {Number(purchase.deductionPct) > 0 && <Line label={`Moisture ${Number(purchase.moisturePct)}% deduction`} value={`−${Number(purchase.deductionPct)}% (${rupees(purchase.deductionAmount)})`} className="text-warning" />}
            <Line label="Total" value={rupees(total)} />
            <Line label="Paid" value={rupees(purchase.amountPaid)} className="text-success" />
            <Line label="Due" value={rupees(due)} className="text-base text-danger" />
            <ProgressBar aria-label="Paid so far" value={total ? (Number(purchase.amountPaid) / total) * 100 : 0} color="success" size="sm" className="mt-1">
              <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
            </ProgressBar>
          </div>

          {payments.length > 0 && (
            <div className="grid gap-2">
              <p className="text-sm font-semibold">Payment history</p>
              {payments.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="v4-num text-sm font-bold">{rupees(p.amount)}</span>
                    <span className="text-xs text-muted">{p.paymentMode.replace('_', ' ')}</span>
                    {p.otpVerifiedAt && <ShieldCheck className="size-4 text-success" aria-label="Confirmed by farmer OTP" />}
                  </div>
                  <span className="text-xs text-muted">{p.paymentDate}</span>
                </motion.div>
              ))}
            </div>
          )}

          <Section>Release payment</Section>
          {due <= 0 ? (
            <Alert status="success"><Alert.Indicator /><Alert.Content><Alert.Description>This purchase is fully paid.</Alert.Description></Alert.Content></Alert>
          ) : !farmerVerified ? (
            <Alert status="warning"><Alert.Indicator /><Alert.Content><Alert.Description>The farmer's mobile number is not verified. Verify it on the Farmers screen before releasing payments.</Alert.Description></Alert.Content></Alert>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput label="Amount (₹)" required inputMode="decimal" value={form.amount} onChange={v => setField('amount', v.trim())} />
                <DateInput label="Payment date" required value={form.paymentDate} onChange={v => setField('paymentDate', v)} />
                <SelectInput label="Mode" options={MODES} value={form.paymentMode} onChange={v => setField('paymentMode', v || 'CASH')} />
                <TextInput label="Reference no." value={form.referenceNumber} onChange={v => setField('referenceNumber', v)} />
              </div>
              {formError && <p className="text-xs text-danger" role="alert">{formError}</p>}
              <AnimatePresence mode="wait">
                {otpActive ? (
                  <motion.div key="otp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="grid gap-3 rounded-2xl border border-success/30 bg-success-soft/40 p-4">
                    <p className="text-sm">OTP for <b>{rupees(amount)}</b> sent to the farmer's mobile <span className="font-mono">+91 {otp.phone}</span>. Ask the farmer for it once they have received the payment.</p>
                    <OtpInput label="Farmer's OTP" value={otp.code} cooldown={cooldown} resending={send.isPending} onResend={requestOtp} onChange={(code) => setOtp(o => ({ ...o, code }))} />
                    <Button type="submit" isDisabled={otp.code.length !== 6} isPending={pay.isPending}><ShieldCheck className="size-4" />Confirm OTP & release payment</Button>
                  </motion.div>
                ) : (
                  <motion.div key="send" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button type="submit" fullWidth isPending={send.isPending}><Send className="size-4" />Send OTP to farmer</Button>
                  </motion.div>
                )}
              </AnimatePresence>
              {apiError && <ErrorAlert>{errorMessage(apiError)}</ErrorAlert>}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}
