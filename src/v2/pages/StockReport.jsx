import { Center, Loader, Stack } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { getStock } from '../../shared/api/mill'
import PageHeader from '../components/PageHeader'
import { StockCards, StockLedger } from '../components/Stock'

export default function StockReport() {
  const { data: stock, isLoading } = useQuery({ queryKey: ['stock'], queryFn: getStock, refetchInterval: 30000 })
  return (
    <Stack gap="lg">
      <PageHeader title="Stock Report" description="Live paddy and rice balances · refreshes every 30 s" />
      {isLoading ? <Center py={80}><Loader /></Center> : (
        <>
          <StockCards stock={stock} />
          <StockLedger stock={stock} />
        </>
      )}
    </Stack>
  )
}
