import { useEffect, useState } from 'react'
import { Badge, Button, Card, Center, Group, Loader, Select, SimpleGrid, Stack, Text, TextInput, ThemeIcon } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { Clock, Gauge, MapPin, Navigation, Truck } from 'lucide-react'
import { getTruckNumbers, getTruckPath } from '../../shared/api/mill'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { todayISO } from '../../shared/utils/dates'
import GpsKeyCard from '../components/GpsKeyCard'

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

function Stat({ icon: Icon, color, label, value }) {
  return (
    <Card padding="md">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon variant="light" color={color} size={40} radius="md"><Icon size={20} /></ThemeIcon>
        <div style={{ minWidth: 0 }}><Text size="xs" c="dimmed">{label}</Text><Text fw={700} truncate="end">{value}</Text></div>
      </Group>
    </Card>
  )
}

export default function TruckTracking() {
  const [selected, setSelected] = useState(null)
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
    <Stack gap="lg">
      <PageHeader title="Truck Tracking" description="Live GPS paths for paddy delivery trucks"
        actions={<Badge size="lg" variant="dot" color="leaf">Live · refreshes every 15 s</Badge>} />
      <GpsKeyCard />
      <Card padding="md">
        <Group align="flex-end" gap="md" wrap="wrap">
          <Select label="Truck" data={trucks} value={active || null} onChange={setSelected} placeholder={trucks.length ? 'Select truck' : 'No trucks yet'}
            disabled={!trucks.length} allowDeselect={false} w={{ base: '100%', sm: 220 }} />
          <TextInput type="date" max={toDate || todayISO()} label="From" value={fromDate} onChange={e => setFromDate(e.target.value)} w={{ base: '100%', xs: 170 }} />
          <TextInput type="date" min={fromDate || undefined} max={todayISO()} label="To" value={toDate} onChange={e => setToDate(e.target.value)} w={{ base: '100%', xs: 170 }} />
          {(fromDate || toDate) && <Button variant="subtle" color="gray" onClick={() => { setFromDate(''); setToDate('') }}>Clear dates</Button>}
          {isFetching && <Loader size="sm" />}
        </Group>
      </Card>

      {latest && (
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Stat icon={Truck} color="leaf" label="Truck" value={active} />
          <Stat icon={Navigation} color="blue" label="GPS points" value={path.length} />
          <Stat icon={Gauge} color="orange" label="Last speed" value={latest.speed != null ? `${latest.speed} km/h` : '—'} />
          <Stat icon={Clock} color="grape" label="Last seen" value={new Date(latest.recordedAt).toLocaleString()} />
        </SimpleGrid>
      )}

      <Card padding={0} h={{ base: '60vh', md: 540 }} mih={320} style={{ overflow: 'hidden' }}>
        {isLoading ? <Center h="100%"><Loader /></Center> : trucks.length === 0 ? (
          <Center h="100%"><EmptyState icon={MapPin} title="No GPS data yet">Trucks appear here once their GPS devices start reporting locations.</EmptyState></Center>
        ) : (
          <MapContainer center={positions[0] || DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {positions.length > 0 && (
              <>
                <Polyline positions={positions} pathOptions={{ color: '#0c9356', weight: 5, opacity: 0.85 }} />
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
      {!isFetching && active && path.length === 0 && trucks.length > 0 && <Text ta="center" c="dimmed" size="sm">No GPS points for {active} in this period.</Text>}
    </Stack>
  )
}
