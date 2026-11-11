import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../shared/api/mill'
import * as cert from '../../shared/utils/qualityCertificate'
import Quality from './Quality'
import { renderV4 } from '../test/render'

vi.mock('../../shared/api/mill', () => ({
  getQualityTests: vi.fn(), getQualityStandards: vi.fn(), getBatchQuality: vi.fn(), getBatches: vi.fn(), getBranding: vi.fn(),
  createQualityTest: vi.fn(), updateQualityTest: vi.fn(), deleteQualityTest: vi.fn(), issueQualityCertificate: vi.fn(),
}))
vi.mock('../../shared/utils/qualityCertificate', () => ({ downloadQualityCertificate: vi.fn() }))
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const row = (grade, maxMoisturePct, maxBrokenPct) => ({ grade, maxMoisturePct, maxBrokenPct })
const STD = { product: 'RICE', grades: [row('A_PLUS', 13, 5), row('A', 13.5, 10), row('B_PLUS', 13.5, 15), row('B', 14, 20), row('C', 14, 25)] }
const PADDY = { product: 'PADDY', grades: [row('A_PLUS', 14), row('A', 14.5), row('B_PLUS', 15), row('B', 16), row('C', 17)] }

beforeEach(() => {
  vi.clearAllMocks()
  api.getBranding.mockResolvedValue({ millName: 'Sri Mill' })
  api.getQualityStandards.mockResolvedValue([PADDY, STD])
  api.getBatches.mockResolvedValue([{ id: 7, batchDate: today(), paddyInputQuintals: 100 }])
  api.getBatchQuality.mockResolvedValue([{ batchId: 7, batchDate: today(), shift: 'MORNING', paddyInputQuintals: 100, testCount: 2, failCount: 1, certificateCount: 0, latestResult: 'FAIL', latestGrade: null, latestTestDate: today(), avgMoisturePct: 13.5, avgBrokenPct: 26 }])
  api.getQualityTests.mockResolvedValue([
    { id: 1, sampleCode: 'LAB-1', testDate: today(), product: 'RICE', batchId: 7, moisturePct: 13, brokenPct: 30, result: 'FAIL', failureReasons: ['Broken 30.00% is above the limit 25.00%'], standard: STD },
    { id: 2, sampleCode: 'LAB-2', testDate: today(), product: 'RICE', batchId: 7, moisturePct: 14, brokenPct: 22, result: 'PASS', grade: 'B', failureReasons: [], standard: STD },
  ])
})

describe('v4 Quality control', () => {
  it('flags failed samples and filters to them', async () => {
    const u = userEvent.setup()
    renderV4(<Quality />)
    const table = await screen.findByRole('grid', { name: 'Lab tests' })
    expect(within(table).getByText('LAB-1').closest('[role="row"]')).toHaveTextContent('Broken 30.00% is above the limit 25.00%')
    expect(within(table).getByText('LAB-2').closest('[role="row"]')).toHaveTextContent('Grade B')
    await u.click(screen.getByRole('button', { name: /^Failed/ }))
    await waitFor(() => expect(within(screen.getByRole('grid', { name: 'Lab tests' })).queryByText('LAB-2')).not.toBeInTheDocument())
    await u.click(screen.getByRole('button', { name: /^Grade B\s*1$/ }))
    await waitFor(() => expect(within(screen.getByRole('grid', { name: 'Lab tests' })).queryByText('LAB-1')).not.toBeInTheDocument())
  })

  it('issues a certificate for a passed sample and downloads it', async () => {
    api.issueQualityCertificate.mockResolvedValue({ id: 2, grade: 'B', certificateNumber: 'QC-2026-0001' })
    const u = userEvent.setup()
    renderV4(<Quality />)
    expect(await screen.findByText('LAB-2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Issue certificate for LAB-1' })).not.toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Issue certificate for LAB-2' }))
    expect(await screen.findByText(/shows grade B/)).toBeInTheDocument()
    await u.click(await screen.findByRole('button', { name: 'Issue certificate' }))
    await waitFor(() => expect(api.issueQualityCertificate).toHaveBeenCalledWith(2))
    await waitFor(() => expect(cert.downloadQualityCertificate).toHaveBeenCalledWith(expect.objectContaining({ certificateNumber: 'QC-2026-0001' }), expect.any(String)))
  })

  it('previews the grade while readings are typed', async () => {
    const u = userEvent.setup()
    renderV4(<Quality />)
    await u.click(await screen.findByRole('button', { name: 'Record test' }))
    const sheet = await screen.findByRole('dialog')
    await u.type(within(sheet).getByRole('textbox', { name: /^Moisture/ }), '12')
    await u.type(within(sheet).getByRole('textbox', { name: /^Broken/ }), '4')
    expect(within(sheet).getByRole('status')).toHaveTextContent('Grade so far: A+')
    await u.clear(within(sheet).getByRole('textbox', { name: /^Broken/ }))
    await u.type(within(sheet).getByRole('textbox', { name: /^Broken/ }), '12')
    expect(within(sheet).getByRole('status')).toHaveTextContent('Grade so far: B+')
  })

  it('records a test, previewing a failure against the standard', async () => {
    api.createQualityTest.mockResolvedValue({ id: 3, sampleCode: 'LAB-3', result: 'FAIL' })
    const u = userEvent.setup()
    renderV4(<Quality />)
    await u.click(await screen.findByRole('button', { name: 'Record test' }))
    const sheet = await screen.findByRole('dialog')
    await u.click(within(sheet).getByRole('button', { name: 'Save' }))
    expect(await within(sheet).findByText('Moisture % is required')).toBeInTheDocument()
    expect(within(sheet).getByText('Broken % is required for rice')).toBeInTheDocument()
    await u.type(within(sheet).getByRole('textbox', { name: /^Moisture/ }), '15')
    await u.type(within(sheet).getByRole('textbox', { name: /^Broken/ }), '20')
    expect(within(sheet).getByRole('status')).toHaveTextContent('Will be flagged as FAILED')
    await u.click(within(sheet).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.createQualityTest).toHaveBeenCalled())
    expect(api.createQualityTest.mock.calls[0][0]).toMatchObject({ testDate: today(), product: 'RICE', moisturePct: 15, brokenPct: 20, batchId: null })
  })

  it('shows batch-wise history', async () => {
    const u = userEvent.setup()
    renderV4(<Quality />)
    await u.click(await screen.findByRole('button', { name: 'Batch history' }))
    const table = await screen.findByRole('grid', { name: 'Batch-wise quality history' })
    expect(within(table).getByText('#7').closest('[role="row"]')).toHaveTextContent('1 failed')
  })
})
