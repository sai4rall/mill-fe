import { v4 } from '../lib/paths'

// Route chunks, shared by the router (lazy) and the nav (prefetch on hover/focus, design review: performance).
export const CHUNKS = {
  login: () => import('../pages/Login'),
  today: () => import('../pages/Today'),
  farmers: () => import('../pages/Farmers'),
  purchases: () => import('../pages/Purchases'),
  money: () => import('../pages/Money'),
  rejected: () => import('../pages/RejectedLorries'),
  production: () => import('../pages/Production'),
  downtime: () => import('../pages/Downtime'),
  productionComparison: () => import('../pages/admin/ProductionComparison'),
  batches: () => import('../pages/MillOperations'),
  orders: () => import('../pages/ExportOrders'),
  truckTracking: () => import('../pages/TruckTracking'),
  stock: () => import('../pages/StockReport'),
  shipments: () => import('../pages/Shipments'),
  moisture: () => import('../pages/MoistureSettings'),
  operators: () => import('../pages/Operators'),
  mills: () => import('../pages/admin/Mills'),
  millStock: () => import('../pages/admin/MillStock'),
  globalMoisture: () => import('../pages/admin/GlobalMoisture'),
  dev: () => import('../pages/dev/DevConsole'),
}

const BY_PATH = {
  [v4('/today')]: 'today', [v4('/farmers')]: 'farmers', [v4('/purchases')]: 'purchases', [v4('/money')]: 'money', [v4('/rejected-lorries')]: 'rejected', [v4('/production')]: 'production', [v4('/downtime')]: 'downtime', [v4('/admin/production')]: 'productionComparison',
  [v4('/batches')]: 'batches', [v4('/orders')]: 'orders', [v4('/truck-tracking')]: 'truckTracking', [v4('/stock')]: 'stock',
  [v4('/shipments')]: 'shipments', [v4('/moisture')]: 'moisture', [v4('/operators')]: 'operators', [v4('/admin')]: 'mills',
  [v4('/admin/moisture')]: 'globalMoisture', [v4('/dev')]: 'dev',
}

/** Starts loading a page's code before the click lands. Safe to call repeatedly (the browser caches the module). */
export function prefetchRoute(path) {
  const load = CHUNKS[BY_PATH[path]]
  if (load) load().catch(() => {})
}
