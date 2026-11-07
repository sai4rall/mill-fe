import { useState } from 'react'
import { Button, Tooltip } from '@heroui/react'
import { KeyRound, Plus, UserCheck, UserCog, UserX } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createOperator, getOperators, resetOperatorPassword, toggleOperatorStatus } from '../../shared/api/mill'
import DataTable from '../kit/DataTable'
import { EmptyState, ErrorAlert, Loading, PageHeader, StatusChip } from '../kit/display'
import { TextInput } from '../kit/fields'
import { Panel, SubmitButton } from '../kit/overlays'
import PasswordReveal from '../kit/PasswordReveal'
import { errorMessage } from '../lib/format'
import { notify } from '../lib/toast'

function IconAction({ label, onPress, className, children }) {
  return (
    <Tooltip delay={200}>
      <Button isIconOnly size="sm" variant="ghost" className={className} onPress={onPress} aria-label={label}>{children}</Button>
      <Tooltip.Content><p>{label}</p></Tooltip.Content>
    </Tooltip>
  )
}

export default function Operators() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [reveal, setReveal] = useState(null)
  const { data: operators = [], isLoading } = useQuery({ queryKey: ['operators'], queryFn: getOperators })
  const refresh = () => qc.invalidateQueries({ queryKey: ['operators'] })

  const create = useMutation({ mutationFn: (data) => createOperator(data), onSuccess: (op) => { refresh(); setForm(null); setReveal({ title: 'Operator created', username: op.username, password: op.generatedPassword }) } })
  const toggle = useMutation({ mutationFn: (id) => toggleOperatorStatus(id), onSuccess: () => { refresh(); notify('Operator status updated') }, onError: (e) => notify(errorMessage(e), 'error') })
  const reset = useMutation({
    mutationFn: ({ id }) => resetOperatorPassword(id),
    onSuccess: (r, { username }) => setReveal({ title: 'Password reset', username, password: r.generatedPassword, message: r.message }),
    onError: (e) => notify(errorMessage(e), 'error'),
  })

  const columns = [
    { key: 'username', header: 'Username', cell: (op) => <span className="font-mono font-semibold">{op.username}</span> },
    { key: 'fullName', header: 'Full name', cell: (op) => op.fullName || '—' },
    { key: 'active', header: 'Status', cell: (op) => <StatusChip status={op.active ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'act', header: '', align: 'right',
      cell: (op) => (
        <div className="flex justify-end gap-1">
          <IconAction label={`${op.active ? 'Deactivate' : 'Activate'} ${op.username}`} onPress={() => toggle.mutate(op.id)} className={op.active ? 'text-danger' : 'text-success'}>{op.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}</IconAction>
          <IconAction label={`Reset password for ${op.username}`} onPress={() => reset.mutate({ id: op.id, username: op.username })}><KeyRound className="size-4" /></IconAction>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Operators" description="People who record day-to-day work in your mill"
        actions={<Button onPress={() => { create.reset(); setForm({ username: '', fullName: '' }) }}><Plus className="size-4" />Add operator</Button>} />
      {isLoading ? <Loading /> : operators.length === 0
        ? <EmptyState icon={UserCog} title="No operators yet">Add an operator so your team can record purchases and batches.</EmptyState>
        : <DataTable label="Operators" rows={operators} columns={columns} minWidth={560} />}

      <Panel open={!!form} onClose={() => setForm(null)} title="Add operator" description="A password is generated and shown once." width="sm:w-[28rem]"
        onSubmit={(e) => { e.preventDefault(); create.mutate(form) }}
        footer={<><Button variant="tertiary" onPress={() => setForm(null)}>Cancel</Button><SubmitButton pending={create.isPending}>Create operator</SubmitButton></>}>
        {form && (
          <>
            <TextInput label="Username" required value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} />
            <TextInput label="Full name" value={form.fullName} onChange={v => setForm(f => ({ ...f, fullName: v }))} />
            <ErrorAlert error={create.error} />
          </>
        )}
      </Panel>
      <PasswordReveal open={!!reveal} onClose={() => setReveal(null)} {...(reveal || {})} />
    </>
  )
}
