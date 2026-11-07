import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GpsKeyCard from './GpsKeyCard'
import { getGpsKeyStatus, rotateGpsKey } from '../../shared/api/mill'
import { renderWithProviders } from '../test/renderWithProviders'

vi.mock('../../shared/api/mill', () => ({ getGpsKeyStatus: vi.fn(), rotateGpsKey: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('classic GpsKeyCard', () => {
  it('generates a key and shows it once', async () => {
    getGpsKeyStatus.mockResolvedValue({ configured: false })
    rotateGpsKey.mockResolvedValue({ deviceKey: 'gps_abc123' })
    renderWithProviders(<GpsKeyCard />)
    expect(await screen.findByText(/No key yet/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Generate key' }))
    await waitFor(() => expect(rotateGpsKey).toHaveBeenCalled())
    expect(await screen.findByText(/Copy this device key now/)).toBeInTheDocument()
  })

  it('asks before replacing an existing key', async () => {
    getGpsKeyStatus.mockResolvedValue({ configured: true, createdAt: '2026-11-07T10:00:00' })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderWithProviders(<GpsKeyCard />)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Generate new key' }))
    expect(confirm).toHaveBeenCalled()
    expect(rotateGpsKey).not.toHaveBeenCalled()
    confirm.mockRestore()
  })
})
