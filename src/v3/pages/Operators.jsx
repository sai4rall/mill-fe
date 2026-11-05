import { useState } from 'react'
import { KeyRound, Loader2, Plus, UserCheck, UserCog, UserX } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/v3/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/v3/ui/dialog'
import { Input } from '@/v3/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/v3/ui/tooltip'
import { createOperator, getOperators, resetOperatorPassword, toggleOperatorStatus } from '../../shared/api/mill'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import ErrorAlert from '../components/ErrorAlert'
import Field from '../components/Field'
import PasswordDialog from '../components/PasswordDialog'
import StatusBadge from '../components/StatusBadge'
import Loading from '../components/Loading'
import { errorMessage } from '../lib/format'
import { notify } from '../lib/toast'

function IconAction({ label, onClick, className, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><Button variant="ghost" size="icon" className={`size-8 ${className || ''}`} onClick={onClick} aria-label={label}>{children}</Button></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default function Operators() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [reveal, setReveal] = useState(null)
  const { data: operators = [], isLoading } = useQuery({ queryKey: ['operators'], queryFn: getOperators })
  const refresh = () => qc.invalidateQueries({ queryKey: ['operators'] })

  const create = useMutation({
    mutationFn: (data) => createOperator(data),
    onSuccess: (op) => { refresh(); setForm(null); setReveal({ title: 'Operator created', username: op.username, password: op.generatedPassword }) },
  })
  const toggle = useMutation({ mutationFn: (id) => toggleOperatorStatus(id), onSuccess: () => { refresh(); notify('Operator status updated') }, onError: (e) => notify(errorMessage(e), 'error') })
  const reset = useMutation({
    mutationFn: ({ id }) => resetOperatorPassword(id),
    onSuccess: (r, { username }) => setReveal({ title: 'Password reset', username, password: r.generatedPassword, message: r.message }),
    onError: (e) => notify(errorMessage(e), 'error'),
  })

  const columns = [
    { key: 'username', header: 'Username', cell: (op) => <span className="font-mono font-medium">{op.username}</span> },
    { key: 'fullName', header: 'Full name', cell: (op) => op.fullName || '—' },
    { key: 'active', header: 'Status', cell: (op) => <StatusBadge status={op.active ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'act', header: '', align: 'right',
      cell: (op) => (
        <div className="flex justify-end gap-1">
          <IconAction label={`${op.active ? 'Deactivate' : 'Activate'} ${op.username}`} onClick={() => toggle.mutate(op.id)} className={op.active ? 'text-destructive hover:text-destructive' : 'text-emerald-700'}>
            {op.active ? <UserX /> : <UserCheck />}
          </IconAction>
          <IconAction label={`Reset password for ${op.username}`} onClick={() => reset.mutate({ id: op.id, username: op.username })}><KeyRound /></IconAction>
        </div>
      ),
    },
  ]

  return (
    <div className="grid gap-6">
      <PageHeader title="Operators" description="People who record day-to-day work in your mill"
        actions={<Button onClick={() => { create.reset(); setForm({ username: '', fullName: '' }) }}><Plus />Add operator</Button>} />
      {isLoading ? <Loading /> : operators.length === 0
        ? <EmptyState icon={UserCog} title="No operators yet">Add an operator so your team can record purchases and batches.</EmptyState>
        : <DataTable rows={operators} columns={columns} minWidth={560} />}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-md">
          {form && (
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate(form) }}>
              <DialogHeader><DialogTitle>Add operator</DialogTitle><DialogDescription>A password is generated and shown once.</DialogDescription></DialogHeader>
              <Field id="op-user" label="Username" required><Input id="op-user" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></Field>
              <Field id="op-name" label="Full name"><Input id="op-name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} /></Field>
              <ErrorAlert error={create.error} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="animate-spin" />}Create operator</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <PasswordDialog open={!!reveal} onClose={() => setReveal(null)} {...(reveal || {})} />
    </div>
  )
}
