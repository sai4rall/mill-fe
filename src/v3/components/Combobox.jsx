import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/v3/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/v3/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/v3/ui/popover'
import { cn } from '@/v3/lib/utils'

/** Searchable select. options: [{ value, label }]. */
export default function Combobox({ id, options, value, onChange, placeholder = 'Select…', searchPlaceholder = 'Search…', empty = 'No results.', invalid }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} aria-invalid={invalid || undefined}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground')}>
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{empty}</CommandEmpty>
            <CommandGroup>
              {options.map(o => (
                <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => { onChange(o.value); setOpen(false) }}>
                  <Check className={cn('size-4', o.value === value ? 'opacity-100' : 'opacity-0')} />{o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
