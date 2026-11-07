import { useState } from 'react'
import { Button, Chip, Tabs } from '@heroui/react'
import { ArrowLeft, FileSpreadsheet, FileText, Package2, Wheat } from 'lucide-react'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getMillStock, getMillStockStatement } from '../../../shared/api/mills'
import { downloadStockExcel, exportStockPdf } from '../../../shared/utils/stockExport'
import { todayISO } from '../../../shared/utils/dates'
import { Loading, PageHeader, StatusChip } from '../../kit/display'
import { DateInput } from '../../kit/fields'
import { StockLedger, StockTiles } from '../../kit/Stock'
import { cx } from '../../lib/format'
import { rise } from '../../lib/motion'
import { notify } from '../../lib/toast'
import { date, num } from '../../lib/numbers'
import { v4 } from '../../lib/paths'

const RANGES = [{ label: 'Last 2 days', days: 2 }, { label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }]
function lastDays(days) {
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - days + 1)
  return [todayISO(from), todayISO(to)]
}

/** Movements as a timeline: each entry is a dot on a vertical line with in/out and running balance. */
function Movements({ title, icon: Icon, iconClass, movements = [] }) {
  const sum = (k) => movements.reduce((s, m) => s + (Number(m[k]) || 0), 0).toFixed(2)
  return (
    <motion.section variants={rise} className="rounded-card border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Icon className={cx('size-5', iconClass)} /><h3 className="font-bold">{title}</h3>
        <Chip size="sm" variant="soft" className="ml-auto">{movements.length} entries</Chip>
        {movements.length > 0 && <span className="text-xs text-muted">In <b className="text-success">{sum('quantityIn')}</b> · Out <b className="text-danger">{sum('quantityOut')}</b> Qtl</span>}
      </div>
      {movements.length === 0 ? <p className="py-6 text-center text-sm text-muted">No movements in this period.</p> : (
        <ol className="relative grid gap-1 border-l border-border pl-5">
          {movements.map((m, i) => {
            const inbound = m.type.endsWith('_IN')
            return (
              <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="relative py-2">
                <span className={cx('absolute top-3.5 -left-[25px] size-2.5 rounded-full ring-4 ring-surface', inbound ? 'bg-success' : 'bg-danger')} />
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0"><p className="text-sm font-medium">{m.description}</p><p className="text-xs text-muted">{date(m.date)} · <StatusChip color={inbound ? 'success' : 'danger'}>{m.type.replace('_', ' ')}</StatusChip></p></div>
                  <div className="text-right text-sm">
                    <span className={cx('v4-num font-semibold', inbound ? 'text-success' : 'text-danger')}>{inbound ? '+' : '−'}{num(inbound ? m.quantityIn : m.quantityOut || 0)}</span>
                    <span className={cx('v4-num ml-3 text-xs', Number(m.runningBalance) < 0 ? 'text-danger' : 'text-muted')}>bal {num(m.runningBalance)}</span>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </ol>
      )}
    </motion.section>
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
    <>
      <Button variant="ghost" className="-ml-2 w-fit" onPress={() => navigate(v4('/admin'))}><ArrowLeft className="size-4" />All mills</Button>
      <PageHeader title={millName} description="Stock management"
        actions={<>
          <Button variant="secondary" onPress={() => exportStockPdf({ millName, tab, stock, statement, fromDate, toDate })}><FileText className="size-4 text-danger" />Export PDF</Button>
          <Button variant="secondary" onPress={excel}><FileSpreadsheet className="size-4 text-success" />Export Excel</Button>
        </>} />
      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k))}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Stock view">
            <Tabs.Tab id="summary">Stock summary<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="statement">Stock statement<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="summary" className="grid gap-6 pt-6">
          {isLoading ? <Loading /> : stock && <><StockTiles stock={stock} /><StockLedger stock={stock} note="Auto-refreshes every 30 s" /></>}
        </Tabs.Panel>
        <Tabs.Panel id="statement" className="grid gap-6 pt-6">
          <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4">
            <div className="flex gap-2">{RANGES.map(r => <Button key={r.days} size="sm" variant="secondary" onPress={() => quick(r.days)}>{r.label}</Button>)}</div>
            <DateInput label="From" className="sm:w-48" value={fromDate} max={toDate || todayISO()} onChange={setFromDate} />
            <DateInput label="To" className="sm:w-48" value={toDate} min={fromDate || undefined} onChange={setToDate} />
            {(fromDate || toDate) && <Button size="sm" variant="ghost" onPress={() => { setFromDate(''); setToDate('') }}>Clear</Button>}
          </div>
          {stLoading ? <Loading /> : statement && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Movements title="Paddy" icon={Wheat} iconClass="text-warn" movements={statement.paddyMovements} />
              <Movements title="Rice" icon={Package2} iconClass="text-ok" movements={statement.riceMovements} />
            </div>
          )}
        </Tabs.Panel>
      </Tabs>
    </>
  )
}
