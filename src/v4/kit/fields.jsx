import { lazy, Suspense, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { ComboBox, Description, FieldError, Input, Label, ListBox, Select, TextArea, TextField } from '@heroui/react'
import { cx } from '../lib/format'

/** Text input with label, hint and error. `onChange` receives the string value. */
export function TextInput({ label, value, onChange, error, hint, required, prefix, suffix, unit, className, inputClassName, ...rest }) {
  if (unit && !suffix) suffix = <span className="pointer-events-none pr-1 text-sm text-muted">{unit}</span>
  return (
    <TextField className={cx('w-full', className)} value={value} onChange={onChange} isRequired={required} isInvalid={!!error} validationBehavior="aria">
      {label && <Label>{label}</Label>}
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-sm text-muted">{prefix}</span>}
        <Input className={cx('w-full', prefix && 'pl-11', suffix && 'pr-10', inputClassName)} {...rest} />
        {suffix && <span className="absolute top-1/2 right-2 z-10 -translate-y-1/2">{suffix}</span>}
      </div>
      {hint && !error && <Description>{hint}</Description>}
      <FieldError>{error}</FieldError>
    </TextField>
  )
}

export function PasswordInput({ label, ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <TextInput label={label} type={visible ? 'text' : 'password'} {...props}
      suffix={(
        <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="rounded-field p-1 text-muted transition-colors hover:text-foreground">
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )} />
  )
}

export function TextAreaInput({ label, value, onChange, error, rows = 2, ...rest }) {
  return (
    <TextField className="w-full" value={value} onChange={onChange} isInvalid={!!error} validationBehavior="aria">
      {label && <Label>{label}</Label>}
      <TextArea rows={rows} className="w-full" {...rest} />
      <FieldError>{error}</FieldError>
    </TextField>
  )
}

/** options: [{ value, label }] with string values. */
export function SelectInput({ label, options, value, onChange, placeholder = 'Select…', isDisabled, className }) {
  return (
    <Select className={cx('w-full', className)} placeholder={placeholder} value={value || null} onChange={(v) => onChange(v == null ? '' : String(v))} isDisabled={isDisabled}>
      {label && <Label>{label}</Label>}
      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map(o => <ListBox.Item key={o.value} id={o.value} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>)}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

/** Searchable select. options: [{ value, label }] with string values. */
export function ComboInput({ label, options, value, onChange, placeholder = 'Search…', error, required, empty = 'No results' }) {
  return (
    <ComboBox className="w-full" selectedKey={value || null} onSelectionChange={(k) => onChange(k == null ? '' : String(k))}
      isRequired={required} isInvalid={!!error} validationBehavior="aria" menuTrigger="focus">
      {label && <Label>{label}</Label>}
      <ComboBox.InputGroup><Input placeholder={placeholder} /><ComboBox.Trigger /></ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox renderEmptyState={() => <p className="px-3 py-2 text-sm text-muted">{empty}</p>}>
          {options.map(o => <ListBox.Item key={o.value} id={o.value} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>)}
        </ListBox>
      </ComboBox.Popover>
      <FieldError>{error}</FieldError>
    </ComboBox>
  )
}


// The date picker (React Aria calendar) is the heaviest part of the form kit; load it only when a form needs it.
const LazyDateInput = lazy(() => import('./DateInput'))

/** Placeholder with the same footprint as the picker while it loads. */
function DateFallback({ label }) {
  return (
    <div className="grid w-full gap-1">
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="h-9 w-full animate-pulse rounded-field border border-border bg-surface-secondary" />
    </div>
  )
}

export function DateInput(props) {
  return <Suspense fallback={<DateFallback label={props.label} />}><LazyDateInput {...props} /></Suspense>
}

/**
 * Keyboard flow for forms (design review: data entry): Enter moves to the next field; on the last field it submits.
 * Pickers that are open (aria-expanded) and text areas keep their own Enter behaviour.
 */
export function enterToNext(e) {
  if (e.key !== 'Enter' || e.shiftKey || e.defaultPrevented || e.nativeEvent?.isComposing) return
  const el = e.target
  if (!(el instanceof HTMLInputElement) || el.type === 'submit' || el.getAttribute('aria-expanded') === 'true') return
  const form = el.form || el.closest('form')
  if (!form) return
  const fields = [...form.querySelectorAll('input:not([type=hidden]):not([type=file]):not([disabled]), textarea:not([disabled])')]
    .filter(f => f.offsetParent !== null || f === el)
  const i = fields.indexOf(el)
  e.preventDefault()
  const next = fields[i + 1]
  if (next && next.tagName === 'INPUT') next.focus()
  else form.requestSubmit()
}
