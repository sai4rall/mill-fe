import { useMemo, useState } from 'react'
import {
  ActionIcon, Alert, Avatar, Badge, Button, Center, Divider, Drawer, FileButton, Group, Loader, SimpleGrid, Stack, Table, Text,
  TextInput, Textarea, Tooltip,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Camera, Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react'
import {
  createFarmer, deleteFarmer, deleteFarmerPhoto, getFarmers, sendFarmerOtp, updateFarmer, uploadFarmerPhoto, verifyFarmerOtp,
} from '../../shared/api/mill'
import { normalizePhone, resizeImage } from '../../shared/utils/image'
import { normalizeFarmer, serverFieldErrors, validateFarmer, bankConfirmNeeded } from '../../shared/utils/farmerValidation'
import { phoneInput } from '../../shared/utils/phone'
import PageHeader from '../components/PageHeader'
import TableCard from '../components/TableCard'
import EmptyState from '../components/EmptyState'
import FarmerAvatar from '../components/FarmerAvatar'
import OtpEntry from '../components/OtpEntry'
import { errorMessage } from '../../shared/utils/errors'
import { useCountdown } from '../../shared/hooks/useCountdown'

const EMPTY = { name: '', phone: '', address: '', bankAccount: '', bankName: '', ifscCode: '', confirmBankAccount: '' }
const EMPTY_PHOTO = { file: null, preview: null, removed: false }
const EMPTY_OTP = { sentTo: '', code: '', token: '', verifiedPhone: '' }

export default function Farmers() {
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // null | { id?, farmer? }
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [photo, setPhoto] = useState(EMPTY_PHOTO)
  const [photoError, setPhotoError] = useState('')
  const [otp, setOtp] = useState(EMPTY_OTP)
  const [otpError, setOtpError] = useState('')
  const [otpBusy, setOtpBusy] = useState(null)
  const [cooldown, startCooldown] = useCountdown()

  const { data: farmers = [], isLoading } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? farmers.filter(f => f.name.toLowerCase().includes(q) || (f.phone || '').includes(q)) : farmers
  }, [farmers, query])

  // ---- phone / OTP ----
  const originalPhone = editing?.farmer?.phone || ''
  const phone = normalizePhone(form.phone)
  const phoneChangedFor = (value) => !editing?.id || (value.trim() !== originalPhone && normalizePhone(value) !== originalPhone)
  const phoneChanged = phoneChangedFor(form.phone)
  const phoneVerified = !!otp.token && otp.verifiedPhone === phone
  const otpPending = !!otp.sentTo && otp.sentTo === phone && !phoneVerified
  const canSave = !phoneChanged || phoneVerified

  const setField = (key, value) => {
    const next = { ...form, [key]: value }
    setForm(next)
    if (key === 'phone') setOtpError('')
    if (submitted) setErrors(validateFarmer(next, { requirePhone: phoneChangedFor(next.phone), originalBankAccount: editing?.farmer?.bankAccount }))
  }

  const sendOtp = async () => {
    setOtpError('')
    const phoneError = validateFarmer(form).phone
    setErrors(e => { const { phone: _p, ...rest } = e; return phoneError ? { ...rest, phone: phoneError } : rest })
    if (phoneError) return
    setOtpBusy('send')
    try {
      await sendFarmerOtp(phone)
      setOtp({ ...EMPTY_OTP, sentTo: phone })
      startCooldown(30)
    } catch (e) { setOtpError(errorMessage(e)) } finally { setOtpBusy(null) }
  }
  const verifyOtp = async (code) => {
    setOtpError('')
    setOtpBusy('verify')
    try {
      const { verificationToken } = await verifyFarmerOtp(otp.sentTo, code)
      setOtp(o => ({ ...o, code, token: verificationToken, verifiedPhone: o.sentTo }))
    } catch (e) { setOtpError(errorMessage(e)) } finally { setOtpBusy(null) }
  }

  // ---- photo ----
  const pickPhoto = async (file) => {
    if (!file) return
    setPhotoError('')
    try {
      const resized = await resizeImage(file)
      if (photo.preview) URL.revokeObjectURL(photo.preview)
      setPhoto({ file: resized, preview: URL.createObjectURL(resized), removed: false })
    } catch (e) { setPhotoError(e.message) }
  }
  const hasExistingPhoto = !!editing?.farmer?.photoUpdatedAt && !photo.removed

  // ---- save / delete ----
  const save = useMutation({
    mutationFn: async ({ id, data, photo }) => {
      const saved = id ? await updateFarmer(id, data) : await createFarmer(data)
      // The farmer now exists: a retry after a failed photo upload must be an update, not a second create.
      setEditing({ id: saved.id, farmer: saved })
      setOtp(EMPTY_OTP)
      try {
        if (photo.file) await uploadFarmerPhoto(saved.id, photo.file)
        else if (photo.removed && saved.photoUpdatedAt) await deleteFarmerPhoto(saved.id)
      } catch (e) {
        throw new Error(`Farmer saved, but the photo could not be updated: ${errorMessage(e)}`)
      }
      return saved
    },
    onSuccess: (saved, { id }) => { close(); notifications.show({ color: 'leaf', title: id ? 'Farmer updated' : 'Farmer registered', message: saved.name }) },
    onError: (e) => { if (e?.response?.data?.fields) setErrors(serverFieldErrors(e.response.data.fields)) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['farmers'] }),
  })
  const remove = useMutation({
    mutationFn: (id) => deleteFarmer(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farmers'] }); notifications.show({ color: 'leaf', message: 'Farmer deleted' }) },
    onError: (e) => notifications.show({ color: 'red', title: 'Could not delete', message: errorMessage(e) }),
  })

  const reset = () => {
    if (photo.preview) URL.revokeObjectURL(photo.preview)
    setPhoto(EMPTY_PHOTO); setPhotoError(''); setOtp(EMPTY_OTP); setOtpError(''); setOtpBusy(null)
    setErrors({}); setSubmitted(false); save.reset()
  }
  const openCreate = () => { reset(); setForm(EMPTY); setEditing({}) }
  const openEdit = (f) => {
    reset()
    setForm({ name: f.name, phone: f.phone || '', address: f.address || '', bankAccount: f.bankAccount || '', bankName: f.bankName || '', ifscCode: f.ifscCode || '', confirmBankAccount: '' })
    setEditing({ id: f.id, farmer: f })
  }
  const close = () => { setEditing(null); reset() }

  const submit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    const found = validateFarmer(form, { requirePhone: phoneChanged, originalBankAccount: editing?.farmer?.bankAccount })
    setErrors(found)
    if (!canSave) setOtpError('Please verify the mobile number with OTP before saving')
    if (Object.keys(found).length || !canSave) return
    const data = { ...normalizeFarmer(form), phone: phoneChanged ? phone : form.phone }
    if (phoneChanged) data.phoneVerificationToken = otp.token
    save.mutate({ id: editing.id, data, photo })
  }

  return (
    <Stack gap="lg">
      <PageHeader title="Farmers" description="Registered farmers with verified mobile numbers"
        actions={<Button leftSection={<Plus size={16} />} onClick={openCreate}>Register farmer</Button>} />

      <TextInput placeholder="Search by name or mobile" leftSection={<Search size={16} />} value={query}
        onChange={e => setQuery(e.target.value)} maw={420} aria-label="Search farmers" />

      {isLoading ? <Center py={80}><Loader /></Center> : farmers.length === 0 ? (
        <EmptyState icon={Users} title="No farmers yet" action={<Button mt="sm" onClick={openCreate}>Register the first farmer</Button>}>
          Register farmers with a verified mobile number to record purchases and payments.
        </EmptyState>
      ) : (
        <TableCard minWidth={720}>
          <Table.Thead><Table.Tr><Table.Th>Farmer</Table.Th><Table.Th>Mobile</Table.Th><Table.Th>Bank</Table.Th><Table.Th ta="right">Actions</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {shown.map(f => (
              <Table.Tr key={f.id}>
                <Table.Td>
                  <Group gap="sm" wrap="nowrap">
                    <FarmerAvatar farmer={f} />
                    <div><Text fw={600} size="sm">{f.name}</Text>{f.address && <Text size="xs" c="dimmed" lineClamp={1}>{f.address}</Text>}</div>
                  </Group>
                </Table.Td>
                <Table.Td>
                  {f.phone ? (
                    <Group gap={6} wrap="nowrap">
                      <Text size="sm" className="v2-num">{f.phone}</Text>
                      {f.phoneVerified
                        ? <Tooltip label="Verified via OTP"><BadgeCheck size={16} color="var(--mantine-color-leaf-6)" aria-label="Verified" /></Tooltip>
                        : <Badge color="yellow" size="xs">Unverified</Badge>}
                    </Group>
                  ) : '—'}
                </Table.Td>
                <Table.Td>
                  {f.bankAccount ? (
                    <div><Text size="sm" ff="monospace">{f.bankAccount}</Text><Text size="xs" c="dimmed">{f.bankName} · {f.ifscCode}</Text></div>
                  ) : <Text size="sm" c="dimmed">—</Text>}
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <ActionIcon variant="subtle" onClick={() => openEdit(f)} aria-label={`Edit ${f.name}`}><Pencil size={16} /></ActionIcon>
                    <ActionIcon variant="subtle" color="red" aria-label={`Delete ${f.name}`}
                      onClick={() => { if (window.confirm(`Delete ${f.name}?`)) remove.mutate(f.id) }}><Trash2 size={16} /></ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {shown.length === 0 && <Table.Tr><Table.Td colSpan={4}><Text ta="center" c="dimmed" py="md">No farmers match “{query}”.</Text></Table.Td></Table.Tr>}
          </Table.Tbody>
        </TableCard>
      )}

      <Drawer opened={!!editing} onClose={close} position="right" size="lg" title={<Text fw={700} size="lg">{editing?.id ? 'Edit farmer' : 'Register farmer'}</Text>}>
        {editing && (
          <Stack component="form" gap="lg" onSubmit={submit} noValidate>
            {/* Photo */}
            <Group gap="md">
              {photo.preview
                ? <Avatar src={photo.preview} size={84} radius="xl" alt="Farmer photo" />
                : hasExistingPhoto ? <FarmerAvatar farmer={editing.farmer} size={84} />
                  : <Avatar size={84} radius="xl" color="leaf" variant="light"><Camera size={30} /></Avatar>}
              <Stack gap={6}>
                <Group gap="xs">
                  <FileButton onChange={pickPhoto} accept="image/jpeg,image/png,image/webp">
                    {(props) => <Button {...props} variant="light" size="xs" leftSection={<Camera size={14} />}>{photo.preview || hasExistingPhoto ? 'Change photo' : 'Upload photo'}</Button>}
                  </FileButton>
                  {(photo.preview || hasExistingPhoto) && (
                    <Button variant="subtle" color="red" size="xs" onClick={() => setPhoto({ file: null, preview: null, removed: true })}>Remove</Button>
                  )}
                </Group>
                <Text size="xs" c="dimmed">JPG, PNG or WebP · optional</Text>
                {photoError && <Text size="xs" c="red">{photoError}</Text>}
              </Stack>
            </Group>

            <Divider label="Identity" labelPosition="left" />
            <TextInput label="Full name" withAsterisk maxLength={100} value={form.name} error={errors.name}
              onChange={e => setField('name', e.target.value)} />

            <Stack gap="xs">
              <Group align="flex-end" gap="sm" wrap="nowrap">
                <TextInput label="Mobile number" withAsterisk style={{ flex: 1 }} inputMode="numeric" placeholder="10-digit mobile"
                  leftSection={<Text size="sm" c="dimmed">+91</Text>} leftSectionWidth={44} value={form.phone} error={errors.phone}
                  rightSection={phoneVerified ? <BadgeCheck size={18} color="var(--mantine-color-leaf-6)" /> : null}
                  onChange={e => setField('phone', phoneInput(e.target.value))} />
                {phoneChanged && !phoneVerified && !otpPending && (
                  <Button variant="light" onClick={sendOtp} loading={otpBusy === 'send'} leftSection={<Phone size={14} />}
                    mb={errors.phone ? 22 : 0}>Send OTP</Button>
                )}
              </Group>
              {otpPending && (
                <OtpEntry sentTo={otp.sentTo} value={otp.code} cooldown={cooldown} resending={otpBusy === 'send'} onResend={sendOtp}
                  onChange={(code) => { setOtp(o => ({ ...o, code })); if (code.length === 6) verifyOtp(code) }} />
              )}
              {phoneVerified && <Text size="xs" c="leaf.7" fw={600}>Mobile number verified</Text>}
              {!phoneChanged && editing.farmer && (
                <Text size="xs" c="dimmed">{editing.farmer.phoneVerified ? 'Verified number. ' : ''}Changing the number will require OTP verification.</Text>
              )}
              {otpError && <Text size="xs" c="red" role="alert">{otpError}</Text>}
            </Stack>

            <Textarea label="Address" autosize minRows={2} maxLength={500} value={form.address} error={errors.address}
              onChange={e => setField('address', e.target.value)} />

            <Divider label="Bank details (optional — all three or none)" labelPosition="left" />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Bank account no." type="password" autoComplete="new-password" inputMode="numeric" maxLength={24} value={form.bankAccount} error={errors.bankAccount}
                onChange={e => setField('bankAccount', e.target.value)} />
              {(!editing?.id || bankConfirmNeeded(form, editing?.farmer?.bankAccount)) && (
                <TextInput label="Confirm bank account no." inputMode="numeric" maxLength={24} autoComplete="off" value={form.confirmBankAccount}
                  error={errors.confirmBankAccount} onPaste={e => e.preventDefault()} onChange={e => setField('confirmBankAccount', e.target.value)} />
              )}
              <TextInput label="IFSC code" maxLength={11} placeholder="e.g. SBIN0001234" value={form.ifscCode} error={errors.ifscCode}
                onChange={e => setField('ifscCode', e.target.value.toUpperCase())} />
            </SimpleGrid>
            <TextInput label="Bank name" maxLength={100} value={form.bankName} error={errors.bankName}
              onChange={e => setField('bankName', e.target.value)} />
            {errors.bankDetails && <Text size="sm" c="red" role="alert">{errors.bankDetails}</Text>}

            {save.isError && !save.error?.response?.data?.fields && <Alert color="red" variant="light">{errorMessage(save.error)}</Alert>}
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>Save farmer</Button>
            </Group>
          </Stack>
        )}
      </Drawer>
    </Stack>
  )
}
