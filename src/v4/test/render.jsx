import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { V4Providers } from '../V4App'

export function renderV4(ui, { route = '/v4' } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}><V4Providers>{ui}</V4Providers></MemoryRouter>
    </QueryClientProvider>
  )
}

/** Makes useIsPhone() (matchMedia) report a phone-sized screen for the rest of the test. */
export function asPhone() {
  const orig = window.matchMedia
  window.matchMedia = (q) => ({ ...orig(q), matches: /max-width/.test(q) })
  return () => { window.matchMedia = orig }
}
