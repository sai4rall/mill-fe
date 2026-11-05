import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFarmers, createFarmer, updateFarmer, deleteFarmer,
  sendFarmerOtp, verifyFarmerOtp, uploadFarmerPhoto, deleteFarmerPhoto,
} from '../../../shared/api/mill'
import Modal from '../../components/Modal'
import FarmerAvatar from '../../components/FarmerAvatar'
import { resizeImage, normalizePhone } from '../../../shared/utils/image'
import { validateFarmer, normalizeFarmer, serverFieldErrors } from '../../../shared/utils/farmerValidation'
import { Plus, Pencil, Trash2, User, Camera, BadgeCheck, AlertCircle } from 'lucide-react'

const EMPTY = { name: '', phone: '', address: '', bankAccount: '', bankName: '', ifscCode: '' }
const EMPTY_PHOTO = { file: null, preview: null, removed: false }
const EMPTY_OTP = { sentTo: '', code: '', token: '', verifiedPhone: '', cooldown: 0 }

const errorMessage = (e) => {
  const data = e?.response?.data
  if (data?.error) return data.error
  if (data && typeof data === 'object') return Object.values(data)[0]
  return e?.message || 'Something went wrong'
}

function FieldError({ name, errors }) {
  if (!errors[name]) return null
  return <p id={`${name}-error`} role="alert" className="text-xs text-red-600 mt-1">{errors[name]}</p>
}

export default function Farmers() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // null | { id?, farmer? }
  const [form, setForm] = useState(EMPTY)
  const [photo, setPhoto] = useState(EMPTY_PHOTO)
  const [photoError, setPhotoError] = useState('')
  const [otp, setOtp] = useState(EMPTY_OTP)
  const [otpBusy, setOtpBusy] = useState(null) // 'send' | 'verify' | null
  const [otpError, setOtpError] = useState('')
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const fileInput = useRef(null)

  const { data: farmers = [], isLoading } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers })

  // Resend countdown
  useEffect(() => {
    if (otp.cooldown <= 0) return
    const t = setTimeout(() => setOtp(o => ({ ...o, cooldown: o.cooldown - 1 })), 1000)
    return () => clearTimeout(t)
  }, [otp.cooldown])

  // Free the local preview URL when it is replaced or the modal closes
  useEffect(() => () => { if (photo.preview) URL.revokeObjectURL(photo.preview) }, [photo.preview])

  const saveMutation = useMutation({
    mutationFn: async ({ id, data, photo }) => {
      const saved = id ? await updateFarmer(id, data) : await createFarmer(data)
      // From here on the farmer exists: a retry after a failed photo upload must be an update, not a second create.
      setModal({ id: saved.id, farmer: saved })
      setOtp(EMPTY_OTP)
      try {
        if (photo.file) await uploadFarmerPhoto(saved.id, photo.file)
        else if (photo.removed && saved.photoUpdatedAt) await deleteFarmerPhoto(saved.id)
      } catch (e) {
        throw new Error(`Farmer saved, but the photo could not be updated: ${errorMessage(e)}`)
      }
    },
    onSuccess: () => closeModal(),
    onError: (e) => { if (e?.response?.data?.fields) setErrors(serverFieldErrors(e.response.data.fields)) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['farmers'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFarmer,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farmers'] }),
    onError: (e) => alert(errorMessage(e)),
  })

  const resetDialog = () => {
    setPhoto(EMPTY_PHOTO); setPhotoError('')
    setOtp(EMPTY_OTP); setOtpError(''); setOtpBusy(null)
    setErrors({}); setSubmitted(false)
    saveMutation.reset()
  }
  const openCreate = () => { resetDialog(); setForm(EMPTY); setModal({}) }
  const openEdit = (f) => {
    resetDialog()
    setForm({ name: f.name, phone: f.phone || '', address: f.address || '', bankAccount: f.bankAccount || '', bankName: f.bankName || '', ifscCode: f.ifscCode || '' })
    setModal({ id: f.id, farmer: f })
  }
  const closeModal = () => { setModal(null); resetDialog() }

  // ---- Phone / OTP ----
  const originalPhone = modal?.farmer?.phone || ''
  const phone = normalizePhone(form.phone)
  const phoneChanged = !modal?.id || (form.phone.trim() !== originalPhone && phone !== originalPhone)
  const phoneVerified = !!otp.token && otp.verifiedPhone === phone
  const otpPending = !!otp.sentTo && otp.sentTo === phone && !phoneVerified
  const canSave = !phoneChanged || phoneVerified

  // After the first submit attempt, re-validate as the user types so errors clear as soon as they are fixed.
  const setField = (key, value) => {
    const next = { ...form, [key]: value }
    setForm(next)
    if (key === 'phone') setOtpError('')
    if (submitted) setErrors(validateFarmer(next, { requirePhone: phoneChangedFor(next.phone) }))
  }
  const phoneChangedFor = (value) =>
    !modal?.id || (value.trim() !== originalPhone && normalizePhone(value) !== originalPhone)

  const handleSendOtp = async () => {
    setOtpError('')
    const phoneError = validateFarmer(form).phone
    setErrors(e => { const { phone: _, ...rest } = e; return phoneError ? { ...rest, phone: phoneError } : rest })
    if (phoneError) return
    setOtpBusy('send')
    try {
      await sendFarmerOtp(phone)
      setOtp({ ...EMPTY_OTP, sentTo: phone, cooldown: 30 })
    } catch (e) {
      setOtpError(errorMessage(e))
    } finally {
      setOtpBusy(null)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpError('')
    setOtpBusy('verify')
    try {
      const { verificationToken } = await verifyFarmerOtp(otp.sentTo, otp.code)
      setOtp(o => ({ ...o, token: verificationToken, verifiedPhone: o.sentTo }))
    } catch (e) {
      setOtpError(errorMessage(e))
    } finally {
      setOtpBusy(null)
    }
  }

  // ---- Photo ----
  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoError('')
    try {
      const resized = await resizeImage(file)
      setPhoto({ file: resized, preview: URL.createObjectURL(resized), removed: false })
    } catch (err) {
      setPhotoError(err.message)
    }
  }
  const removePhoto = () => setPhoto({ file: null, preview: null, removed: true })
  const hasExistingPhoto = !!modal?.farmer?.photoUpdatedAt && !photo.removed
  const showPhoto = !!photo.preview || hasExistingPhoto

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    const found = validateFarmer(form, { requirePhone: phoneChanged })
    setErrors(found)
    if (!canSave) setOtpError('Please verify the mobile number with OTP before saving')
    if (Object.keys(found).length || !canSave) return
    const data = { ...normalizeFarmer(form), phone: phoneChanged ? phone : form.phone }
    if (phoneChanged) data.phoneVerificationToken = otp.token
    saveMutation.mutate({ id: modal.id, data, photo })
  }

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'
  const errCls = '!border-red-400 focus:!ring-red-300'

  const renderField = ({ key, label, required, textarea, upper, ...props }) => {
    const Tag = textarea ? 'textarea' : 'input'
    return (
      <div key={key}>
        <label htmlFor={`farmer-${key}`} className="block text-sm font-medium text-slate-700 mb-1">{label}{required && ' *'}</label>
        <Tag id={`farmer-${key}`} value={form[key]} rows={textarea ? 2 : undefined}
          aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined}
          onChange={e => setField(key, upper ? e.target.value.toUpperCase() : e.target.value)}
          className={`${inputCls} ${errors[key] ? errCls : ''}`} {...props} />
        <FieldError name={key} errors={errors} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Farmers</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Farmer
        </button>
      </div>

      {isLoading ? <p className="text-slate-400 text-center py-20">Loading...</p> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {farmers.length === 0 ? (
            <div className="text-center py-16">
              <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">No farmers added yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Name', 'Mobile', 'Bank Account', 'Bank Name', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {farmers.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <FarmerAvatar farmer={f} />
                        <span className="font-medium text-slate-800 text-sm">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-sm">
                      {f.phone ? (
                        <span className="flex items-center gap-1.5">
                          {f.phone}
                          {f.phoneVerified
                            ? <BadgeCheck className="w-4 h-4 text-emerald-600" title="Verified via OTP" />
                            : <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Unverified</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-sm font-mono">{f.bankAccount || '—'}</td>
                    <td className="px-5 py-3 text-slate-500 text-sm">{f.bankName || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(f)} aria-label={`Edit ${f.name}`} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm('Delete this farmer?')) deleteMutation.mutate(f.id) }} aria-label={`Delete ${f.name}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Edit Farmer' : 'Add Farmer'} onClose={closeModal}>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Photo */}
            <div className="flex items-center gap-4">
              {photo.preview
                ? <img src={photo.preview} alt="Farmer" className="w-20 h-20 rounded-full object-cover border border-slate-200" />
                : hasExistingPhoto
                  ? <FarmerAvatar farmer={modal.farmer} size="w-20 h-20" />
                  : <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center"><Camera className="w-7 h-7 text-slate-400" /></div>}
              <div className="space-y-1">
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileInput.current?.click()}
                    className="border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50">
                    {showPhoto ? 'Change photo' : 'Upload photo'}
                  </button>
                  {showPhoto && (
                    <button type="button" onClick={removePhoto} className="text-sm text-red-600 hover:underline px-1">Remove</button>
                  )}
                </div>
                <p className="text-xs text-slate-400">JPG, PNG or WebP. Optional.</p>
                {photoError && <p className="text-xs text-red-600">{photoError}</p>}
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoPick} />
            </div>

            {renderField({ key: 'name', label: 'Full Name', required: true, maxLength: 100, autoComplete: 'off' })}

            {/* Mobile + OTP */}
            <div>
              <label htmlFor="farmer-phone" className="block text-sm font-medium text-slate-700 mb-1">Mobile Number *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">+91</span>
                  <input id="farmer-phone" value={form.phone} inputMode="tel" maxLength={15}
                    aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'phone-error' : undefined}
                    onChange={e => setField('phone', e.target.value)}
                    className={`${inputCls} pl-11 ${errors.phone ? errCls : ''}`} placeholder="10-digit mobile" />
                </div>
                {phoneChanged && !phoneVerified && (
                  <button type="button" onClick={handleSendOtp} disabled={otpBusy === 'send' || (otpPending && otp.cooldown > 0)}
                    className="shrink-0 bg-slate-800 text-white px-3 rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50">
                    {otpBusy === 'send' ? 'Sending...' : otpPending ? (otp.cooldown > 0 ? `Resend (${otp.cooldown}s)` : 'Resend OTP') : 'Send OTP'}
                  </button>
                )}
              </div>

              <FieldError name="phone" errors={errors} />
              {phoneVerified && (
                <p className="flex items-center gap-1 text-xs text-emerald-700 mt-1.5"><BadgeCheck className="w-4 h-4" /> Mobile number verified</p>
              )}
              {!phoneChanged && modal.farmer && (
                <p className="text-xs text-slate-400 mt-1.5">
                  {modal.farmer.phoneVerified ? 'Verified number. ' : ''}Changing the number will require OTP verification.
                </p>
              )}

              {otpPending && (
                <div className="flex gap-2 mt-2">
                  <input aria-label="OTP" value={otp.code} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter 6-digit OTP"
                    onChange={e => setOtp(o => ({ ...o, code: e.target.value.replace(/\D/g, '') }))}
                    className={`${inputCls} tracking-widest`} />
                  <button type="button" onClick={handleVerifyOtp} disabled={otp.code.length !== 6 || otpBusy === 'verify'}
                    className="shrink-0 bg-emerald-600 text-white px-4 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                    {otpBusy === 'verify' ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}
              {otpPending && <p className="text-xs text-slate-400 mt-1">OTP sent to +91 {otp.sentTo}. Valid for 5 minutes.</p>}
              {otpError && <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5"><AlertCircle className="w-3.5 h-3.5" />{otpError}</p>}
            </div>

            {renderField({ key: 'address', label: 'Address', textarea: true, maxLength: 500 })}

            <fieldset className="space-y-4">
              <legend className="text-xs text-slate-400 mb-2">Bank details (optional — fill all three or leave all empty)</legend>
              {renderField({ key: 'bankAccount', label: 'Bank Account No.', inputMode: 'numeric', maxLength: 24 })}
              {renderField({ key: 'bankName', label: 'Bank Name', maxLength: 100 })}
              {renderField({ key: 'ifscCode', label: 'IFSC Code', upper: true, maxLength: 11, placeholder: 'e.g. SBIN0001234' })}
              <FieldError name="bankDetails" errors={errors} />
            </fieldset>

            {saveMutation.isError && !saveMutation.error?.response?.data?.fields && (
              <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{errorMessage(saveMutation.error)}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saveMutation.isPending}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
