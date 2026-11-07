import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createPurchase } from '../../shared/api/mill'
import { readPref, writePref } from './prefs'

// Offline entry queue (design review: weak connectivity). A purchase that cannot reach the server because there is no
// connection is kept on this device and sent later; validation errors are never queued (they need the operator).
const KEY = 'outbox.purchases'
const listeners = new Set()
const notify = () => listeners.forEach(l => l())

export const isNetworkError = (err) => !err?.response && (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error' || (typeof navigator !== 'undefined' && navigator.onLine === false))

export function queuedPurchases() { return readPref(KEY, []) }

export function enqueuePurchase(payload) {
  const items = queuedPurchases()
  items.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, payload, queuedAt: new Date().toISOString(), error: null })
  writePref(KEY, items)
  notify()
}

export function discardQueued(id) {
  writePref(KEY, queuedPurchases().filter(i => i.id !== id))
  notify()
}

/** Sends queued purchases in order. Stops at the first network failure; marks server rejections on the item. */
export async function flushPurchases() {
  let sent = 0
  for (const item of queuedPurchases()) {
    if (item.error) continue
    try {
      await createPurchase(item.payload)
      writePref(KEY, queuedPurchases().filter(i => i.id !== item.id))
      sent++
    } catch (err) {
      if (isNetworkError(err)) break
      writePref(KEY, queuedPurchases().map(i => (i.id === item.id ? { ...i, error: err?.response?.data?.error || 'Rejected by the server' } : i)))
    }
  }
  notify()
  return sent
}

/** Live view of the queue; retries when the device comes back online and every 30 s while items wait. */
export function useOutbox() {
  const qc = useQueryClient()
  const [items, setItems] = useState(queuedPurchases)
  useEffect(() => {
    const update = () => setItems(queuedPurchases())
    listeners.add(update)
    return () => listeners.delete(update)
  }, [])
  const flush = useCallback(async () => {
    const sent = await flushPurchases()
    if (sent) { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['stock'] }) }
    return sent
  }, [qc])
  useEffect(() => {
    if (!items.some(i => !i.error)) return undefined
    const onOnline = () => { flush() }
    window.addEventListener('online', onOnline)
    const t = setInterval(flush, 30000)
    return () => { window.removeEventListener('online', onOnline); clearInterval(t) }
  }, [items, flush])
  return { items, flush, discard: discardQueued }
}
