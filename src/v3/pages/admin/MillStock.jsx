import { useState } from 'react'
import { ArrowLeft, FileSpreadsheet, FileText, Package2, Wheat } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/v3/ui/badge'
import { Button } from '@/v3/ui/button'
import { Card } from '@/v3/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/v3/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/v3/ui/tabs'
import { getMillStock, getMillStockStatement } from '../../../shared/api/mills'
import { downloadStockExcel, exportStockPdf } from '../../../shared/utils/stockExport'
import { todayISO } from '../../../shared/utils/dates'
import PageHeader from '../../components/PageHeader'
import DateField from '../../components/DateField'
import Field from '../../components/Field'
import Loading from '../../components/Loading'
import { Tone } from '../../components/StatusBadge'
import { StockCards, StockLedger } from '../../components/Stock'
import { notify } from '../../lib/toast'
import { v3 } from '../../lib/paths'

const RANGES = [{ label: 'Last 2 days', days: 2 }, { label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }]
function lastDays(days) {
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - days + 1)
  return [todayISO(from), todayISO(to)]
}

function Movements({ title, icon: Icon, iconClass, movements = [], inLabel, outLabel }) {
  const sum = (k) => movements.reduce((s, m) => s + (Number(m[k]) || 0), 0).toFixed(2)
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center gap-2 border-b px-5 py-3.5">
        <Icon className={`size-4 ${iconClass}`} /><h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">{movements.length} entries</Badge>
      </div>
      <Table className="min-w-[760px]">
        <TableHeader className="bg-muted/50"><TableRow>
          <TableHead className="px-5">Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead>
          <TableHead className="text-right">{inLabel} (Qtl)</TableHead><TableHead className="text-right">{outLabel} (Qtl)</TableHead><TableHead className="px-5 text-right">Balance</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {movements.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No movements in this period.</TableCell></TableRow>}
          {movements.map((m, i) => (
            <TableRow key={i}>
              <TableCell className="px-5 whitespace-nowrap">{m.date}</TableCell>
              <TableCell><Tone tone={m.type.endsWith('_IN') ? 'green' : 'red'}>{m.type.replace('_', ' ')}</Tone></TableCell>
              <TableCell className="max-w-80 truncate">{m.description}</TableCell>
              <TableCell className="v3-num text-right text-emerald-700">{m.quantityIn != null ? Number(m.quantityIn).toFixed(2) : '—'}</TableCell>
              <TableCell className="v3-num text-right text-rose-600">{m.quantityOut != null ? Number(m.quantityOut).toFixed(2) : '—'}</TableCell>
              <TableCell className={`v3-num px-5 text-right font-semibold ${Number(m.runningBalance) < 0 ? 'text-rose-600' : ''}`}>{Number(m.runningBalance).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        {movements.length > 0 && (
          <TableFooter><TableRow>
            <TableCell colSpan={3} className="px-5 font-semibold">Total</TableCell>
            <TableCell className="v3-num text-right font-semibold text-emerald-700">{sum('quantityIn')}</TableCell>
            <TableCell className="v3-num text-right font-semibold text-rose-600">{sum('quantityOut')}</TableCell><TableCell />
          </TableRow></TableFooter>
        )}
      </Table>
    </Card>
  )
}

export default function MillStock() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const millName = state?.millName || `Mill #${id}`
  const [tab, setTab] = useState('summary')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const { data: stock, isLoading } = useQuery({ queryKey: ['mill-stock', Number(id)], queryFn: () => getMillStock(id), refetchInterval: 30000 })
  const { data: statement, isLoading: stLoading } = useQuery({
    queryKey: ['mill-statement', Number(id), fromDate, toDate],
    queryFn: () => getMillStockStatement(id, fromDate || undefined, toDate || undefined), enabled: tab === 'statement',
  })
  const quick = (days) => { const [f, t] = lastDays(days); setFromDate(f); setToDate(t) }
  const excel = () => downloadStockExcel(id, millName, fromDate, toDate).catch(e => notify(e.message, 'error'))

  return (
    <div className="grid gap-6">
      <Button variant="ghost" className="-ml-2 w-fit" onClick={() => navigate(v3('/admin'))}><ArrowLeft />All mills</Button>
      <PageHeader title={millName} description="Stock management"
        actions={<>
          <Button variant="outline" onClick={() => exportStockPdf({ millName, tab, stock, statement, fromDate, toDate })}><FileText className="text-rose-600" />Export PDF</Button>
          <Button variant="outline" onClick={excel}><FileSpreadsheet className="text-emerald-600" />Export Excel</Button>
        </>} />
      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList><TabsTrigger value="summary">Stock summary</TabsTrigger><TabsTrigger value="statement">Stock statement</TabsTrigger></TabsList>
        <TabsContent value="summary" className="grid gap-6">
          {isLoading ? <Loading /> : stock && <><StockCards stock={stock} /><StockLedger stock={stock} note="Auto-refreshes every 30 s" /></>}
        </TabsContent>
        <TabsContent value="statement" className="grid gap-6">
          <Card className="flex-row flex-wrap items-end gap-3 p-4">
            <div className="flex gap-2">{RANGES.map(r => <Button key={r.days} size="sm" variant="outline" onClick={() => quick(r.days)}>{r.label}</Button>)}</div>
            <Field id="ms-from" label="From" className="w-full sm:w-44"><DateField id="ms-from" value={fromDate} max={toDate || todayISO()} onChange={setFromDate} clearable placeholder="Any date" /></Field>
            <Field id="ms-to" label="To" className="w-full sm:w-44"><DateField id="ms-to" value={toDate} min={fromDate || undefined} onChange={setToDate} clearable placeholder="Today" /></Field>
            {(fromDate || toDate) && <Button size="sm" variant="ghost" onClick={() => { setFromDate(''); setToDate('') }}>Clear</Button>}
          </Card>
          {stLoading ? <Loading /> : statement && (
            <>
              <Movements title="Paddy stock statement" icon={Wheat} iconClass="text-amber-600" movements={statement.paddyMovements} inLabel="Paddy in" outLabel="Paddy out" />
              <Movements title="Rice stock statement" icon={Package2} iconClass="text-emerald-600" movements={statement.riceMovements} inLabel="Rice in" outLabel="Rice out" />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
