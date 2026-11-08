import { useMemo, useRef, useState } from 'react'
import { BadgeCheck, Camera, Loader2, Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from '@/v3/ui/avatar'
import { Button } from '@/v3/ui/button'
import { Input } from '@/v3/ui/input'
import { Separator } from '@/v3/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/v3/ui/sheet'
import { Textarea } from '@/v3/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/v3/ui/tooltip'
import {
  createFarmer, deleteFarmer, deleteFarmerPhoto, getFarmers, sendFarmerOtp, updateFarmer, uploadFarmerPhoto, verifyFarmerOtp,
} from '../../shared/api/mill'
import { normalizePhone, resizeImage } from '../../shared/utils/image'
import { normalizeFarmer, serverFieldErrors, validateFarmer, bankConfirmNeeded } from '../../shared/utils/farmerValidation'
import { phoneInput } from '../../shared/utils/phone'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import ErrorAlert from '../components/ErrorAlert'
import FarmerAvatar from '../components/FarmerAvatar'
import Field from '../components/Field'
import OtpField from '../components/OtpField'
import ConfirmDialog from '../components/ConfirmDialog'
import Loading from '../components/Loading'
import { Tone } from '../components/StatusBadge'
import { errorMessage, useCountdown } from '../lib/format'
import { notify } from '../lib/toast'

const EMPTY = { name: '', phone: '', address: '', bankAccount: '', bankName: '', ifscCode: '', confirmBankAccount: '' }
const EMPTY_PHOTO = { file: null, preview: null, removed: false }
const EMPTY_OTP = { sentTo: '', code: '', token: '', verifiedPhone: '' }

function Section({ children }) {
  return <div className="flex items-center gap-3 pt-2"><span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</span><Separator className="flex-1" /></div>
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

  const input = (key, label, props = {}) => (
    <Field id={`f-${key}`} label={label} required={props.required} error={errors[key]} hint={props.hint}>
      <Input id={`f-${key}`} value={form[key]} aria-invalid={!!errors[key] || undefined} onChange={e => setField(key, props.upper ? e.target.value.toUpperCase() : e.target.value)}
        maxLength={props.maxLength} inputMode={props.inputMode} placeholder={props.placeholder}
        onPaste={props.noPaste ? (e) => e.preventDefault() : undefined} autoComplete={props.noPaste ? 'off' : undefined} />
    </Field>
  )

  const columns = [
    {
      key: 'name', header: 'Farmer',
      cell: (f) => (
        <div className="flex min-w-0 items-center gap-3">
          <FarmerAvatar farmer={f} />
          <div className="min-w-0"><p className="truncate font-medium">{f.name}</p>{f.address && <p className="max-w-xs truncate text-xs text-muted-foreground">{f.address}</p>}</div>
        </div>
      ),
    },
    {
      key: 'phone', header: 'Mobile',
      cell: (f) => (f.phone ? (
        <div className="flex items-center gap-1.5">
          <span className="v3-num">{f.phone}</span>
          {f.phoneVerified
            ? <Tooltip><TooltipTrigger asChild><BadgeCheck className="size-4 text-emerald-600" aria-label="Verified" /></TooltipTrigger><TooltipContent>Verified via OTP</TooltipContent></Tooltip>
            : <Tone tone="amber">Unverified</Tone>}
        </div>
      ) : '—'),
    },
    {
      key: 'bank', header: 'Bank',
      cell: (f) => (f.bankAccount ? <div><p className="font-mono text-sm">{f.bankAccount}</p><p className="text-xs text-muted-foreground">{f.bankName} · {f.ifscCode}</p></div> : <span className="text-muted-foreground">—</span>),
    },
    {
      key: 'actions', header: '', align: 'right',
      cell: (f) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(f)} aria-label={`Edit ${f.name}`}><Pencil /></Button>
          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setDeleting(f)} aria-label={`Delete ${f.name}`}><Trash2 /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="grid gap-6">
      <PageHeader title="Farmers" description="Registered farmers with verified mobile numbers"
        actions={<Button onClick={openCreate}><Plus />Register farmer</Button>} />

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or mobile" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search farmers" />
      </div>

      {isLoading ? <Loading /> : farmers.length === 0 ? (
        <EmptyState icon={Users} title="No farmers yet" action={<Button className="mt-2" onClick={openCreate}>Register the first farmer</Button>}>
          Register farmers with a verified mobile number to record purchases and payments.
        </EmptyState>
      ) : <DataTable rows={shown} columns={columns} minWidth={720} empty={`No farmers match “${query}”.`} />}

      <Sheet open={!!editing} onOpenChange={(o) => !o && close()}>
        <SheetContent className="w-full gap-0 sm:max-w-lg">
          {editing && (
            <form onSubmit={submit} noValidate className="flex h-full flex-col">
              <SheetHeader className="border-b">
                <SheetTitle>{editing.id ? 'Edit farmer' : 'Register farmer'}</SheetTitle>
                <SheetDescription>A verified mobile number is needed to release payments.</SheetDescription>
              </SheetHeader>
              <div className="grid flex-1 content-start gap-4 overflow-y-auto p-4">
                <div className="flex items-center gap-4">
                  {photo.preview
                    ? <Avatar className="size-20"><AvatarImage src={photo.preview} alt="Farmer photo" className="object-cover" /></Avatar>
                    : hasExistingPhoto ? <FarmerAvatar farmer={editing.farmer} className="size-20" />
                      : <Avatar className="size-20"><AvatarFallback className="bg-accent text-accent-foreground"><Camera className="size-7" /></AvatarFallback></Avatar>}
                  <div className="grid gap-1.5">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Camera />{photo.preview || hasExistingPhoto ? 'Change photo' : 'Upload photo'}</Button>
                      {(photo.preview || hasExistingPhoto) && <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPhoto({ file: null, preview: null, removed: true })}>Remove</Button>}
                    </div>
                    <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} aria-label="Farmer photo file" />
                    <p className="text-xs text-muted-foreground">JPG, PNG or WebP · optional</p>
                    {photoError && <p className="text-xs text-destructive">{photoError}</p>}
                  </div>
                </div>

                <Section>Identity</Section>
                {input('name', 'Full name', { required: true, maxLength: 100 })}

                <div className="grid gap-2">
                  <Field id="f-phone" label="Mobile number" required error={errors.phone}>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                        <Input id="f-phone" className="pr-9 pl-11" inputMode="numeric" placeholder="10-digit mobile" value={form.phone}
                          aria-invalid={!!errors.phone || undefined} onChange={e => setField('phone', phoneInput(e.target.value))} />
                        {phoneVerified && <BadgeCheck className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-600" aria-label="Mobile verified" />}
                      </div>
                      {phoneChanged && !phoneVerified && !otpPending && (
                        <Button type="button" variant="outline" onClick={sendOtp} disabled={otpBusy === 'send'}>
                          {otpBusy === 'send' ? <Loader2 className="animate-spin" /> : <Phone />}Send OTP
                        </Button>
                      )}
                    </div>
                  </Field>
                  {otpPending && (
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <OtpField sentTo={otp.sentTo} value={otp.code} cooldown={cooldown} resending={otpBusy === 'send'} onResend={sendOtp}
                        onChange={(code) => { setOtp(o => ({ ...o, code })); if (code.length === 6) verifyOtp(code) }} />
                    </div>
                  )}
                  {phoneVerified && <p className="text-xs font-medium text-emerald-700">Mobile number verified</p>}
                  {!phoneChanged && editing.farmer && (
                    <p className="text-xs text-muted-foreground">{editing.farmer.phoneVerified ? 'Verified number. ' : ''}Changing the number will require OTP verification.</p>
                  )}
                  {otpError && <p className="text-xs text-destructive" role="alert">{otpError}</p>}
                </div>

                <Field id="f-address" label="Address" error={errors.address}>
                  <Textarea id="f-address" rows={2} maxLength={500} value={form.address} onChange={e => setField('address', e.target.value)} />
                </Field>

                <Section>Bank details · all three or none</Section>
                <div className="grid gap-4 sm:grid-cols-2">
                  {input('bankAccount', 'Bank account no.', { inputMode: 'numeric', maxLength: 24 })}
                  {(!editing?.id || bankConfirmNeeded(form, editing?.farmer?.bankAccount)) && input('confirmBankAccount', 'Confirm bank account no.', { inputMode: 'numeric', maxLength: 24, noPaste: true })}
                  {input('ifscCode', 'IFSC code', { maxLength: 11, placeholder: 'e.g. SBIN0001234', upper: true })}
                </div>
                {input('bankName', 'Bank name', { maxLength: 100 })}
                {errors.bankDetails && <ErrorAlert>{errors.bankDetails}</ErrorAlert>}
                {save.isError && !save.error?.response?.data?.fields && <ErrorAlert error={save.error} />}
              </div>
              <SheetFooter className="flex-row justify-end border-t">
                <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />}Save farmer</Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog open={!!deleting} danger title={`Delete ${deleting?.name}?`} message="This removes the farmer. Farmers with purchases cannot be deleted."
        confirmLabel="Delete" loading={remove.isPending} onConfirm={() => remove.mutate(deleting.id)} onClose={() => setDeleting(null)} />
    </div>
  )
}
