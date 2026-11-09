import { useState } from 'react'
import { Button } from '@heroui/react'
import { Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { getProduction } from '../../shared/api/mill'
import { getMillProduction, getMills } from '../../shared/api/mills'
import { useAuth } from '../../shared/context/AuthContext'
import { ErrorAlert, Loading, PageHeader } from '../kit/display'
import ProductionReport, { PeriodSwitch, periodRange } from '../kit/ProductionReport'
import { usePref } from '../lib/prefs'
import { v4 } from '../lib/paths'

/** Mill production monitoring. Mill users see their mill; a super admin opens one of their mills (/admin/mills/:id/production). */
export default function Production() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const superAdmin = user?.role === 'SUPER_ADMIN'
  const [period, setPeriod] = usePref('production.period', 'month')
  const { from, to } = periodRange(period)
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['production', id || 'mine', from, to],
    queryFn: () => (id ? getMillProduction(id, from, to) : getProduction(from, to)),
  })
  const { data: mills = [] } = useQuery({ queryKey: ['mills'], queryFn: getMills, enabled: superAdmin && !!id })
  const millName = mills.find(m => String(m.id) === String(id))?.name

  return (
    <>
      <PageHeader title={millName ? `Production · ${millName}` : 'Production'}
        description="Daily output, milling recovery, losses, downtime and shift comparison"
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSwitch value={period} onChange={setPeriod} />
            {!superAdmin && <Button variant="secondary" onPress={() => navigate(v4('/downtime'))}><Clock className="size-4" />Downtime log</Button>}
          </div>
        )} />
      <ErrorAlert error={error} />
      {isLoading || !report ? <Loading rows={6} /> : <ProductionReport report={report} />}
    </>
  )
}
