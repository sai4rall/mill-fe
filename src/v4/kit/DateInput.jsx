import { useState } from 'react'
import { Calendar, DateField, DatePicker, FieldError, Label } from '@heroui/react'
import { getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { cx } from '../lib/format'

const parse = (iso) => { try { return iso ? parseDate(iso) : null } catch { return null } }

/**
 * Date picker on 'YYYY-MM-DD' strings. Days after today are disabled (calendar and typing) unless `allowFuture`.
 * A typed date outside the allowed range is shown as invalid and reported to the parent as ''.
 */
export default function DateInput({ label, value, onChange, min, max, allowFuture = false, error, required, className }) {
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
