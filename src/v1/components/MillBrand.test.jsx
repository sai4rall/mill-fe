import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import MillBrand from './MillBrand'
import { getBranding, getMillLogo } from '../../shared/api/mill'
import { renderWithProviders } from '../test/renderWithProviders'

vi.mock('../../shared/api/mill', () => ({ getBranding: vi.fn(), getMillLogo: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:logo')
  globalThis.URL.revokeObjectURL = vi.fn()
})

describe('MillBrand (top-left header)', () => {
  it("shows the mill's uploaded logo and name for mill users", async () => {
    getBranding.mockResolvedValue({ millId: 1, millName: 'Sri Lakshmi Rice Mill', logoUpdatedAt: '2026-11-01T10:00:00' })
    getMillLogo.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
    renderWithProviders(<MillBrand isMillUser />)

    const img = await screen.findByAltText('Sri Lakshmi Rice Mill logo')
    expect(img).toHaveAttribute('src', 'blob:logo')
    expect(screen.getByText('Sri Lakshmi Rice Mill')).toBeInTheDocument()
    expect(getMillLogo).toHaveBeenCalledWith('2026-11-01T10:00:00')
  })

  it('shows the mill name with the default mark when the mill has no logo', async () => {
    getBranding.mockResolvedValue({ millId: 2, millName: 'Sai Test', logoUpdatedAt: null })
    renderWithProviders(<MillBrand isMillUser />)

    expect(await screen.findByText('Sai Test')).toBeInTheDocument()
    expect(screen.getByLabelText('Mill System')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /logo/ })).not.toBeInTheDocument()
    expect(getMillLogo).not.toHaveBeenCalled()
  })

  it('shows the default brand for non-mill users without calling the API', () => {
    renderWithProviders(<MillBrand isMillUser={false} />)
    expect(screen.getByText('Mill System')).toBeInTheDocument()
    expect(getBranding).not.toHaveBeenCalled()
  })

  it('falls back to the default brand if branding fails to load', async () => {
    getBranding.mockRejectedValue(new Error('down'))
    renderWithProviders(<MillBrand isMillUser />)
    await waitFor(() => expect(getBranding).toHaveBeenCalled())
    expect(screen.getByText('Mill System')).toBeInTheDocument()
  })
})
