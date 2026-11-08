import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../../shared/api/mills'
import Mills from './Mills'
import { renderV4 } from '../../test/render'

vi.mock('../../../shared/api/mills', () => ({
  getMills: vi.fn(), getMillStock: vi.fn(), createMill: vi.fn(), resetMillPassword: vi.fn(), toggleMillStatus: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  api.getMills.mockResolvedValue([])
  api.createMill.mockResolvedValue({ adminUsername: 'v_admin', generatedPassword: 'Xy7#pQ2!aB9z', message: 'ok' })
})

describe('v4 Mills — add mill', () => {
  it('validates every mandatory field and the phone before creating', async () => {
    const u = userEvent.setup()
    renderV4(<Mills />)
    await u.click(await screen.findByRole('button', { name: /Add mill/ }))
    const sheet = await screen.findByRole('dialog')
    await u.click(within(sheet).getByRole('button', { name: 'Create mill' }))
    for (const msg of ['Mill name is required', 'Location is required', 'Contact phone is required', 'Admin username is required', 'Admin full name is required']) {
      expect(within(sheet).getByText(msg)).toBeInTheDocument()
    }
    expect(api.createMill).not.toHaveBeenCalled()

    await u.type(within(sheet).getByLabelText(/Mill name/), 'V Mill')
    await u.type(within(sheet).getByLabelText(/Location/), 'Guntur')
    const phone = within(sheet).getByLabelText(/Contact phone/)
    await u.type(phone, '98765432101234')
    expect(phone).toHaveValue('9876543210')
    await u.type(within(sheet).getByLabelText(/Contact email/), 'bad')
    await u.type(within(sheet).getByLabelText(/Admin username/), 'v_admin')
    await u.type(within(sheet).getByLabelText(/Admin full name/), 'Venkat Rao')
    await u.click(within(sheet).getByRole('button', { name: 'Create mill' }))
    expect(within(sheet).getByText('Enter a valid email address')).toBeInTheDocument()
    expect(api.createMill).not.toHaveBeenCalled()

    await u.clear(within(sheet).getByLabelText(/Contact email/))
    await u.click(within(sheet).getByRole('button', { name: 'Create mill' }))
    await waitFor(() => expect(api.createMill).toHaveBeenCalledWith({
      name: 'V Mill', location: 'Guntur', contactPhone: '9876543210', contactEmail: null, adminUsername: 'v_admin', adminFullName: 'Venkat Rao',
    }))
  })
})
