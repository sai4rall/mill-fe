import { useEffect, useState } from 'react'
import { Clock, Gauge, Loader2, MapPin, Navigation, Truck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { Badge } from '@/v3/ui/badge'
import { Button } from '@/v3/ui/button'
import { Card } from '@/v3/ui/card'
import { getTruckNumbers, getTruckPath } from '../../shared/api/mill'
import { todayISO } from '../../shared/utils/dates'
import PageHeader from '../components/PageHeader'
import DateField from '../components/DateField'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import SelectField from '../components/SelectField'
import StatCard from '../components/StatCard'

L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })
const DEFAULT_CENTER = [17.385, 78.4867]

function FitBounds({ positions }) {
  const map = useMap()
  const key = JSON.stringify(positions)
  useEffect(() => {
    if (positions.length > 0) map.fitBounds(L.latLngBounds(positions), { padding: [50, 50], maxZoom: 16 })
  }, [key, map]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function TruckTracking() {
  const [selected, setSelected] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const { data: trucks = [], isLoading } = useQuery({ queryKey: ['truck-numbers'], queryFn: getTruckNumbers })
  const active = selected || trucks[0] || ''
  const { data: path = [], isFetching } = useQuery({
    queryKey: ['truck-path', active, fromDate, toDate],
    queryFn: () => getTruckPath(active, fromDate ? `${fromDate}T00:00:00` : undefined, toDate ? `${toDate}T23:59:59` : undefined),
    enabled: !!active, refetchInterval: 15000,
  })
  const positions = path.map(p => [Number(p.latitude), Number(p.longitude)])
  const latest = path[path.length - 1]
  const start = path[0]

  return (
    <div className="grid gap-6">
      <PageHeader title="Truck Tracking" description="Live GPS paths for paddy delivery trucks"
        actions={<Badge variant="outline" className="gap-2 border-emerald-200 bg-emerald-50 py-1 text-emerald-700"><span className="size-2 animate-pulse rounded-full bg-emerald-500" />Live · refreshes every 15 s</Badge>} />
      <Card className="flex-row flex-wrap items-end gap-4 p-4">
        <Field id="t-truck" label="Truck" className="w-full sm:w-52">
          <SelectField id="t-truck" options={trucks.map(t => ({ value: t, label: t }))} value={active} onChange={setSelected} placeholder={trucks.length ? 'Select truck' : 'No trucks yet'} disabled={!trucks.length} />
        </Field>
        <Field id="t-from" label="From" className="w-full sm:w-48"><DateField id="t-from" value={fromDate} max={toDate || todayISO()} onChange={setFromDate} clearable placeholder="Any date" /></Field>
        <Field id="t-to" label="To" className="w-full sm:w-48"><DateField id="t-to" value={toDate} min={fromDate || undefined} onChange={setToDate} clearable placeholder="Today" /></Field>
        {(fromDate || toDate) && <Button variant="ghost" onClick={() => { setFromDate(''); setToDate('') }}>Clear dates</Button>}
        {isFetching && <Loader2 className="mb-2.5 size-5 animate-spin text-muted-foreground" />}
      </Card>

      {latest && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Truck} tone="emerald" label="Truck" display={active} valueClassName="text-base" />
          <StatCard icon={Navigation} tone="blue" label="GPS points" display={path.length} valueClassName="text-base" />
          <StatCard icon={Gauge} tone="orange" label="Last speed" display={latest.speed != null ? `${latest.speed} km/h` : '—'} valueClassName="text-base" />
          <StatCard icon={Clock} tone="violet" label="Last seen" display={new Date(latest.recordedAt).toLocaleString()} valueClassName="truncate text-base" />
        </div>
      )}

      <Card className="h-[60vh] min-h-80 overflow-hidden py-0 md:h-[540px]">
        {isLoading ? <div className="flex h-full items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> : trucks.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6"><EmptyState icon={MapPin} title="No GPS data yet">Trucks appear here once their GPS devices start reporting locations.</EmptyState></div>
        ) : (
          <MapContainer center={positions[0] || DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {positions.length > 0 && (
              <>
                <Polyline positions={positions} pathOptions={{ color: '#059669', weight: 5, opacity: 0.85 }} />
                <FitBounds positions={positions} />
                {start && (
                  <CircleMarker center={[Number(start.latitude), Number(start.longitude)]} radius={8} pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 1 }}>
                    <Popup><strong>Start</strong><br />{new Date(start.recordedAt).toLocaleString()}</Popup>
                  </CircleMarker>
                )}
                {latest && (
                  <Marker position={[Number(latest.latitude), Number(latest.longitude)]}>
                    <Popup><strong>{active}</strong><br />Current position<br />{new Date(latest.recordedAt).toLocaleString()}
                      {latest.speed != null && <><br />Speed: {latest.speed} km/h</>}</Popup>
                  </Marker>
                )}
              </>
            )}
          </MapContainer>
        )}
      </Card>
      {!isFetching && active && path.length === 0 && trucks.length > 0 && <p className="text-center text-sm text-muted-foreground">No GPS points for {active} in this period.</p>}
    </div>
  )
}
