import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPurchase, getFarmers, getPurchases } from '../../shared/api/mill'
import { getMoistureTable } from '../../shared/api/moisture'
import { lookupDeduction, priceBreakdown } from '../../shared/utils/moisture'
import { isFutureDate, todayISO } from '../../shared/utils/dates'
import { useFeatures } from '../../shared/features/useFeatures'
import { useAuth } from '../../shared/context/AuthContext'
import { ErrorAlert, Figure } from '../kit/display'
import { ComboInput, DateInput, enterToNext, TextAreaInput, TextInput } from '../kit/fields'
import { Panel, SubmitButton } from '../kit/overlays'
import { useT } from '../i18n'
import { enqueuePurchase, isNetworkError } from '../lib/outbox'
import { notify } from '../lib/toast'

const Ctx = createContext({ open: () => {} })
export const useRecordPurchase = () => useContext(Ctx)

const blank = (keep = {}) => ({ farmerId: '', purchaseDate: keep.purchaseDate || todayISO(), truckNumber: '', weightQuintals: '',
  pricePerQuintal: keep.pricePerQuintal || '', moisturePct: '', notes: '' })

/** Live receipt: what the operator reads out to the farmer. Same numbers as the saved purchase. */
function LiveReceipt({ moistureOn, gross, deduction, net, deductionPct, noRanges }) {
  const { t } = useT()
  return (
    <div className="grid gap-2 rounded-card border border-border bg-canvas p-4 text-sm" data-testid="price-breakdown">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t('record.receipt')}</p>
      <div className="flex justify-between"><span>{t('record.gross')}</span><Figure value={gross} format="money" /></div>
      {moistureOn && <div className="flex justify-between text-warn"><span>{t('record.deduction', { pct: deductionPct })}</span><span>−<Figure value={deduction} format="money" /></span></div>}
      <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2 font-bold">
        <span>{t('record.net')}</span><Figure value={net} format="money" className="text-xl text-money" />
      </div>
      {moistureOn && noRanges && <p className="text-xs text-muted">{t('record.noRanges')}</p>}
    </div>
  )
}

function RecordPurchaseSheet({ open, onClose }) {
  const { t } = useT()
  const qc = useQueryClient()
  const moistureOn = useFeatures().flag('moisture_deduction').enabled
  const [form, setForm] = useState(blank)
  const [errs, setErrs] = useState({})
  const [again, setAgain] = useState(false)
  const formRef = useRef(null)
  const { data: farmers = [] } = useQuery({ queryKey: ['farmers'], queryFn: getFarmers, enabled: open })
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases, enabled: open })
  const { data: moisture } = useQuery({ queryKey: ['moisture'], queryFn: getMoistureTable, enabled: open && moistureOn })

  useEffect(() => { if (open) { setForm(blank()); setErrs({}) } }, [open]) // eslint-disable-line react-hooks/set-state-in-effect

  // Recent farmers first (design review: data entry), then everyone else alphabetically.
  const options = useMemo(() => {
    const recent = []
    for (const p of [...purchases].sort((a, b) => (a.purchaseDate < b.purchaseDate ? 1 : -1))) {
      if (!recent.includes(p.farmerId)) recent.push(p.farmerId)
      if (recent.length === 5) break
    }
    const byId = new Map(farmers.map(f => [f.id, f]))
    const first = recent.map(id => byId.get(id)).filter(Boolean)
    const rest = farmers.filter(f => !recent.includes(f.id)).sort((a, b) => a.name.localeCompare(b.name))
    return [...first, ...rest].map(f => ({ value: String(f.id), label: f.name }))
  }, [farmers, purchases])

  const deductionPct = moistureOn ? lookupDeduction(moisture?.ranges, form.moisturePct) : 0
  const { gross, deduction, net } = priceBreakdown(form.weightQuintals, form.pricePerQuintal, deductionPct)
  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: undefined })) }

  const done = (keepOpen) => {
    if (keepOpen) {
      setForm(f => blank({ purchaseDate: f.purchaseDate, pricePerQuintal: f.pricePerQuintal }))
      setTimeout(() => formRef.current?.querySelector('input')?.focus(), 50)
    } else onClose()
  }

  const create = useMutation({
    mutationFn: ({ __again, ...payload }) => createPurchase(payload),
    onSuccess: (_r, payload) => {
      qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['stock'] })
      notify(t('record.saved')); done(payload.__again)
    },
    onError: (err, payload) => {
      if (isNetworkError(err)) {
        const { __again, ...clean } = payload
        enqueuePurchase(clean); notify(t('record.queued'), 'error'); done(__again)
      }
    },
  })

  const submit = (e) => {
    e.preventDefault()
    // Which button submitted: "Save and add another" keeps the sheet open (Enter on the last field = plain Save).
    const addAnother = e.nativeEvent?.submitter?.dataset?.intent === 'again'
    setAgain(addAnother)
    const found = {}
    if (!form.farmerId) found.farmerId = t('record.errFarmer')
    if (!form.purchaseDate) found.purchaseDate = t('record.errDate')
    else if (isFutureDate(form.purchaseDate)) found.purchaseDate = 'Purchase date cannot be in the future'
    if (!(Number(form.weightQuintals) > 0)) found.weightQuintals = t('record.errWeight')
    if (!(Number(form.pricePerQuintal) > 0)) found.pricePerQuintal = t('record.errRate')
    if (moistureOn && form.moisturePct === '') found.moisturePct = t('record.errMoisture')
    setErrs(found)
    if (Object.keys(found).length) return
    create.mutate({ ...form, farmerId: Number(form.farmerId), weightQuintals: parseFloat(form.weightQuintals),
      pricePerQuintal: parseFloat(form.pricePerQuintal), moisturePct: moistureOn ? parseFloat(form.moisturePct) : null, __again: addAnother })
  }

  const receipt = <LiveReceipt moistureOn={moistureOn} gross={gross} deduction={deduction} net={net} deductionPct={deductionPct} noRanges={moisture?.source === 'NONE'} />
  const apiError = create.isError && !isNetworkError(create.error) ? create.error : null

  return (
    <Panel open={open} onClose={onClose} onSubmit={submit} title={t('record.title')} description={t('record.subtitle')} width="sm:w-[52rem]"
      footer={(
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-sm text-muted md:hidden">{t('record.net')} <Figure value={net} format="money" className="ml-1 text-base font-bold text-money" /></span>
          <Button variant="tertiary" onPress={onClose}>{t('record.cancel')}</Button>
          <SubmitButton variant="secondary" data-intent="again" pending={create.isPending && again}>{t('record.saveAndAdd')}</SubmitButton>
          <SubmitButton data-intent="save" pending={create.isPending && !again}>{t('record.save')}</SubmitButton>
        </div>
      )}>
      <div ref={formRef} onKeyDown={enterToNext} className="grid gap-5 md:grid-cols-[1fr_17rem]">
        <div className="grid content-start gap-4">
          <ComboInput label={t('record.farmer')} required options={options} value={form.farmerId} onChange={set('farmerId')}
            placeholder={t('record.searchFarmers')} error={errs.farmerId} empty={t('record.noFarmers')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <DateInput label={t('record.date')} required value={form.purchaseDate} onChange={set('purchaseDate')} error={errs.purchaseDate} />
            <TextInput label={t('record.truck')} placeholder="AP07CD1234" hint={t('record.truckHint')} inputClassName="font-mono uppercase"
              value={form.truckNumber} onChange={v => set('truckNumber')(v.toUpperCase())} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput label={t('record.weight')} required inputMode="decimal" unit="Qtl" value={form.weightQuintals} onChange={set('weightQuintals')} error={errs.weightQuintals} />
            <TextInput label={t('record.rate')} required inputMode="decimal" unit="₹/Qtl" value={form.pricePerQuintal} onChange={set('pricePerQuintal')} error={errs.pricePerQuintal} />
            {moistureOn && <TextInput label={t('record.moisture')} required inputMode="decimal" unit="%" value={form.moisturePct} onChange={set('moisturePct')} error={errs.moisturePct} />}
          </div>
          <TextAreaInput label={t('record.notes')} value={form.notes} onChange={set('notes')} />
          <ErrorAlert error={apiError} />
        </div>
        <div className="hidden md:block"><div className="sticky top-0">{receipt}</div></div>
        <div className="md:hidden">{receipt}</div>
      </div>
    </Panel>
  )
}

/** Makes "Record purchase" available everywhere: the button in the top bar, the phone tab, and the N key. */
export function RecordPurchaseProvider({ children }) {
  const { user } = useAuth()
  const canRecord = user?.role === 'MILL_ADMIN' || user?.role === 'MILL_OPERATOR'
  const purchasesOn = useFeatures().flag('purchases').enabled
  const enabled = canRecord && purchasesOn
  const [open, setOpen] = useState(false)
  const openSheet = useCallback(() => { if (enabled) setOpen(true) }, [enabled])
  useEffect(() => {
    if (!enabled) return undefined
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      e.preventDefault(); setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
  return (
    <Ctx.Provider value={{ open: openSheet, enabled }}>
      {children}
      {enabled && <RecordPurchaseSheet open={open} onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  )
}
