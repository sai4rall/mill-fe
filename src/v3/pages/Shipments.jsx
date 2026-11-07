import { Truck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getAllShipments } from '../../shared/api/mill'
import { shipmentTotals } from '../../shared/utils/gps'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import Loading from '../components/Loading'
import StatCard from '../components/StatCard'

/** Every shipment of the mill, newest first. Shipments are recorded from Export Orders. */
export default function Shipments() {
  const { data: shipments = [], isLoading } = useQuery({ queryKey: ['shipments-all'], queryFn: getAllShipments })
  const totals = shipmentTotals(shipments)
  const columns = [
    { key: 'shipmentDate', header: 'Date', className: 'whitespace-nowrap' },
    { key: 'customerName', header: 'Customer', cell: (s) => <span className="font-medium">{s.customerName || '—'}</span> },
    { key: 'riceType', header: 'Rice type', cell: (s) => <span className="text-muted-foreground">{s.riceType || '—'}</span> },
    { key: 'quintalsExported', header: 'Quintals', align: 'right', cell: (s) => <span className="v3-num font-semibold">{s.quintalsExported} Qtl</span> },
    { key: 'vehicleNumber', header: 'Vehicle', cell: (s) => <span className="font-mono text-xs">{s.vehicleNumber || '—'}</span> },
    { key: 'notes', header: 'Notes', cell: (s) => <span className="text-muted-foreground">{s.notes || '—'}</span> },
  ]
  return (
    <div className="grid gap-6">
      <PageHeader title="Shipments" description="Rice dispatched against export orders. Record new shipments from Export Orders." />
      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <StatCard label="Shipments" display={totals.count} icon={Truck} tone="blue" />
        <StatCard label="Exported" value={totals.quintals} icon={Truck} tone="emerald" />
      </div>
      {isLoading ? <Loading /> : shipments.length === 0
        ? <EmptyState icon={Truck} title="No shipments yet">Shipments appear here once you record them against an export order.</EmptyState>
        : <DataTable rows={shipments} columns={columns} minWidth={720} />}
    </div>
  )
}
