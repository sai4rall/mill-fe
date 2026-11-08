import { useMemo, useRef, useState } from 'react'
import { Avatar, Button, SearchField } from '@heroui/react'
import { BadgeCheck, Camera, LayoutGrid, Landmark, List, MapPin, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFarmer, deleteFarmer, deleteFarmerPhoto, getFarmers, getPurchases, sendFarmerOtp, updateFarmer, uploadFarmerPhoto, verifyFarmerOtp,
} from '../../shared/api/mill'
import { normalizePhone, resizeImage } from '../../shared/utils/image'
import { normalizeFarmer, serverFieldErrors, validateFarmer, bankConfirmNeeded, bankAccountInput } from '../../shared/utils/farmerValidation'
import { phoneInput } from '../../shared/utils/phone'
import { EmptyState, ErrorAlert, FarmerAvatar, Loading, PageHeader, Section, StatusChip } from '../kit/display'
import { TextAreaInput, TextInput } from '../kit/fields'
import { ConfirmDialog, Panel, SubmitButton } from '../kit/overlays'
import OtpInput from '../kit/OtpInput'
import DataTable from '../kit/DataTable'
import { cx, errorMessage, useCountdown } from '../lib/format'
import { day, money, num } from '../lib/numbers'
import { usePref } from '../lib/prefs'
import { useT } from '../i18n'
import { PARTY_TYPES } from '../../shared/utils/partyTypes'
import { Pager, usePaged } from '../kit/Pager'
import { notify } from '../lib/toast'

const EMPTY = { type: 'FARMER', name: '', phone: '', address: '', bankAccount: '', bankName: '', ifscCode: '', confirmBankAccount: '' }
const EMPTY_PHOTO = { file: null, preview: null, removed: false }
const EMPTY_OTP = { sentTo: '', code: '', token: '', verifiedPhone: '' }

function Actions({ f, onEdit, onDelete }) {
  return (
    <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
      <Button isIconOnly size="sm" variant="ghost" onPress={onEdit} aria-label={`Edit ${f.name}`}><Pencil className="size-4" /></Button>
      <Button isIconOnly size="sm" variant="ghost" className="text-danger" onPress={onDelete} aria-label={`Delete ${f.name}`}><Trash2 className="size-4" /></Button>
    </div>
  )
}

function Mobile({ f }) {
  const { t } = useT()
  if (!f.phone) return <span className="text-muted">No mobile</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="v4-num">{f.phone}</span>
      {f.phoneVerified ? <BadgeCheck className="size-4 text-ok" aria-label={t('farmers.verified')} /> : <StatusChip color="warning">{t('farmers.unverified')}</StatusChip>}
    </span>
  )
}

const TYPE_TONE = { FARMER: 'bg-ok-soft text-ok', AGENT: 'bg-rice-soft text-rice', SUPPLIER: 'bg-paddy-soft text-paddy' }

/** Farmer / Agent / Supplier tag. */
function TypeTag({ type }) {
  const { t } = useT()
  const k = type || 'FARMER'
  return <span className={cx('inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', TYPE_TONE[k])}>{t(`farmers.${k}`)}</span>
}

function FarmerCard({ f, stats, onEdit, onDelete }) {
  const { t } = useT()
  return (
    <article className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-e1">
      <div className="flex items-start gap-3">
        <FarmerAvatar farmer={f} className="size-11" />
        <div className="min-w-0 flex-1"><p className="flex items-center gap-2"><span className="truncate font-semibold">{f.name}</span><TypeTag type={f.type} /></p><p className="text-sm text-muted"><Mobile f={f} /></p></div>
        <Actions f={f} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div><dt className="text-xs text-muted">{t('farmers.outstanding')}</dt><dd className={cx('v4-num font-semibold', stats?.due > 0 ? 'text-risk' : '')}>{money(stats?.due || 0)}</dd></div>
        <div><dt className="text-xs text-muted">{t('farmers.lastPurchase')}</dt><dd>{stats?.last ? day(stats.last) : '—'}</dd></div>
      </dl>
      <div className="grid gap-1.5 text-xs text-muted">
        {f.address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 shrink-0" /><span className="line-clamp-2">{f.address}</span></p>}
        <p className="flex items-center gap-2"><Landmark className="size-3.5 shrink-0" />{f.bankAccount ? <><span className="font-mono">{f.bankAccount}</span> · {f.bankName}</> : 'No bank details'}</p>
      </div>
    </article>
  )
}

const PAGE_SIZE = 20
const CARDS_PER_PAGE = 24

/** Card view, a page at a time (the list view pages inside DataTable). */
function FarmerCards({ rows, stats, onEdit, onDelete, empty }) {
  const paged = usePaged(rows, CARDS_PER_PAGE)
  return (
    <div className="grid gap-2">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {paged.rows.map(f => <FarmerCard key={f.id} f={f} stats={stats.get(f.id)} onEdit={() => onEdit(f)} onDelete={() => onDelete(f)} />)}
        {rows.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted">{empty}</p>}
      </div>
      <Pager {...paged} className="rounded-card border border-border bg-surface" />
    </div>
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

  const { t } = useT()
  const [layout, setLayout] = usePref('farmers.layout', 'list')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const { data: farmers = [], isLoading } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })
  // Outstanding dues and last purchase per farmer, so the list answers "who do we owe" without opening anyone.
  const stats = useMemo(() => {
    const m = new Map()
    for (const p of purchases) {
      const s = m.get(p.farmerId) || { due: 0, last: null, count: 0 }
      s.due += Number(p.amountDue || 0); s.count += 1
      if (!s.last || p.purchaseDate > s.last) s.last = p.purchaseDate
      m.set(p.farmerId, s)
    }
    return m
  }, [purchases])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return farmers.filter(f => (typeFilter === 'ALL' || (f.type || 'FARMER') === typeFilter)
      && (!q || f.name.toLowerCase().includes(q) || (f.phone || '').includes(q) || (f.address || '').toLowerCase().includes(q)))
  }, [farmers, query, typeFilter])
  const columns = [
    { key: 'name', header: 'Farmer', sortValue: (f) => f.name.toLowerCase(), cell: (f) => (
      <span className="flex items-center gap-3"><FarmerAvatar farmer={f} className="size-8" /><span className="min-w-0"><span className="block font-semibold">{f.name}</span>{f.address && <span className="block max-w-64 truncate text-xs text-muted">{f.address}</span>}</span></span>
    ) },
    { key: 'type', header: t('farmers.type'), cell: (f) => <TypeTag type={f.type} />, sortValue: (f) => f.type || 'FARMER' },
    { key: 'phone', header: 'Mobile', cell: (f) => <Mobile f={f} /> },
    { key: 'count', header: 'Purchases', align: 'right', cell: (f) => <span className="v4-num">{num(stats.get(f.id)?.count || 0, 0)}</span>, sortValue: (f) => stats.get(f.id)?.count || 0 },
    { key: 'last', header: t('farmers.lastPurchase'), cell: (f) => (stats.get(f.id)?.last ? day(stats.get(f.id).last) : '—'), sortValue: (f) => stats.get(f.id)?.last || '' },
    { key: 'due', header: t('farmers.outstanding'), align: 'right', sortValue: (f) => stats.get(f.id)?.due || 0,
      cell: (f) => { const d = stats.get(f.id)?.due || 0; return <span className={cx('v4-num', d > 0 ? 'font-semibold text-risk' : 'text-muted')}>{money(d)}</span> } },
    { key: 'actions', header: '', align: 'right', cell: (f) => <Actions f={f} onEdit={() => openEdit(f)} onDelete={() => setDeleting(f)} /> },
  ]
  const phoneRow = (f) => {
    const st = stats.get(f.id)
    return (
      <div className="flex items-center gap-3">
        <FarmerAvatar farmer={f} className="size-9" />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <div className="flex justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><span className="truncate font-semibold">{f.name}</span><TypeTag type={f.type} /></span>{st?.due > 0 && <span className="v4-num shrink-0 text-sm font-semibold text-risk">{money(st.due)}</span>}</div>
          <div className="flex justify-between gap-2 text-xs text-muted"><Mobile f={f} /><span>{st?.last ? day(st.last) : ''}</span></div>
        </div>
        <Actions f={f} onEdit={() => openEdit(f)} onDelete={() => setDeleting(f)} />
      </div>
    )
  }

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
    setForm({ type: f.type || 'FARMER', name: f.name, phone: f.phone || '', address: f.address || '', bankAccount: f.bankAccount || '', bankName: f.bankName || '', ifscCode: f.ifscCode || '', confirmBankAccount: '' })
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
    <>
      <PageHeader title={t('farmers.title')} description={`${farmers.length} registered · verified mobiles are needed to release payments`}
        actions={<Button onPress={openCreate}><Plus className="size-4" />{t('farmers.register')}</Button>} />

      {farmers.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <SearchField aria-label="Search farmers" value={query} onChange={setQuery} className="w-full sm:w-80">
            <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder={t('farmers.search')} /><SearchField.ClearButton /></SearchField.Group>
          </SearchField>
          <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-1.5">
            {[{ value: 'ALL', key: 'all' }, ...PARTY_TYPES.map(pt => ({ value: pt.value, key: `${pt.value}S` }))].map(o => {
              const count = o.value === 'ALL' ? farmers.length : farmers.filter(f => (f.type || 'FARMER') === o.value).length
              return (
                <button key={o.value} type="button" aria-pressed={typeFilter === o.value} onClick={() => setTypeFilter(o.value)}
                  className={cx('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium', typeFilter === o.value ? 'border-accent bg-accent-soft text-accent-soft-foreground' : 'border-border bg-surface text-muted hover:text-foreground')}>
                  {t(`farmers.${o.key}`)}<span className="v4-num text-xs opacity-70">{count}</span>
                </button>
              )
            })}
          </div>
          <div role="radiogroup" aria-label="Layout" className="ml-auto flex gap-1 rounded-field border border-border bg-surface p-0.5">
            {[['list', List, 'List'], ['cards', LayoutGrid, 'Cards']].map(([id, Icon, label]) => (
              <button key={id} type="button" role="radio" aria-checked={layout === id} aria-label={label} onClick={() => setLayout(id)}
                className={cx('flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-sm', layout === id ? 'bg-accent-soft text-accent-soft-foreground' : 'text-muted')}><Icon className="size-4" /><span className="hidden sm:inline">{label}</span></button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? <Loading /> : farmers.length === 0 ? (
        <EmptyState icon={Users} title="No farmers, agents or suppliers yet" action={<Button className="mt-2" onPress={openCreate}>Register the first farmer</Button>}>
          Register farmers, agents and suppliers with a verified mobile number to record purchases and payments.
        </EmptyState>
      ) : layout === 'cards' ? (
        <FarmerCards key={`${typeFilter}|${query}`} rows={shown} stats={stats} onEdit={openEdit} onDelete={setDeleting}
          empty={query ? `No one matches “${query}”.` : 'None registered as this type yet.'} />
      ) : (
        <DataTable key={`${typeFilter}|${query}`} label="Farmers" rows={shown} columns={columns} phoneRow={phoneRow} minWidth={820} pageSize={PAGE_SIZE}
          empty={query ? `No one matches “${query}”.` : 'None registered as this type yet.'} />
      )}

      <Panel open={!!editing} onClose={close} onSubmit={submit} title={editing?.id ? `Edit ${t(`farmers.${form.type || 'FARMER'}`).toLowerCase()}` : t('farmers.registration')}
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
            <div className="grid gap-1.5">
              <p id="party-type-label" className="text-sm font-medium">{t('farmers.type')} <span className="text-danger">*</span></p>
              <div role="radiogroup" aria-labelledby="party-type-label" className="grid grid-cols-3 gap-1 rounded-field border border-border bg-surface-secondary p-1">
                {PARTY_TYPES.map(pt => (
                  <button key={pt.value} type="button" role="radio" aria-checked={form.type === pt.value} onClick={() => setField('type', pt.value)}
                    className={cx('rounded-[5px] px-3 py-1.5 text-sm font-medium', form.type === pt.value ? 'bg-surface text-foreground shadow-e1' : 'text-muted hover:text-foreground')}>
                    {t(`farmers.${pt.value}`)}
                  </button>
                ))}
              </div>
            </div>
            <TextInput label="Full name" required maxLength={100} value={form.name} onChange={v => setField('name', v)} error={errors.name} />

            <div className="grid gap-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <TextInput label="Mobile number" required prefix="+91" inputMode="numeric" placeholder="10-digit mobile"
                    value={form.phone} onChange={v => setField('phone', phoneInput(v))} error={errors.phone}
                    suffix={phoneVerified ? <BadgeCheck className="size-4 text-ok" aria-label="Mobile verified" /> : null} />
                </div>
                {phoneChanged && !phoneVerified && !otpPending && (
                  <Button variant="secondary" onPress={sendOtp} isPending={otpBusy === 'send'} className={errors.phone ? 'mb-6' : ''}><Phone className="size-4" />Send OTP</Button>
                )}
              </div>
              <AnimatePresence>
                {otpPending && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-card border border-border bg-surface-secondary p-3">
                      <OtpInput sentTo={otp.sentTo} value={otp.code} cooldown={cooldown} resending={otpBusy === 'send'} onResend={sendOtp}
                        onChange={(code) => { setOtp(o => ({ ...o, code })); if (code.length === 6) verifyOtp(code) }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {phoneVerified && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-ok">Mobile number verified</motion.p>}
              {!phoneChanged && editing.farmer && <p className="text-xs text-muted">{editing.farmer.phoneVerified ? 'Verified number. ' : ''}Changing the number will require OTP verification.</p>}
              {otpError && <p className="text-xs text-danger" role="alert">{otpError}</p>}
            </div>

            <TextAreaInput label="Address" maxLength={500} value={form.address} onChange={v => setField('address', v)} error={errors.address} />

            <Section>Bank details · all three or none</Section>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Bank account no." type="password" autoComplete="new-password" inputMode="numeric" value={form.bankAccount} onChange={v => setField('bankAccount', bankAccountInput(v))} error={errors.bankAccount} />
              {(!editing?.id || bankConfirmNeeded(form, editing?.farmer?.bankAccount)) && (
                <TextInput label="Confirm bank account no." inputMode="numeric" autoComplete="off" value={form.confirmBankAccount}
                  onPaste={e => e.preventDefault()} onChange={v => setField('confirmBankAccount', bankAccountInput(v))} error={errors.confirmBankAccount} />
              )}
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
