import { BarChart3, Factory, Package2, TrendingDown, TrendingUp, Wheat } from 'lucide-react'
import { Card } from '@/v3/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v3/ui/table'
import { cn } from '@/v3/lib/utils'
import StatCard from './StatCard'
import { ledgerRows, qtl } from '../lib/format'

export const STOCK_TILES = [
  { key: 'paddyOnHand', label: 'Paddy on Hand', icon: Wheat, tone: 'amber' },
  { key: 'paddyInMill', label: 'Paddy in Mill', icon: Factory, tone: 'blue' },
  { key: 'riceOnHand', label: 'Rice on Hand', icon: Package2, tone: 'emerald' },
  { key: 'totalPaddyPurchased', label: 'Total Paddy Purchased', icon: TrendingUp, tone: 'violet' },
  { key: 'totalRiceProduced', label: 'Total Rice Produced', icon: BarChart3, tone: 'teal' },
  { key: 'totalRiceExported', label: 'Total Rice Exported', icon: TrendingDown, tone: 'cyan' },
]

export function StockCards({ stock }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {STOCK_TILES.map(t => <StatCard key={t.key} label={t.label} value={stock?.[t.key]} icon={t.icon} tone={t.tone} />)}
    </div>
  )
}

export function StockLedger({ stock, note }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h3 className="font-semibold">Stock ledger</h3>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      <Table className="min-w-[560px]">
        <TableHeader className="bg-muted/50"><TableRow>
          <TableHead className="px-5">Line item</TableHead><TableHead>Description</TableHead><TableHead className="px-5 text-right">Quantity (Qtl)</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {ledgerRows(stock).map(r => (
            <TableRow key={r.label} className={cn(r.bold && 'bg-accent/60 hover:bg-accent')}>
              <TableCell className={cn('px-5', r.bold ? 'font-semibold' : 'font-medium')}>{r.label}</TableCell>
              <TableCell className="text-muted-foreground">{r.desc}</TableCell>
              <TableCell className={cn('v3-num px-5 text-right', r.bold ? 'font-bold' : 'font-medium')}>{qtl(r.value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
