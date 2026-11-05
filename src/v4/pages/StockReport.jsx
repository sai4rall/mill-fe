import { useQuery } from '@tanstack/react-query'
import { getStock } from '../../shared/api/mill'
import { Loading, PageHeader } from '../kit/display'
import { StockLedger, StockTiles } from '../kit/Stock'

export default function StockReport() {
  const { data: stock, isLoading } = useQuery({ queryKey: ['stock'], queryFn: getStock, refetchInterval: 30000 })
  return (
    <>
      <PageHeader title="Stock" description="Live paddy and rice balances · refreshes every 30 s" />
      {isLoading ? <Loading /> : <><StockTiles stock={stock} /><StockLedger stock={stock} /></>}
    </>
  )
}
