import { date, money, num, time } from './numbers'

// Receipts for farmers (design review: every weighment and payment gets a slip they can keep or forward).

export function purchaseReceipt(p, millName) {
  const lines = [
    ['Farmer', p.farmerName],
    ['Date', date(p.purchaseDate)],
    ...(p.truckNumber ? [['Truck', p.truckNumber]] : []),
    ['Weight', `${num(p.weightQuintals)} Qtl`],
    ['Rate', `${money(p.pricePerQuintal)} / Qtl`],
    ...(p.moisturePct != null ? [['Moisture', `${num(p.moisturePct)} %`]] : []),
    ['Gross amount', money(p.grossAmount ?? p.totalAmount)],
    ...(Number(p.deductionPct) > 0 ? [[`Moisture deduction (${num(p.deductionPct)}%)`, `−${money(p.deductionAmount)}`]] : []),
  ]
  return {
    title: 'Paddy purchase receipt', number: `P-${p.id}`, millName, lines,
    total: ['Net payable', money(p.totalAmount)],
    after: [['Paid so far', money(p.amountPaid)], ['Balance due', money(p.amountDue)]],
    footer: 'Thank you. Keep this receipt for your records.',
  }
}

export function paymentReceipt(pay, purchase, millName) {
  return {
    title: 'Payment receipt', number: `PAY-${pay.id}`, millName,
    lines: [
      ['Farmer', purchase?.farmerName || pay.farmerName || '—'],
      ['Date', date(pay.paymentDate)],
      ['For purchase', `P-${pay.purchaseId}`],
      ['Mode', String(pay.paymentMode || '').replace('_', ' ')],
      ...(pay.referenceNumber ? [['Reference', pay.referenceNumber]] : []),
      ...(pay.otpVerifiedAt ? [['Confirmed by farmer OTP', time(pay.otpVerifiedAt)]] : []),
    ],
    total: ['Amount paid', money(pay.amount)],
    after: purchase ? [['Balance due on purchase', money(purchase.amountDue)]] : [],
    footer: 'Payment confirmed by the farmer with a one-time password.',
  }
}

export function receiptText(r) {
  const rows = [...r.lines, r.total, ...(r.after || [])].map(([k, v]) => `${k}: ${v}`)
  return [`*${r.millName || 'Mill'}* — ${r.title} ${r.number}`, ...rows, r.footer].join('\n')
}

/** Draws the receipt on a canvas (system fonts, so Telugu/Hindi names render) and returns a PNG blob. */
export async function receiptImage(r, scale = 2) {
  const W = 420, pad = 24, rowH = 26
  const rows = r.lines.length + 1 + (r.after?.length || 0)
  const H = pad * 2 + 70 + rows * rowH + 60
  const canvas = document.createElement('canvas')
  canvas.width = W * scale; canvas.height = H * scale
  const g = canvas.getContext('2d')
  g.scale(scale, scale)
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H)
  const font = (w, s) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", "Noto Sans Telugu", "Noto Sans Devanagari", sans-serif`
  let y = pad + 18
  g.fillStyle = '#1c2420'; g.font = font(700, 18); g.fillText(r.millName || 'Mill', pad, y)
  y += 22; g.font = font(500, 13); g.fillStyle = '#4b5a52'; g.fillText(`${r.title} · ${r.number}`, pad, y)
  y += 18; g.strokeStyle = '#dde3dd'; g.beginPath(); g.moveTo(pad, y); g.lineTo(W - pad, y); g.stroke()
  const row = ([k, v], bold) => {
    y += rowH
    g.font = font(bold ? 700 : 400, bold ? 15 : 13); g.fillStyle = bold ? '#1c2420' : '#4b5a52'; g.textAlign = 'left'; g.fillText(k, pad, y)
    g.font = font(bold ? 700 : 600, bold ? 15 : 13); g.fillStyle = '#1c2420'; g.textAlign = 'right'; g.fillText(String(v), W - pad, y)
    g.textAlign = 'left'
  }
  r.lines.forEach(l => row(l))
  y += 10; g.beginPath(); g.moveTo(pad, y); g.lineTo(W - pad, y); g.stroke(); y -= 4
  row(r.total, true)
  ;(r.after || []).forEach(l => row(l))
  y += 34; g.font = font(400, 11); g.fillStyle = '#6b7a72'; g.fillText(r.footer, pad, y)
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

/** Shares the receipt image through the phone's share sheet (WhatsApp etc.), or downloads it where sharing isn't available. */
export async function shareReceipt(r) {
  const blob = await receiptImage(r)
  const file = new File([blob], `${r.number}.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: `${r.title} ${r.number}`, text: receiptText(r) })
    return 'shared'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = file.name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}

export const whatsappLink = (r) => `https://wa.me/?text=${encodeURIComponent(receiptText(r))}`
