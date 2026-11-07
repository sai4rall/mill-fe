import { describe, it, expect } from 'vitest'
import { paymentReceipt, purchaseReceipt, receiptText, whatsappLink } from './receipt'

const purchase = { id: 13, farmerName: 'Ravi Kumar', purchaseDate: '2026-11-08', weightQuintals: 12.4, pricePerQuintal: 2100,
  moisturePct: 18, deductionPct: 5, grossAmount: 26040, deductionAmount: 1302, totalAmount: 24738, amountPaid: 10000, amountDue: 14738 }

describe('receipts', () => {
  it('lists the weighment, deduction and balance', () => {
    const r = purchaseReceipt(purchase, 'Sri Lakshmi Rice Mill')
    const text = receiptText(r)
    expect(text).toContain('Sri Lakshmi Rice Mill')
    expect(text).toContain('Weight: 12.40 Qtl')
    expect(text).toContain('Moisture deduction (5.00%): −₹1,302.00')
    expect(text).toContain('Net payable: ₹24,738.00')
    expect(text).toContain('Balance due: ₹14,738.00')
  })
  it('builds a payment receipt and a WhatsApp link', () => {
    const r = paymentReceipt({ id: 4, purchaseId: 13, amount: 10000, paymentDate: '2026-11-08', paymentMode: 'BANK_TRANSFER', otpVerifiedAt: '2026-11-08T10:15:00' }, purchase, 'Mill')
    expect(receiptText(r)).toContain('Amount paid: ₹10,000.00')
    expect(receiptText(r)).toContain('Mode: BANK TRANSFER')
    expect(whatsappLink(r)).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })
})
