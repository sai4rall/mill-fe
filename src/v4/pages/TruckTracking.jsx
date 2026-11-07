import { useEffect, useState } from 'react'
import { Button, Chip } from '@heroui/react'
import { Clock, Gauge, Loader2, MapPin, Navigation, Truck } from 'lucide-react'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { getTruckNumbers, getTruckPath } from '../../shared/api/mill'
import { todayISO } from '../../shared/utils/dates'
import { EmptyState, PageHeader } from '../kit/display'
import { DateInput, SelectInput } from '../kit/fields'
import StatTile from '../kit/StatTile'
import GpsKeyCard from '../kit/GpsKeyCard'
import { tokenColor } from '../lib/theme'
import { rise } from '../lib/motion'

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
    <>
      <PageHeader title="Trucks" description="Live GPS paths for paddy delivery trucks"
        actions={<Chip variant="soft" color="success"><span className="mr-1.5 inline-block size-2 animate-ping rounded-full bg-success" />Live · every 15 s</Chip>} />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <motion.aside variants={rise} className="grid content-start gap-4 rounded-card border border-border bg-surface p-5">
          <SelectInput label="Truck" options={trucks.map(t => ({ value: t, label: t }))} value={active} onChange={setSelected} placeholder={trucks.length ? 'Select truck' : 'No trucks yet'} isDisabled={!trucks.length} />
          <DateInput label="From" value={fromDate} max={toDate || todayISO()} onChange={setFromDate} />
          <DateInput label="To" value={toDate} min={fromDate || undefined} onChange={setToDate} />
          {(fromDate || toDate) && <Button variant="ghost" onPress={() => { setFromDate(''); setToDate('') }}>Clear dates</Button>}
          <GpsKeyCard />
          {latest && (
            <div className="grid gap-3 pt-2">
              <StatTile icon={Truck} tone="ok" label="Truck" display={active} />
              <StatTile icon={Navigation} tone="rice" label="GPS points" display={path.length} />
              <StatTile icon={Gauge} tone="warn" label="Last speed" display={latest.speed != null ? `${latest.speed} km/h` : '—'} />
              <StatTile icon={Clock} tone="neutral" label="Last seen" display={<span className="text-base">{new Date(latest.recordedAt).toLocaleString('en-IN')}</span>} />
            </div>
          )}
        </motion.aside>

        <motion.div variants={rise} className="relative h-[60vh] min-h-80 overflow-hidden rounded-card border border-border bg-surface lg:h-[640px]">
          {isFetching && <Loader2 className="absolute top-3 right-3 z-[500] size-5 animate-spin text-muted" />}
          {isLoading ? <div className="flex h-full items-center justify-center"><Loader2 className="size-6 animate-spin text-muted" /></div> : trucks.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6"><EmptyState icon={MapPin} title="No GPS data yet">Trucks appear here once their GPS devices start reporting locations.</EmptyState></div>
          ) : (
            <MapContainer center={positions[0] || DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {positions.length > 0 && (
                <>
                  <Polyline positions={positions} pathOptions={{ color: tokenColor('accent', 'green'), weight: 5, opacity: 0.85 }} />
                  <FitBounds positions={positions} />
                  {start && <CircleMarker center={[Number(start.latitude), Number(start.longitude)]} radius={8} pathOptions={{ color: tokenColor('rice', 'blue'), fillColor: tokenColor('rice', 'blue'), fillOpacity: 1 }}><Popup><strong>Start</strong><br />{new Date(start.recordedAt).toLocaleString('en-IN')}</Popup></CircleMarker>}
                  {latest && (
                    <Marker position={[Number(latest.latitude), Number(latest.longitude)]}>
                      <Popup><strong>{active}</strong><br />Current position<br />{new Date(latest.recordedAt).toLocaleString('en-IN')}{latest.speed != null && <><br />Speed: {latest.speed} km/h</>}</Popup>
                    </Marker>
                  )}
                </>
              )}
            </MapContainer>
          )}
        </motion.div>
      </div>
      {!isFetching && active && path.length === 0 && trucks.length > 0 && <p className="text-center text-sm text-muted">No GPS points for {active} in this period.</p>}
    </>
  )
}
