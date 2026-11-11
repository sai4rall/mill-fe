// Quality certificate PDF, shared by every UI. Only for tests the server has issued a certificate number for.
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { GRADES, PARAMETERS, gradeLabel, limitText, paramGrade, productLabel, sampleSource } from './quality'

const fmtPct = (v) => (v == null ? '—' : `${Number(v).toFixed(2)}%`)
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const GREEN = [16, 185, 129]
// jsPDF's built-in fonts cannot draw ≤ / ≥ (they print as garbage), so limits are spelled out.
const pdfLimit = (param, standard, grade) => limitText(param, standard, grade).replace('≤ ', 'max ').replace('≥ ', 'min ')

/** Builds the certificate document (exported for tests). */
export function buildQualityCertificate(test, millName = 'Mill') {
  if (!test?.certificateNumber) throw new Error('No certificate has been issued for this test')
  const doc = new jsPDF()
  const W = doc.internal.pageSize.getWidth()
  const grade = gradeLabel(test.grade)

  doc.setDrawColor(...GREEN); doc.setLineWidth(1.2); doc.rect(8, 8, W - 16, 281)
  doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text(millName, W / 2, 24, { align: 'center' })
  doc.setFontSize(14); doc.text('QUALITY CERTIFICATE', W / 2, 34, { align: 'center' })
  doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(90)
  doc.text(`Certificate No. ${test.certificateNumber}`, W / 2, 41, { align: 'center' })
  doc.setTextColor(0)

  // Grade badge, top right.
  if (grade) {
    doc.setFillColor(...GREEN); doc.roundedRect(W - 50, 48, 34, 26, 3, 3, 'F')
    doc.setTextColor(255); doc.setFontSize(8); doc.text('GRADE', W - 33, 55, { align: 'center' })
    doc.setFontSize(20); doc.setFont(undefined, 'bold'); doc.text(grade, W - 33, 68, { align: 'center' })
    doc.setFont(undefined, 'normal'); doc.setTextColor(0)
  }

  autoTable(doc, {
    startY: 50, theme: 'plain', margin: { right: 56 }, styles: { fontSize: 10, cellPadding: 1.5 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    body: [
      ['Product', productLabel(test.product)],
      ...(test.variety ? [['Variety', test.variety]] : []),
      ['Sample', test.sampleCode],
      ['Source', sampleSource(test)],
      ['Test date', test.testDate],
      ['Tested by', test.testedBy || test.recordedBy || '—'],
    ],
  })

  // Readings: result, the grade each parameter reached on its own, and the limit for the awarded grade.
  autoTable(doc, {
    startY: Math.max(doc.lastAutoTable.finalY, 76) + 6,
    head: [['Parameter', 'Result', 'Parameter grade', `Limit for grade ${grade || '—'}`]],
    body: PARAMETERS.filter(p => test[p.key] != null).map(p => {
      const g = paramGrade(p, test[p.key], test.standard)
      return [p.label, fmtPct(test[p.key]), g == null ? 'Not graded' : g === 'FAIL' ? 'Below C' : gradeLabel(g), test.grade ? pdfLimit(p, test.standard, test.grade) : '—']
    }),
    headStyles: { fillColor: GREEN }, styles: { fontSize: 10 },
  })

  // The grading scale the sample was judged against.
  const y0 = doc.lastAutoTable.finalY + 8
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Grading scale', 14, y0); doc.setFont(undefined, 'normal')
  autoTable(doc, {
    startY: y0 + 3,
    head: [['Parameter', ...GRADES.map(g => g.label)]],
    body: PARAMETERS.filter(p => GRADES.some(g => limitText(p, test.standard, g.value) !== 'Not checked'))
      .map(p => [p.label, ...GRADES.map(g => pdfLimit(p, test.standard, g.value).replace('Not checked', '—'))]),
    headStyles: { fillColor: [120, 130, 125] }, styles: { fontSize: 8, halign: 'center' }, columnStyles: { 0: { halign: 'left' } },
    didParseCell: (d) => {
      if (d.section === 'head' && GRADES[d.column.index - 1]?.value === test.grade) d.cell.styles.fillColor = GREEN
    },
  })

  let y = doc.lastAutoTable.finalY + 10
  doc.setFontSize(12); doc.setFont(undefined, 'bold')
  doc.text(test.result === 'PASS' ? `Overall: PASSED — Grade ${grade || '—'}` : 'Overall: FAILED', 14, y)
  doc.setFont(undefined, 'normal'); doc.setFontSize(10)
  y += 7
  doc.text(`This is to certify that the above sample was tested in our laboratory and meets the quality standard for grade ${grade || '—'}.`, 14, y, { maxWidth: W - 28 })
  if (test.remarks) { y += 12; doc.text(`Remarks: ${test.remarks}`, 14, y, { maxWidth: W - 28 }) }

  doc.setFontSize(9); doc.setTextColor(90)
  doc.text(`Issued ${fmtDateTime(test.certificateIssuedAt)} by ${test.certificateIssuedBy || '—'}`, 14, 262)
  doc.setTextColor(0)
  doc.line(W - 74, 270, W - 14, 270)
  doc.text('Authorised signatory', W - 44, 276, { align: 'center' })
  return doc
}

export function downloadQualityCertificate(test, millName) {
  buildQualityCertificate(test, millName).save(`${test.certificateNumber}.pdf`)
}
