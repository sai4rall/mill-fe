import { useState } from 'react'
import { Alert, Button, Divider, Drawer, Group, Progress, Select, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ShieldCheck, Send } from 'lucide-react'
import { createPayment, getPayments, sendPaymentOtp } from '../../shared/api/mill'
import OtpEntry from '../components/OtpEntry'
import { errorMessage } from '../../shared/utils/errors'
import { rupees, today } from '../../shared/utils/format'
import { useCountdown } from '../../shared/hooks/useCountdown'
import { todayISO } from '../../shared/utils/dates'

const MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'].map(m => ({ value: m, label: m.replace('_', ' ') }))

/**
 * Release a payment: the farmer gets an OTP for this exact amount on their verified mobile and reads it out.
 * Changing the amount invalidates the OTP.
 */
export default function PaymentDrawer({ purchase, farmerVerified, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ amount: '', paymentDate: today(), paymentMode: 'CASH', referenceNumber: '' })
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
      notifications.show({ color: 'leaf', title: 'Payment released', message: `${rupees(amount)} to ${purchase.farmerName}` })
    },
  })

  const check = () => {
    if (!form.amount || !(amount > 0)) return 'Enter an amount greater than 0'
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount)) return 'Amount can have at most 2 decimals'
    if (amount > due) return `Amount exceeds the outstanding balance of ₹${due.toFixed(2)}`
    if (!form.paymentDate) return 'Payment date is required'
    return ''
  }
  const requestOtp = () => { const p = check(); setFormError(p); if (!p) send.mutate() }
  const setField = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (k === 'amount') { send.reset(); pay.reset() } }
  const apiError = (send.isError && errorMessage(send.error)) || (pay.isError && errorMessage(pay.error))

  return (
    <Drawer opened={!!purchase} onClose={onClose} position="right" size="md" title={purchase ? <Text fw={700} size="lg">Payments — {purchase.farmerName}</Text> : ''}>
      {purchase && (
        <Stack gap="md">
          <Stack gap={6} p="md" bg="gray.0" style={{ borderRadius: 12 }}>
            {Number(purchase.deductionPct) > 0 && (
              <Group justify="space-between"><Text size="sm" c="orange.8">Moisture {Number(purchase.moisturePct)}% deduction</Text>
                <Text size="sm" c="orange.8" className="v2-num">−{Number(purchase.deductionPct)}% ({rupees(purchase.deductionAmount)})</Text></Group>
            )}
            <Group justify="space-between"><Text size="sm" c="dimmed">Total</Text><Text fw={700} className="v2-num">{rupees(total)}</Text></Group>
            <Group justify="space-between"><Text size="sm" c="dimmed">Paid</Text><Text fw={600} c="leaf.7" className="v2-num">{rupees(purchase.amountPaid)}</Text></Group>
            <Group justify="space-between"><Text size="sm" c="dimmed">Due</Text><Text fw={800} c="red.7" className="v2-num">{rupees(due)}</Text></Group>
            <Progress value={total ? (Number(purchase.amountPaid) / total) * 100 : 0} size="sm" radius="xl" mt={4} aria-label="Paid so far" />
          </Stack>

          {payments.length > 0 && (
            <Stack gap={6}>
              <Text size="sm" fw={600}>Payment history</Text>
              {payments.map(p => (
                <Group key={p.id} justify="space-between" p="xs" style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: 8 }} wrap="nowrap">
                  <Group gap={8} wrap="nowrap">
                    <Text size="sm" fw={600} className="v2-num">{rupees(p.amount)}</Text>
                    <Text size="xs" c="dimmed">{p.paymentMode.replace('_', ' ')}</Text>
                    {p.otpVerifiedAt && (
                      <Tooltip label="Confirmed by farmer OTP">
                        <ThemeIcon size="sm" variant="light" radius="xl" aria-label="Confirmed by farmer OTP"><ShieldCheck size={12} /></ThemeIcon>
                      </Tooltip>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">{p.paymentDate}</Text>
                </Group>
              ))}
            </Stack>
          )}

          <Divider label="Release payment" labelPosition="left" />
          {due <= 0 ? (
            <Alert color="leaf" variant="light" icon={<ShieldCheck size={18} />}>This purchase is fully paid.</Alert>
          ) : !farmerVerified ? (
            <Alert color="yellow" variant="light" icon={<AlertTriangle size={18} />}>
              The farmer's mobile number is not verified. Verify it on the Farmers screen before releasing payments.
            </Alert>
          ) : (
            <Stack component="form" gap="sm" noValidate onSubmit={(e) => { e.preventDefault(); if (otpActive) pay.mutate(); else requestOtp() }}>
              <SimpleGrid cols={2}>
                <TextInput label="Amount (₹)" withAsterisk inputMode="decimal" value={form.amount} onChange={e => setField('amount', e.target.value.trim())} />
                <TextInput type="date" max={todayISO()} label="Date" withAsterisk value={form.paymentDate} onChange={e => setField('paymentDate', e.target.value)} />
                <Select label="Mode" data={MODES} value={form.paymentMode} allowDeselect={false} onChange={v => setField('paymentMode', v)} />
                <TextInput label="Reference no." value={form.referenceNumber} onChange={e => setField('referenceNumber', e.target.value)} />
              </SimpleGrid>
              {formError && <Text size="xs" c="red" role="alert">{formError}</Text>}
              {otpActive ? (
                <Stack gap="sm" p="sm" style={{ border: '1px solid var(--mantine-color-leaf-2)', borderRadius: 12, background: 'var(--mantine-color-leaf-0)' }}>
                  <Text size="sm">OTP for <b>{rupees(amount)}</b> sent to the farmer's mobile <Text span ff="monospace">+91 {otp.phone}</Text>. Ask the farmer for it once they have received the payment.</Text>
                  <OtpEntry label="Farmer's OTP" value={otp.code} cooldown={cooldown} resending={send.isPending} onResend={requestOtp}
                    onChange={(code) => setOtp(o => ({ ...o, code }))} />
                  <Button type="submit" disabled={otp.code.length !== 6} loading={pay.isPending} leftSection={<ShieldCheck size={16} />}>
                    Confirm OTP & release payment
                  </Button>
                </Stack>
              ) : (
                <Button type="submit" loading={send.isPending} leftSection={<Send size={16} />}>Send OTP to farmer</Button>
              )}
              {apiError && <Alert color="red" variant="light" role="alert">{apiError}</Alert>}
            </Stack>
          )}
        </Stack>
      )}
    </Drawer>
  )
}
