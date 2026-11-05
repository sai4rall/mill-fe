import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { useEffect } from 'react'
import FeatureGate from './FeatureGate'
import { getFeatures } from '../../shared/api/features'
import { renderWithProviders } from '../test/renderWithProviders'

const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../../shared/context/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }))
vi.mock('../../shared/api/features', () => ({ getFeatures: vi.fn() }))

const moduleMounted = vi.fn()
function FakeModule() {
  useEffect(() => { moduleMounted() }, [])
  return <p>Farmers module content</p>
}

const gate = () => renderWithProviders(<FeatureGate feature="farmers" name="Farmers"><FakeModule /></FeatureGate>)

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = { username: 'admin1', role: 'MILL_ADMIN', millId: 1 }
})

describe('FeatureGate', () => {
  it('loads the module when it is enabled', async () => {
    getFeatures.mockResolvedValue([{ key: 'farmers', name: 'Farmers', showInMenu: true, enabled: true }])
    gate()
    expect(await screen.findByText('Farmers module content')).toBeInTheDocument()
    expect(moduleMounted).toHaveBeenCalled()
  })

  it('shows "not enabled yet" and never mounts the module when disabled', async () => {
    getFeatures.mockResolvedValue([{ key: 'farmers', name: 'Farmer Registry', showInMenu: true, enabled: false }])
    gate()
    expect(await screen.findByRole('heading', { name: 'Farmer Registry is not enabled yet' })).toBeInTheDocument()
    expect(screen.getByText(/will be enabled in a future release/)).toBeInTheDocument()
    expect(screen.queryByText('Farmers module content')).not.toBeInTheDocument()
    expect(moduleMounted).not.toHaveBeenCalled()
  })

  it('gates by the enabled flag even when the module is hidden from the menu (direct URL)', async () => {
    getFeatures.mockResolvedValue([{ key: 'farmers', name: 'Farmers', showInMenu: false, enabled: false }])
    gate()
    expect(await screen.findByRole('heading', { name: 'Farmers is not enabled yet' })).toBeInTheDocument()
  })

  it('loads a hidden-but-enabled module when opened directly', async () => {
    getFeatures.mockResolvedValue([{ key: 'farmers', name: 'Farmers', showInMenu: false, enabled: true }])
    gate()
    expect(await screen.findByText('Farmers module content')).toBeInTheDocument()
  })

  it('shows a loading state, not the module, until flags arrive', () => {
    getFeatures.mockReturnValue(new Promise(() => {}))
    gate()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(moduleMounted).not.toHaveBeenCalled()
  })

  it('loads the module when the feature is unknown to the backend', async () => {
    getFeatures.mockResolvedValue([])
    gate()
    expect(await screen.findByText('Farmers module content')).toBeInTheDocument()
  })

  it('gates the super admin by the global flags', async () => {
    auth.user = { username: 'superadmin', role: 'SUPER_ADMIN', millId: null }
    getFeatures.mockResolvedValue([{ key: 'farmers', name: 'Farmers', showInMenu: true, enabled: false }])
    gate()
    expect(await screen.findByRole('heading', { name: 'Farmers is not enabled yet' })).toBeInTheDocument()
    expect(getFeatures).toHaveBeenCalled()
  })

  it('does not gate the dev admin', async () => {
    auth.user = { username: 'devadmin', role: 'DEV_ADMIN', millId: null }
    gate()
    expect(await screen.findByText('Farmers module content')).toBeInTheDocument()
    expect(getFeatures).not.toHaveBeenCalled()
  })
})
