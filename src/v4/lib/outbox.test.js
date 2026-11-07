import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPurchase } from '../../shared/api/mill'
import { enqueuePurchase, flushPurchases, isNetworkError, queuedPurchases } from './outbox'

vi.mock('../../shared/api/mill', () => ({ createPurchase: vi.fn() }))
beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

describe('purchase outbox', () => {
  it('recognises network failures but not server rejections', () => {
    expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true)
    expect(isNetworkError({ response: { status: 400 } })).toBe(false)
  })
  it('sends queued entries and keeps them on a network failure', async () => {
    enqueuePurchase({ farmerId: 1 }); enqueuePurchase({ farmerId: 2 })
    createPurchase.mockRejectedValueOnce({ code: 'ERR_NETWORK' })
    expect(await flushPurchases()).toBe(0)
    expect(queuedPurchases()).toHaveLength(2)
    createPurchase.mockResolvedValue({})
    expect(await flushPurchases()).toBe(2)
    expect(queuedPurchases()).toHaveLength(0)
  })
  it('marks entries the server rejects instead of retrying them forever', async () => {
    enqueuePurchase({ farmerId: 1 })
    createPurchase.mockRejectedValue({ response: { status: 400, data: { error: 'Purchase date cannot be in the future' } } })
    await flushPurchases()
    expect(queuedPurchases()[0].error).toBe('Purchase date cannot be in the future')
  })
})
