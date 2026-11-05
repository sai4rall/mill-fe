import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/v3/ui/select'

/** Simple select. options: [{ value, label }] (values must be non-empty strings). */
export default function SelectField({ id, options, value, onChange, placeholder, disabled, className = 'w-full', ...rest }) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className={className} {...rest}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  )
}
