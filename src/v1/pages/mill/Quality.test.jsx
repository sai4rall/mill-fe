import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../../shared/api/mill'
import Quality from './Quality'
import QualityStandards from '../admin/QualityStandards'
import * as adminApi from '../../../shared/api/mills'
import { renderWithProviders } from '../../test/renderWithProviders'

vi.mock('../../../shared/api/mill', () => ({
  getQualityTests: vi.fn(), getQualityStandards: vi.fn(), getBatchQuality: vi.fn(), getBatches: vi.fn(), getBranding: vi.fn(),
  createQualityTest: vi.fn(), updateQualityTest: vi.fn(), deleteQualityTest: vi.fn(), issueQualityCertificate: vi.fn(),
}))
vi.mock('../../../shared/api/mills', () => ({ getCompanyQualityStandards: vi.fn(), saveCompanyQualityStandard: vi.fn(), resetCompanyQualityStandard: vi.fn() }))
vi.mock('../../../shared/utils/qualityCertificate', () => ({ downloadQualityCertificate: vi.fn() }))
const row = (grade, maxMoisturePct, maxBrokenPct) => ({ grade, maxMoisturePct, maxBrokenPct, maxForeignMatterPct: null, maxDamagedPct: null, maxChalkyPct: null, minHeadRicePct: null })
const STD = { product: 'RICE', configured: false, grades: [row('A_PLUS', 13, 5), row('A', 13.5, 10), row('B_PLUS', 13.5, 15), row('B', 14, 20), row('C', 14, 25)] }
const PADDY = { product: 'PADDY', configured: false, grades: [row('A_PLUS', 14, null), row('A', 14.5, null), row('B_PLUS', 15, null), row('B', 16, null), row('C', 17, null)] }

beforeEach(() => {
  vi.clearAllMocks()
  api.getBranding.mockResolvedValue(null)
  api.getQualityStandards.mockResolvedValue([PADDY, STD])
  adminApi.getCompanyQualityStandards.mockResolvedValue([PADDY, STD])
  api.getBatches.mockResolvedValue([])
  api.getBatchQuality.mockResolvedValue([])
  api.getQualityTests.mockResolvedValue([
    { id: 1, sampleCode: 'LAB-1', testDate: '2026-11-01', product: 'RICE', moisturePct: 13, brokenPct: 30, result: 'FAIL', failureReasons: ['Broken 30.00% is above the limit 25.00%'], standard: STD },
    { id: 2, sampleCode: 'LAB-2', testDate: '2026-11-01', product: 'RICE', moisturePct: 14, brokenPct: 22, result: 'PASS', grade: 'A', failureReasons: [], standard: STD, certificateNumber: 'QC-2026-0001' },
  ])
})

describe('v1 Quality Control', () => {
  it('flags failures and locks certified tests', async () => {
    renderWithProviders(<Quality />)
    const failed = (await screen.findByText('LAB-1')).closest('tr')
    expect(within(failed).getByText('Failed')).toBeInTheDocument()
    expect(within(failed).getByText(/Broken 30.00% is above/)).toBeInTheDocument()
    const certified = screen.getByText('LAB-2').closest('tr')
    expect(within(certified).getByRole('button', { name: 'Download certificate QC-2026-0001' })).toBeInTheDocument()
    expect(within(certified).queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument()
    expect(within(certified).getByText('Grade A')).toBeInTheDocument()
  })

  it('records a paddy test (broken % not required)', async () => {
    api.createQualityTest.mockResolvedValue({ id: 3 })
    const u = userEvent.setup()
    renderWithProviders(<Quality />)
    await u.click(await screen.findByRole('button', { name: /Record Test/ }))
    await u.selectOptions(screen.getByLabelText(/Product/), 'PADDY')
    await u.type(screen.getByLabelText(/^Moisture/), '18')
    expect(screen.getByRole('status')).toHaveTextContent('Will be flagged as FAILED')
    await u.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.createQualityTest).toHaveBeenCalled())
    expect(api.createQualityTest.mock.calls[0][0]).toMatchObject({ product: 'PADDY', moisturePct: 18, brokenPct: null })
  })

  it('lets the super admin edit the grade table, rejecting a better grade looser than a worse one', async () => {
    adminApi.saveCompanyQualityStandard.mockResolvedValue({})
    const u = userEvent.setup()
    renderWithProviders(<QualityStandards />)
    const aPlus = await screen.findByLabelText('Rice Broken grade A+')
    await u.clear(aPlus)
    await u.type(aPlus, '12')
    await u.click(screen.getByRole('button', { name: 'Save Rice Grades' }))
    expect(await screen.findByText(/Broken A\+: Cannot be looser than A \(10%\)/)).toBeInTheDocument()
    expect(adminApi.saveCompanyQualityStandard).not.toHaveBeenCalled()
    await u.clear(aPlus)
    await u.type(aPlus, '4')
    await u.click(screen.getByRole('button', { name: 'Save Rice Grades' }))
    await waitFor(() => expect(adminApi.saveCompanyQualityStandard).toHaveBeenCalled())
    const [product, body] = adminApi.saveCompanyQualityStandard.mock.calls[0]
    expect(product).toBe('RICE')
    expect(body.grades[0]).toMatchObject({ grade: 'A_PLUS', maxBrokenPct: 4, maxMoisturePct: 13, maxChalkyPct: null })
    expect(body.grades).toHaveLength(5)
  })
})
