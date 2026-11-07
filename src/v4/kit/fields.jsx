import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import {
  Calendar, ComboBox, DateField, DatePicker, Description, FieldError, Input, Label, ListBox, Select, TextArea, TextField,
} from '@heroui/react'
import { getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { cx } from '../lib/format'

/** Text input with label, hint and error. `onChange` receives the string value. */
export function TextInput({ label, value, onChange, error, hint, required, prefix, suffix, className, inputClassName, ...rest }) {
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
          className="rounded-md p-1 text-muted transition-colors hover:text-foreground">
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

const parse = (iso) => { try { return iso ? parseDate(iso) : null } catch { return null } }

/**
 * Date picker on 'YYYY-MM-DD' strings. Days after today are disabled (calendar and typing) unless `allowFuture`.
 * A typed date outside the allowed range is shown as invalid and reported to the parent as ''.
 */
export function DateInput({ label, value, onChange, min, max, allowFuture = false, error, required, className }) {
  const todayDate = today(getLocalTimeZone())
  const maxValue = [allowFuture ? null : todayDate, parse(max)].filter(Boolean).sort((a, b) => a.compare(b))[0]
  const minValue = parse(min) || undefined
  const [inner, setInner] = useState(() => parse(value))
  const [emitted, setEmitted] = useState(value || '')
  if ((value || '') !== emitted) { setEmitted(value || ''); setInner(parse(value)) }
  const outOfRange = !!inner && ((maxValue && inner.compare(maxValue) > 0) || (minValue && inner.compare(minValue) < 0))
  const message = error || (outOfRange ? (maxValue && inner.compare(maxValue) > 0 ? 'Date cannot be in the future' : 'Date is too early') : '')

  return (
    <DatePicker className={cx('w-full', className)} value={inner} maxValue={maxValue} minValue={minValue} isRequired={required}
      isInvalid={!!message} validationBehavior="aria"
      onChange={(d) => {
        setInner(d)
        const ok = d && !(maxValue && d.compare(maxValue) > 0) && !(minValue && d.compare(minValue) < 0)
        const out = ok ? d.toString() : ''
        setEmitted(out); onChange(out)
      }}>
      {label && <Label>{label}</Label>}
      <DateField.Group fullWidth>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix><DatePicker.Trigger aria-label="Open calendar"><DatePicker.TriggerIndicator /></DatePicker.Trigger></DateField.Suffix>
      </DateField.Group>
      <FieldError>{message}</FieldError>
      <DatePicker.Popover>
        <Calendar aria-label={label || 'Date'} maxValue={maxValue} minValue={minValue}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger><Calendar.YearPickerTriggerHeading /><Calendar.YearPickerTriggerIndicator /></Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid><Calendar.YearPickerGridBody>{({ year }) => <Calendar.YearPickerCell year={year} />}</Calendar.YearPickerGridBody></Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  )
}
