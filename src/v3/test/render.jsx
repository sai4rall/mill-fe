import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { V3Providers } from '../V3App'

export function renderV3(ui, { route = '/v3' } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}><V3Providers>{ui}</V3Providers></MemoryRouter>
    </QueryClientProvider>
  )
}
