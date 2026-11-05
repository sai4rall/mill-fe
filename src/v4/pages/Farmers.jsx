import { useMemo, useRef, useState } from 'react'
import { Avatar, Button, SearchField } from '@heroui/react'
import { BadgeCheck, Camera, Landmark, MapPin, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFarmer, deleteFarmer, deleteFarmerPhoto, getFarmers, sendFarmerOtp, updateFarmer, uploadFarmerPhoto, verifyFarmerOtp,
} from '../../shared/api/mill'
import { normalizePhone, resizeImage } from '../../shared/utils/image'
import { normalizeFarmer, serverFieldErrors, validateFarmer } from '../../shared/utils/farmerValidation'
import { EmptyState, ErrorAlert, FarmerAvatar, Loading, PageHeader, Section, StatusChip } from '../kit/display'
import { TextAreaInput, TextInput } from '../kit/fields'
import { ConfirmDialog, Panel, SubmitButton } from '../kit/overlays'
import OtpInput from '../kit/OtpInput'
import { errorMessage, useCountdown } from '../lib/format'
import { notify } from '../lib/toast'

const EMPTY = { name: '', phone: '', address: '', bankAccount: '', bankName: '', ifscCode: '' }
const EMPTY_PHOTO = { file: null, preview: null, removed: false }
const EMPTY_OTP = { sentTo: '', code: '', token: '', verifiedPhone: '' }

function FarmerCard({ f, onEdit, onDelete }) {
  return (
    <motion.article layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }} whileHover={{ y: -3 }}
      className="group flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3">
        <FarmerAvatar farmer={f} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{f.name}</p>
          {f.phone ? (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <span className="v4-num">{f.phone}</span>
              {f.phoneVerified ? <BadgeCheck className="size-4 text-success" aria-label="Verified" /> : <StatusChip color="warning">Unverified</StatusChip>}
            </p>
          ) : <p className="text-sm text-muted">No mobile</p>}
        </div>
        <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <Button isIconOnly size="sm" variant="ghost" onPress={onEdit} aria-label={`Edit ${f.name}`}><Pencil className="size-4" /></Button>
          <Button isIconOnly size="sm" variant="ghost" className="text-danger" onPress={onDelete} aria-label={`Delete ${f.name}`}><Trash2 className="size-4" /></Button>
        </div>
      </div>
      <div className="grid gap-1.5 text-xs text-muted">
        {f.address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 shrink-0" /><span className="line-clamp-2">{f.address}</span></p>}
        {f.bankAccount
          ? <p className="flex items-center gap-2"><Landmark className="size-3.5 shrink-0" /><span className="font-mono">{f.bankAccount}</span> · {f.bankName}</p>
          : <p className="flex items-center gap-2"><Landmark className="size-3.5 shrink-0" />No bank details</p>}
      </div>
    </motion.article>
  )
}

export default function Farmers() {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // null | { id?, farmer? }
  const [deleting, setDeleting] = useState(null)
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

  // ---- phone / OTP (same rules as the other UIs) ----
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
    if (submitted) setErrors(validateFarmer(next, { requirePhone: phoneChangedFor(next.phone) }))
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

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoError('')
    try {
      const resized = await resizeImage(file)
      if (photo.preview) URL.revokeObjectURL(photo.preview)
      setPhoto({ file: resized, preview: URL.createObjectURL(resized), removed: false })
    } catch (err) { setPhotoError(err.message) }
  }
  const hasExistingPhoto = !!editing?.farmer?.photoUpdatedAt && !photo.removed

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
    onSuccess: (saved, { id }) => { close(); notify(`${id ? 'Farmer updated' : 'Farmer registered'}: ${saved.name}`) },
    onError: (e) => { if (e?.response?.data?.fields) setErrors(serverFieldErrors(e.response.data.fields)) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['farmers'] }),
  })
  const remove = useMutation({
    mutationFn: (id) => deleteFarmer(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farmers'] }); setDeleting(null); notify('Farmer deleted') },
    onError: (e) => { setDeleting(null); notify(errorMessage(e), 'error') },
  })

  const reset = () => {
    if (photo.preview) URL.revokeObjectURL(photo.preview)
    setPhoto(EMPTY_PHOTO); setPhotoError(''); setOtp(EMPTY_OTP); setOtpError(''); setOtpBusy(null)
    setErrors({}); setSubmitted(false); save.reset()
  }
  const openCreate = () => { reset(); setForm(EMPTY); setEditing({}) }
  const openEdit = (f) => {
    reset()
    setForm({ name: f.name, phone: f.phone || '', address: f.address || '', bankAccount: f.bankAccount || '', bankName: f.bankName || '', ifscCode: f.ifscCode || '' })
    setEditing({ id: f.id, farmer: f })
  }
  const close = () => { setEditing(null); reset() }

  const submit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    const found = validateFarmer(form, { requirePhone: phoneChanged })
    setErrors(found)
    if (!canSave) setOtpError('Please verify the mobile number with OTP before saving')
    if (Object.keys(found).length || !canSave) return
    const data = { ...normalizeFarmer(form), phone: phoneChanged ? phone : form.phone }
    if (phoneChanged) data.phoneVerificationToken = otp.token
    save.mutate({ id: editing.id, data, photo })
  }

  return (
    <>
      <PageHeader title="Farmers" description={`${farmers.length} registered · verified mobiles are needed to release payments`}
        actions={<Button onPress={openCreate}><Plus className="size-4" />Register farmer</Button>} />

      {farmers.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm">
          <SearchField aria-label="Search farmers" value={query} onChange={setQuery}>
            <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="Search by name or mobile" /><SearchField.ClearButton /></SearchField.Group>
          </SearchField>
        </motion.div>
      )}

      {isLoading ? <Loading /> : farmers.length === 0 ? (
        <EmptyState icon={Users} title="No farmers yet" action={<Button className="mt-2" onPress={openCreate}>Register the first farmer</Button>}>
          Register farmers with a verified mobile number to record purchases and payments.
        </EmptyState>
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {shown.map(f => <FarmerCard key={f.id} f={f} onEdit={() => openEdit(f)} onDelete={() => setDeleting(f)} />)}
          </AnimatePresence>
          {shown.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted">No farmers match “{query}”.</p>}
        </motion.div>
      )}

      <Panel open={!!editing} onClose={close} onSubmit={submit} title={editing?.id ? 'Edit farmer' : 'Register farmer'}
        description="A verified mobile number is needed to release payments."
        footer={<><Button variant="tertiary" onPress={close}>Cancel</Button><SubmitButton pending={save.isPending}>Save farmer</SubmitButton></>}>
        {editing && (
          <>
            <div className="flex items-center gap-4">
              {photo.preview
                ? <Avatar className="size-20"><Avatar.Image src={photo.preview} alt="Farmer photo" className="object-cover" /><Avatar.Fallback>…</Avatar.Fallback></Avatar>
                : hasExistingPhoto ? <FarmerAvatar farmer={editing.farmer} className="size-20" />
                  : <div className="flex size-20 items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground"><Camera className="size-7" /></div>}
              <div className="grid gap-1.5">
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onPress={() => fileRef.current?.click()}><Camera className="size-4" />{photo.preview || hasExistingPhoto ? 'Change photo' : 'Upload photo'}</Button>
                  {(photo.preview || hasExistingPhoto) && <Button size="sm" variant="ghost" className="text-danger" onPress={() => setPhoto({ file: null, preview: null, removed: true })}>Remove</Button>}
                </div>
                <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} aria-label="Farmer photo file" />
                <p className="text-xs text-muted">JPG, PNG or WebP · optional</p>
                {photoError && <p className="text-xs text-danger">{photoError}</p>}
              </div>
            </div>

            <Section>Identity</Section>
            <TextInput label="Full name" required maxLength={100} value={form.name} onChange={v => setField('name', v)} error={errors.name} />

            <div className="grid gap-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <TextInput label="Mobile number" required prefix="+91" inputMode="tel" maxLength={15} placeholder="10-digit mobile"
                    value={form.phone} onChange={v => setField('phone', v)} error={errors.phone}
                    suffix={phoneVerified ? <BadgeCheck className="size-4 text-success" aria-label="Mobile verified" /> : null} />
                </div>
                {phoneChanged && !phoneVerified && !otpPending && (
                  <Button variant="secondary" onPress={sendOtp} isPending={otpBusy === 'send'} className={errors.phone ? 'mb-6' : ''}><Phone className="size-4" />Send OTP</Button>
                )}
              </div>
              <AnimatePresence>
                {otpPending && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-2xl border border-border bg-surface-secondary/50 p-3">
                      <OtpInput sentTo={otp.sentTo} value={otp.code} cooldown={cooldown} resending={otpBusy === 'send'} onResend={sendOtp}
                        onChange={(code) => { setOtp(o => ({ ...o, code })); if (code.length === 6) verifyOtp(code) }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {phoneVerified && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-success">Mobile number verified</motion.p>}
              {!phoneChanged && editing.farmer && <p className="text-xs text-muted">{editing.farmer.phoneVerified ? 'Verified number. ' : ''}Changing the number will require OTP verification.</p>}
              {otpError && <p className="text-xs text-danger" role="alert">{otpError}</p>}
            </div>

            <TextAreaInput label="Address" maxLength={500} value={form.address} onChange={v => setField('address', v)} error={errors.address} />

            <Section>Bank details · all three or none</Section>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Bank account no." inputMode="numeric" maxLength={24} value={form.bankAccount} onChange={v => setField('bankAccount', v)} error={errors.bankAccount} />
              <TextInput label="IFSC code" maxLength={11} placeholder="e.g. SBIN0001234" value={form.ifscCode} onChange={v => setField('ifscCode', v.toUpperCase())} error={errors.ifscCode} />
            </div>
            <TextInput label="Bank name" maxLength={100} value={form.bankName} onChange={v => setField('bankName', v)} error={errors.bankName} />
            {errors.bankDetails && <ErrorAlert>{errors.bankDetails}</ErrorAlert>}
            {save.isError && !save.error?.response?.data?.fields && <ErrorAlert error={save.error} />}
          </>
        )}
      </Panel>

      <ConfirmDialog open={!!deleting} danger title={`Delete ${deleting?.name}?`} message="This removes the farmer. Farmers with purchases cannot be deleted."
        confirmLabel="Delete" loading={remove.isPending} onConfirm={() => remove.mutate(deleting.id)} onClose={() => setDeleting(null)} />
    </>
  )
}
