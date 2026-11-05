import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getTruckNumbers, getTruckPath } from '../../api/mill'
import { Truck, MapPin, Navigation, Clock, Gauge } from 'lucide-react'

// Fix default marker icons (Leaflet + bundlers issue)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const DEFAULT_CENTER = [17.3850, 78.4867] // Hyderabad fallback

// Pans/zooms the map to fit the current path
function FitBounds({ positions }) {
  const map = useMap()
  useMemo(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [positions, map])
  return null
}

export default function TruckTracking() {
  const [selectedTruck, setSelectedTruck] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data: truckNumbers = [], isLoading: trucksLoading } = useQuery({
    queryKey: ['truck-numbers'],
    queryFn: getTruckNumbers,
  })

  // Auto-select first truck once loaded
  const activeTruck = selectedTruck || truckNumbers[0] || ''

  const { data: path = [], isLoading: pathLoading } = useQuery({
    queryKey: ['truck-path', activeTruck, fromDate, toDate],
    queryFn: () => getTruckPath(
      activeTruck,
      fromDate ? `${fromDate}T00:00:00` : undefined,
      toDate ? `${toDate}T23:59:59` : undefined
    ),
    enabled: !!activeTruck,
    refetchInterval: 15000, // live refresh every 15s
  })

  const positions = path.map(p => [Number(p.latitude), Number(p.longitude)])
  const latest = path.length > 0 ? path[path.length - 1] : null
  const start = path.length > 0 ? path[0] : null

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-100 rounded-lg p-2">
          <MapPin className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Truck Tracking</h1>
          <p className="text-slate-500 text-sm">Live GPS paths for paddy delivery trucks</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Truck</label>
          <select value={activeTruck} onChange={e => setSelectedTruck(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 w-full sm:w-auto sm:min-w-[180px]">
            {truckNumbers.length === 0 && <option value="">No trucks yet</option>}
            {truckNumbers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(''); setToDate('') }}
            className="text-xs text-slate-400 hover:text-red-500 underline pb-2.5">Clear dates</button>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400 pb-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live · refreshes every 15s
        </div>
      </div>

      {/* Stats strip */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <Truck className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xs text-slate-400">Truck</p>
              <p className="font-mono font-semibold text-slate-800">{activeTruck}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <Navigation className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-slate-400">GPS Points</p>
              <p className="font-semibold text-slate-800">{path.length}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <Gauge className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-xs text-slate-400">Last Speed</p>
              <p className="font-semibold text-slate-800">{latest.speed != null ? `${latest.speed} km/h` : '—'}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-xs text-slate-400">Last Seen</p>
              <p className="font-semibold text-slate-800 text-sm">{new Date(latest.recordedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-[60vh] min-h-[320px] md:h-[540px]">
        {trucksLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400">Loading trucks...</div>
        ) : truckNumbers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-2 px-6">
            <Truck className="w-10 h-10 text-slate-300" />
            <p>No GPS data yet.</p>
            <p className="text-xs">Trucks appear here once their GPS devices start reporting locations.</p>
          </div>
        ) : (
          <MapContainer center={positions[0] || DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {positions.length > 0 && (
              <>
                <Polyline positions={positions} pathOptions={{ color: '#059669', weight: 4, opacity: 0.8 }} />
                <FitBounds positions={positions} />

                {/* Start marker */}
                {start && (
                  <CircleMarker center={[Number(start.latitude), Number(start.longitude)]}
                    radius={8} pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 1 }}>
                    <Popup>
                      <strong>Start</strong><br />
                      {new Date(start.recordedAt).toLocaleString()}
                    </Popup>
                  </CircleMarker>
                )}

                {/* Current/last marker */}
                {latest && (
                  <Marker position={[Number(latest.latitude), Number(latest.longitude)]}>
                    <Popup>
                      <strong>{activeTruck}</strong><br />
                      Current position<br />
                      {new Date(latest.recordedAt).toLocaleString()}<br />
                      {latest.speed != null && `Speed: ${latest.speed} km/h`}
                    </Popup>
                  </Marker>
                )}
              </>
            )}
          </MapContainer>
        )}
      </div>

      {pathLoading && <p className="text-xs text-slate-400 mt-2">Updating path...</p>}
      {!pathLoading && activeTruck && path.length === 0 && truckNumbers.length > 0 && (
        <p className="text-sm text-slate-400 mt-3 text-center">No GPS points for {activeTruck} in this period.</p>
      )}
    </div>
  )
}
