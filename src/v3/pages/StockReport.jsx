import { useQuery } from '@tanstack/react-query'
import { getStock } from '../../shared/api/mill'
import PageHeader from '../components/PageHeader'
import Loading from '../components/Loading'
import { StockCards, StockLedger } from '../components/Stock'

export default function StockReport() {
  const { data: stock, isLoading } = useQuery({ queryKey: ['stock'], queryFn: getStock, refetchInterval: 30000 })
  return (
    <div className="grid gap-6">
      <PageHeader title="Stock Report" description="Live paddy and rice balances · refreshes every 30 s" />
      {isLoading ? <Loading /> : <><StockCards stock={stock} /><StockLedger stock={stock} /></>}
    </div>
  )
}
