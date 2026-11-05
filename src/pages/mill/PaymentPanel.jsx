import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, AlertCircle } from 'lucide-react'
import { createPayment, sendPaymentOtp } from '../../api/mill'

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY = { amount: '', paymentDate: today(), paymentMode: 'CASH', referenceNumber: '' }
const errorMessage = (e) => e?.response?.data?.error || e?.message || 'Something went wrong'

/**
 * Release a payment against a purchase. The farmer receives an OTP for this exact amount on their verified
 * mobile and reads it out; the payment is recorded only with that OTP. Changing the amount needs a new OTP.
 */
export default function PaymentPanel({ purchase, farmerVerified }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [formError, setFormError] = useState('')
  const [otp, setOtp] = useState({ sentFor: null, phone: '', code: '', cooldown: 0 })

  useEffect(() => {
    if (otp.cooldown <= 0) return
    const t = setTimeout(() => setOtp(o => ({ ...o, cooldown: o.cooldown - 1 })), 1000)
    return () => clearTimeout(t)
  }, [otp.cooldown])

  const amount = Number(form.amount)
  const due = Number(purchase.amountDue)
  const otpActive = otp.sentFor !== null && otp.sentFor === amount

  const send = useMutation({
    mutationFn: () => sendPaymentOtp(purchase.id, amount),
    onSuccess: (r) => setOtp({ sentFor: amount, phone: r.phone, code: '', cooldown: 30 }),
  })
  const pay = useMutation({
    mutationFn: () => createPayment({ ...form, amount, purchaseId: purchase.id, otp: otp.code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['payments', purchase.id] })
      setForm({ ...EMPTY, paymentDate: form.paymentDate })
      setOtp({ sentFor: null, phone: '', code: '', cooldown: 0 })
    },
  })

  const checkForm = () => {
    if (!form.amount || !(amount > 0)) return 'Enter an amount greater than 0'
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount)) return 'Amount can have at most 2 decimals'
    if (amount > due) return `Amount exceeds the outstanding balance of ₹${due.toFixed(2)}`
    if (!form.paymentDate) return 'Payment date is required'
    return ''
  }
  const requestOtp = () => {
    const problem = checkForm()
    setFormError(problem)
    if (!problem) send.mutate()
  }
  const setField = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    if (key === 'amount') { send.reset(); pay.reset() }
  }

  if (due <= 0) return <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">This purchase is fully paid.</p>
  if (!farmerVerified) {
    return (
      <p className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        The farmer's mobile number is not verified. Verify it on the Farmers screen before releasing payments.
      </p>
    )
  }

  const input = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'
  const apiError = (send.isError && errorMessage(send.error)) || (pay.isError && errorMessage(pay.error))
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); if (otpActive) pay.mutate(); else requestOtp() }}
      className="space-y-3 border-t border-slate-200 pt-4">
      <h3 className="font-medium text-slate-700 text-sm">Release Payment</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="pay-amount" className="block text-xs font-medium text-slate-600 mb-1">Amount ₹ *</label>
          <input id="pay-amount" inputMode="decimal" value={form.amount} onChange={e => setField('amount', e.target.value.trim())} className={input} />
        </div>
        <div>
          <label htmlFor="pay-date" className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
          <input id="pay-date" type="date" value={form.paymentDate} onChange={e => setField('paymentDate', e.target.value)} className={input} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="pay-mode" className="block text-xs font-medium text-slate-600 mb-1">Mode</label>
          <select id="pay-mode" value={form.paymentMode} onChange={e => setField('paymentMode', e.target.value)} className={input}>
            {['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pay-ref" className="block text-xs font-medium text-slate-600 mb-1">Ref No.</label>
          <input id="pay-ref" value={form.referenceNumber} onChange={e => setField('referenceNumber', e.target.value)} className={input} />
        </div>
      </div>

      {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}

      {otpActive ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <p className="text-xs text-slate-600">
            OTP for <strong>₹{amount.toFixed(2)}</strong> sent to the farmer's mobile <span className="font-mono">+91 {otp.phone}</span>.
            Ask the farmer for it once they have received the payment.
          </p>
          <div className="flex gap-2">
            <input aria-label="Farmer's OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit OTP"
              value={otp.code} onChange={e => setOtp(o => ({ ...o, code: e.target.value.replace(/\D/g, '') }))}
              className={`${input} tracking-widest`} />
            <button type="button" onClick={requestOtp} disabled={otp.cooldown > 0 || send.isPending}
              className="shrink-0 text-xs border border-slate-300 px-3 rounded-lg hover:bg-white disabled:opacity-50">
              {otp.cooldown > 0 ? `Resend (${otp.cooldown}s)` : 'Resend'}
            </button>
          </div>
          <button type="submit" disabled={otp.code.length !== 6 || pay.isPending}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
            <ShieldCheck className="w-4 h-4" /> {pay.isPending ? 'Releasing...' : 'Confirm OTP & release payment'}
          </button>
        </div>
      ) : (
        <button type="submit" disabled={send.isPending}
          className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
          {send.isPending ? 'Sending OTP...' : 'Send OTP to farmer'}
        </button>
      )}
      {apiError && <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{apiError}</p>}
      {pay.isSuccess && <p role="status" className="text-sm text-emerald-700">Payment released.</p>}
    </form>
  )
}
