import { useState } from 'react'
import { ActionIcon, Button, Group, Stack, Table, Text, TextInput } from '@mantine/core'
import { Plus, Trash2 } from 'lucide-react'
import { hasRangeErrors, toPayload, toRows, validateRanges } from '../../shared/utils/moisture'
import TableCard from './TableCard'
import ErrorAlert from './ErrorAlert'

/** Editable moisture bands (same rules as the classic editor). `onSave` receives the sorted payload. */
export default function RangesEditor({ initial, onSave, saving, serverError, saveLabel = 'Save ranges' }) {
  const [rows, setRows] = useState(() => toRows(initial))
  const [errors, setErrors] = useState({ rows: {}, table: null })
  const [touched, setTouched] = useState(false)
  const update = (next) => { setRows(next); if (touched) setErrors(validateRanges(next)) }
  const set = (i, key, value) => update(rows.map((r, k) => (k === i ? { ...r, [key]: value } : r)))
  const add = () => update([...rows, { fromPct: rows[rows.length - 1]?.toPct || '', toPct: '', deductionPct: '' }])
  const remove = (i) => update(rows.filter((_, k) => k !== i))
  const save = () => {
    setTouched(true)
    const found = validateRanges(rows)
    setErrors(found)
    if (!hasRangeErrors(found)) onSave(toPayload(rows))
  }

  return (
    <Stack gap="md">
      <TableCard minWidth={0}>
        <Table.Thead><Table.Tr>
          <Table.Th title="Moisture from (inclusive)">From %</Table.Th>
          <Table.Th title="Up to, not including; empty = and above">Below %</Table.Th>
          <Table.Th title="Price deduction">Deduction %</Table.Th>
          <Table.Th w={48} />
        </Table.Tr></Table.Thead>
        <Table.Tbody>
          {rows.length === 0 && <Table.Tr><Table.Td colSpan={4}><Text ta="center" c="dimmed" size="sm" py="md">No ranges — purchases get no deduction.</Text></Table.Td></Table.Tr>}
          {rows.map((r, i) => (
            <Table.Tr key={i} style={{ verticalAlign: 'top' }}>
              <Table.Td><TextInput aria-label={`Range ${i + 1} from`} inputMode="decimal" value={r.fromPct} onChange={e => set(i, 'fromPct', e.target.value.trim())} miw={64} /></Table.Td>
              <Table.Td><TextInput aria-label={`Range ${i + 1} to`} inputMode="decimal" placeholder="& above" value={r.toPct} onChange={e => set(i, 'toPct', e.target.value.trim())} miw={64} /></Table.Td>
              <Table.Td>
                <TextInput aria-label={`Range ${i + 1} deduction`} inputMode="decimal" value={r.deductionPct} onChange={e => set(i, 'deductionPct', e.target.value.trim())}
                  miw={64} error={errors.rows[i]} />
              </Table.Td>
              <Table.Td><ActionIcon variant="subtle" color="red" mt={4} onClick={() => remove(i)} aria-label={`Remove range ${i + 1}`}><Trash2 size={16} /></ActionIcon></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </TableCard>
      {errors.table && <Text c="red" size="sm" role="alert">{errors.table}</Text>}
      {serverError && <ErrorAlert>{serverError}</ErrorAlert>}
      <Group>
        <Button variant="default" leftSection={<Plus size={16} />} onClick={add} disabled={rows.length >= 20}>Add range</Button>
        <Button onClick={save} loading={saving}>{saveLabel}</Button>
      </Group>
      <Text size="xs" c="dimmed">A range covers moisture from its first value up to, but not including, its second value. Leave the second value empty for “and above”. Moisture outside every range gets no deduction.</Text>
    </Stack>
  )
}
