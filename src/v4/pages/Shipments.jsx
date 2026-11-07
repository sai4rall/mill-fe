import { Truck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getAllShipments } from '../../shared/api/mill'
import { shipmentTotals } from '../../shared/utils/gps'
import DataTable from '../kit/DataTable'
import { EmptyState, Loading, PageHeader } from '../kit/display'
import StatTile from '../kit/StatTile'

/** Every shipment of the mill, newest first. Shipments are recorded from Orders. */
export default function Shipments() {
  const { data: shipments = [], isLoading } = useQuery({ queryKey: ['shipments-all'], queryFn: getAllShipments })
  const totals = shipmentTotals(shipments)
  const columns = [
    { key: 'shipmentDate', header: 'Date', className: 'whitespace-nowrap' },
    { key: 'customerName', header: 'Customer', cell: (s) => <span className="font-semibold">{s.customerName || '—'}</span> },
    { key: 'riceType', header: 'Rice type', cell: (s) => <span className="text-muted">{s.riceType || '—'}</span> },
    { key: 'quintalsExported', header: 'Quintals', align: 'right', cell: (s) => <span className="v4-num font-bold">{s.quintalsExported} Qtl</span> },
    { key: 'vehicleNumber', header: 'Vehicle', cell: (s) => <span className="font-mono text-xs">{s.vehicleNumber || '—'}</span> },
    { key: 'notes', header: 'Notes', cell: (s) => <span className="text-muted">{s.notes || '—'}</span> },
  ]
  return (
    <>
      <PageHeader title="Shipments" description="Rice dispatched against export orders. Record new shipments from Orders." />
      <div className="grid max-w-xl grid-cols-2 gap-3 sm:gap-4">
        <StatTile label="Shipments" value={totals.count} decimals={0} unit="" icon={Truck} tone="blue" />
        <StatTile label="Exported" value={totals.quintals} icon={Truck} tone="emerald" />
      </div>
      {isLoading ? <Loading /> : shipments.length === 0
        ? <EmptyState icon={Truck} title="No shipments yet">Shipments appear here once you record them against an export order.</EmptyState>
        : <DataTable label="Shipments" rows={shipments} columns={columns} minWidth={720} />}
    </>
  )
}
