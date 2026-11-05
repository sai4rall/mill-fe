import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './shared/context/AuthContext'
import V1App from './v1/V1App'

/*
 * Each UI version lives in its own folder and only imports from itself and src/shared:
 *   v1/  classic UI (Tailwind)            → /
 *   v2/  Mantine                          → /v2   (linked from the classic UI)
 *   v3/  shadcn/ui (Radix + Tailwind)     → /v3   (not linked)
 *   v4/  HeroUI + Motion, top navigation  → /v4   (not linked)
 * v2–v4 are lazy-loaded, so their libraries and styles load only when that UI is opened.
 */
const V2App = lazy(() => import('./v2/V2App'))
const V3App = lazy(() => import('./v3/V3App'))
const V4App = lazy(() => import('./v4/V4App'))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/v2/*" element={<Suspense fallback={null}><V2App /></Suspense>} />
            <Route path="/v3/*" element={<Suspense fallback={null}><V3App /></Suspense>} />
            <Route path="/v4/*" element={<Suspense fallback={null}><V4App /></Suspense>} />
            <Route path="/*" element={<V1App />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
