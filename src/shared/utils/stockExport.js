// Stock summary / statement exports shared by both UIs.
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getMillStockExcelUrl } from '../api/mills'

const fileBase = (millName) => millName.replace(/\s+/g, '_')

/** Downloads the server-generated Excel statement for a mill (auth header via fetch). */
export async function downloadStockExcel(millId, millName, fromDate, toDate) {
  const token = localStorage.getItem('token')
  const url = getMillStockExcelUrl(millId, millName, fromDate || undefined, toDate || undefined)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'X-Mill-Id': millId } })
  if (!res.ok) throw new Error(`Excel export failed (${res.status})`)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${fileBase(millName)}_stock_statement.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Builds and saves a PDF of the summary (tab 'summary') or the paddy + rice statement (tab 'statement'). */
export function exportStockPdf({ millName, tab, stock, statement, fromDate, toDate }) {
  const doc = new jsPDF()
  const range = fromDate || toDate ? `${fromDate || 'Beginning'} to ${toDate || 'Today'}` : 'All time'
  doc.setFontSize(16)
  doc.text(`Stock ${tab === 'summary' ? 'Summary' : 'Statement'} — ${millName}`, 14, 18)
  doc.setFontSize(10); doc.setTextColor(120)
  doc.text(`Period: ${range}`, 14, 26)
  doc.setTextColor(0)

  if (tab === 'summary' && stock) {
    autoTable(doc, {
      startY: 33,
      head: [['Line Item', 'Quantity (Qtl)']],
      body: [
        ['Paddy on Hand', Number(stock.paddyOnHand).toFixed(2)],
        ['Paddy in Mill', Number(stock.paddyInMill).toFixed(2)],
        ['Rice on Hand', Number(stock.riceOnHand).toFixed(2)],
        ['Total Paddy Purchased', Number(stock.totalPaddyPurchased).toFixed(2)],
        ['Total Rice Produced', Number(stock.totalRiceProduced).toFixed(2)],
        ['Total Rice Exported', Number(stock.totalRiceExported).toFixed(2)],
      ],
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 10 },
    })
  }

  if (tab === 'statement' && statement) {
    const toRow = m => [
      m.date, m.type.replace('_', ' '), m.description,
      m.quantityIn != null ? Number(m.quantityIn).toFixed(2) : '',
      m.quantityOut != null ? Number(m.quantityOut).toFixed(2) : '',
      Number(m.runningBalance).toFixed(2),
    ]
    const head = [['Date', 'Type', 'Description', 'In (Qtl)', 'Out (Qtl)', 'Balance']]
    autoTable(doc, { startY: 33, head, body: (statement.paddyMovements || []).map(toRow), headStyles: { fillColor: [245, 158, 11] }, styles: { fontSize: 8 } })
    const y2 = doc.lastAutoTable.finalY + 10
    doc.setFontSize(12); doc.text('Rice Statement', 14, y2)
    autoTable(doc, { startY: y2 + 4, head, body: (statement.riceMovements || []).map(toRow), headStyles: { fillColor: [16, 185, 129] }, styles: { fontSize: 8 } })
  }
  doc.save(`${fileBase(millName)}_stock_${tab}.pdf`)
}
