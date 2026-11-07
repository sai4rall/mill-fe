import { useState } from 'react'
import { Alert, Button, ProgressBar } from '@heroui/react'
import { MessageCircle, Send, Share2, ShieldCheck } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPayment, getPayments, sendPaymentOtp } from '../../shared/api/mill'
import { isFutureDate, todayISO } from '../../shared/utils/dates'
import { ErrorAlert, Section, StatusChip } from '../kit/display'
import { DateInput, SelectInput, TextInput } from '../kit/fields'
import { Panel } from '../kit/overlays'
import OtpInput from '../kit/OtpInput'
import { cx, errorMessage, useCountdown } from '../lib/format'
import { date, money, num, qty } from '../lib/numbers'
import { paymentReceipt, purchaseReceipt, shareReceipt, whatsappLink } from '../lib/receipt'
import { notify } from '../lib/toast'
import { useMillName } from '../lib/useMillName'

const MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'].map(m => ({ value: m, label: m.replace('_', ' ') }))

function Line({ label, value, className }) {
  return <div className="flex justify-between gap-3 text-sm"><span className="text-muted">{label}</span><span className={cx('v4-num text-right font-semibold', className)}>{value}</span></div>
}

function ShareButtons({ receipt, label }) {
  const share = async () => {
    try { await shareReceipt(receipt) } catch (e) { if (e?.name !== 'AbortError') notify('Could not share the receipt', 'danger') }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onPress={share} aria-label={`Share ${label}`}><Share2 className="size-3.5" />Share receipt</Button>
      <a href={whatsappLink(receipt)} target="_blank" rel="noreferrer" aria-label={`Send ${label} on WhatsApp`}
        className="inline-flex h-8 items-center gap-1.5 rounded-field border border-border px-3 text-sm font-medium hover:bg-surface-secondary">
        <MessageCircle className="size-3.5" />WhatsApp
      </a>
    </div>
  )
}

/**
 * One purchase: what was weighed and priced, what has been paid, and releasing the next payment. The farmer gets an
 * OTP for this exact amount on their verified mobile and reads it out; changing the amount invalidates it.
 * Every purchase and payment has a receipt that can be shared (WhatsApp or the phone's share sheet).
 */
export default function PurchaseSheet({ purchase, farmerVerified, onClose }) {
  const qc = useQueryClient()
  const millName = useMillName()
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
      qc.invalidateQueries({ queryKey: ['payments'] })
      setForm(f => ({ ...f, amount: '', referenceNumber: '' }))
      setOtp({ sentFor: null, phone: '', code: '' })
      notify(`Payment of ${money(amount)} released to ${purchase.farmerName}`)
    },
  })

  const check = () => {
    if (!form.amount || !(amount > 0)) return 'Enter an amount greater than 0'
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount)) return 'Amount can have at most 2 decimals'
    if (amount > due) return `Amount exceeds the outstanding balance of ${money(due)}`
    if (!form.paymentDate) return 'Payment date is required'
    if (isFutureDate(form.paymentDate)) return 'Payment date cannot be in the future'
    return ''
  }
  const requestOtp = () => { const p = check(); setFormError(p); if (!p) send.mutate() }
  const setField = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (k === 'amount') { send.reset(); pay.reset() } }
  const apiError = (send.isError && send.error) || (pay.isError && pay.error)

  return (
    <Panel open={!!purchase} onClose={onClose} title={purchase?.farmerName || ''} width="sm:w-[30rem]"
      description={purchase ? `P-${purchase.id} · ${date(purchase.purchaseDate)}${purchase.truckNumber ? ` · ${purchase.truckNumber}` : ''}` : ''}
      onSubmit={(e) => { e.preventDefault(); if (otpActive) pay.mutate(); else requestOtp() }}>
      {purchase && (
        <>
          <div className="grid gap-2 rounded-card border border-border p-4">
            <div className="mb-1 flex items-center justify-between"><span className="text-sm font-semibold">Weighment</span><StatusChip status={purchase.paymentStatus} /></div>
            <Line label="Weight" value={qty(purchase.weightQuintals)} />
            <Line label="Rate" value={`${money(purchase.pricePerQuintal)} / Qtl`} />
            {purchase.moisturePct != null && <Line label="Moisture" value={`${num(purchase.moisturePct)} %`} />}
            {Number(purchase.deductionPct) > 0 && <Line label={`Deduction (${num(purchase.deductionPct)}%)`} value={`−${money(purchase.deductionAmount)}`} className="text-warn" />}
            <div className="my-1 border-t border-border" />
            <Line label="Total" value={money(total)} />
            <Line label="Paid" value={money(purchase.amountPaid)} className="text-ok" />
            <Line label="Due" value={money(due)} className={cx('text-base', due > 0 ? 'text-risk' : 'text-ok')} />
            <ProgressBar aria-label="Paid so far" value={total ? (Number(purchase.amountPaid) / total) * 100 : 0} color="success" size="sm" className="mt-1">
              <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
            </ProgressBar>
            <div className="mt-2"><ShareButtons receipt={purchaseReceipt(purchase, millName)} label="purchase receipt" /></div>
          </div>

          {payments.length > 0 && (
            <div className="grid gap-2">
              <Section>Payment history</Section>
              <ul className="divide-y divide-border rounded-card border border-border">
                {payments.map(p => (
                  <li key={p.id} className="grid gap-2 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="v4-num text-sm font-bold">{money(p.amount)}</span>
                        <span className="text-xs text-muted">{p.paymentMode.replace('_', ' ')}</span>
                        {p.otpVerifiedAt && <ShieldCheck className="size-4 text-ok" aria-label="Confirmed by farmer OTP" />}
                      </span>
                      <span className="text-xs text-muted">{date(p.paymentDate)}</span>
                    </div>
                    <ShareButtons receipt={paymentReceipt(p, purchase, millName)} label={`payment receipt ${p.id}`} />
                  </li>
                ))}
              </ul>
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
                <TextInput label="Amount" unit="₹" required inputMode="decimal" value={form.amount} onChange={v => setField('amount', v.trim())}
                  hint={<button type="button" className="font-medium text-accent" onClick={() => setField('amount', due.toFixed(2))}>Pay full due {money(due)}</button>} />
                <DateInput label="Payment date" required value={form.paymentDate} onChange={v => setField('paymentDate', v)} />
                <SelectInput label="Mode" options={MODES} value={form.paymentMode} onChange={v => setField('paymentMode', v || 'CASH')} />
                <TextInput label="Reference no." value={form.referenceNumber} onChange={v => setField('referenceNumber', v)} />
              </div>
              {formError && <p className="text-xs text-danger" role="alert">{formError}</p>}
              {otpActive ? (
                <div className="grid gap-3 rounded-card border border-border bg-ok-soft p-4">
                  <p className="text-sm">OTP for <b>{money(amount)}</b> sent to the farmer's mobile <span className="font-mono">+91 {otp.phone}</span>. Ask the farmer for it once they have received the payment.</p>
                  <OtpInput label="Farmer's OTP" value={otp.code} cooldown={cooldown} resending={send.isPending} onResend={requestOtp} onChange={(code) => setOtp(o => ({ ...o, code }))} />
                  <Button type="submit" isDisabled={otp.code.length !== 6} isPending={pay.isPending}><ShieldCheck className="size-4" />Confirm OTP and release payment</Button>
                </div>
              ) : (
                <Button type="submit" fullWidth isPending={send.isPending}><Send className="size-4" />Send OTP to farmer</Button>
              )}
              {apiError && <ErrorAlert>{errorMessage(apiError)}</ErrorAlert>}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}
